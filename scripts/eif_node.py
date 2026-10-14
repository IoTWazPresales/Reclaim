#!/usr/bin/env python3
"""EIF ledger wrapper for Reclaim (PRG-20260917T222550).

Thin, cross-platform front end over the public ``program.py`` CLI. It exists so
agents never hand-write JSON payloads, never fight shell quoting on Windows, and
never need to read EIF runtime internals.

Usage (from repo root, any shell)::

    python scripts/eif_node.py status [--node N-0016]
    python scripts/eif_node.py add --id N-0044 --title "..." --class feature --risk R2 \
        --depends-on N-0001,N-0006 --acceptance criteria.txt [--touches-existing]
    python scripts/eif_node.py lease N-0016
    python scripts/eif_node.py evidence N-0016 --commit abc1234 --path app/... --note "..."
    python scripts/eif_node.py complete N-0016 --commit abc1234
    python scripts/eif_node.py await-approval N-0016 --renders .eif/audit/N-0016
    python scripts/eif_node.py human-check N-0037 --steps steps.md
    python scripts/eif_node.py help event
    python scripts/eif_node.py inspect health
    python scripts/eif_node.py release N-0044
    python scripts/eif_node.py event node.stage_note N-0044 --payload-file note.json --note "gate blocker"

Global flags (before the subcommand): ``--dry-run`` prints the intended
program.py calls and payloads without executing or writing anything;
``--run RUN`` overrides the ledger run id (default ``EIF_RUN`` env or ``R<YYYYMMDD>``).

Rules implemented here:
- every successful mutation appends one line to ``docs/eif/PROGRESS.md``;
- on any program.py failure the intended mutation is appended to
  ``docs/eif/LEDGER_PENDING.md`` and the process exits non-zero;
- ``expected_revision`` is always read from ``status --node`` immediately before
  each mutation, so callers never track revisions by hand.
"""

from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
PROGRAM = ROOT / ".eif" / "runtime" / "programme" / "program.py"
LOG = ROOT / ".eif" / "program" / "PROGRAM_LOG.ndjson"
PROGRESS = ROOT / "docs" / "eif" / "PROGRESS.md"
PENDING = ROOT / "docs" / "eif" / "LEDGER_PENDING.md"
AWAITING = ROOT / "docs" / "eif" / "AWAITING_APPROVAL.md"
HUMAN_CHECKS = ROOT / "docs" / "eif" / "HUMAN_CHECKS.md"

PROGRESS_LOG_HEADING = "## Ledger mutation log (scripts/eif_node.py)"
ACTOR = "gov-001"
CONTROLS = ROOT / "docs" / "eif" / "phase2-controls"
RECOVERY_NODES = frozenset(f"N-{number:04d}" for number in range(68, 72))
WORKING_BRANCH = "fix/training-confident-ux"


class WrapperError(RuntimeError):
    """Raised when program.py rejects a call or the environment is unusable."""


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _default_run() -> str:
    return os.environ.get("EIF_RUN") or "R" + _dt.datetime.now().strftime("%Y%m%d")


def _append(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    sep = "" if (not existing or existing.endswith("\n")) else "\n"
    path.write_text(existing + sep + text, encoding="utf-8")


class Ledger:
    def __init__(self, run: str, dry_run: bool) -> None:
        self.run = run
        self.dry_run = dry_run
        if not PROGRAM.exists():
            raise WrapperError(
                f"program.py not found at {PROGRAM}. The EIF runtime is not installed in this "
                "checkout; install it from the framework before mutating the ledger."
            )

    # ----- low level ---------------------------------------------------------------

    def _base(self) -> list[str]:
        return [
            sys.executable,
            "-B",
            str(PROGRAM),
            "--project",
            str(ROOT),
            "--run",
            self.run,
            "--actor",
            ACTOR,
        ]

    def _exec(self, args: list[str]) -> str:
        proc = subprocess.run(
            [*self._base(), *args],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        out = (proc.stdout or "") + (proc.stderr or "")
        if proc.returncode != 0:
            raise WrapperError(f"program.py {' '.join(args)} failed ({proc.returncode}):\n{out.strip()}")
        return out

    def status(self, node: str | None = None) -> str:
        args = ["status"] + (["--node", node] if node else [])
        return self._exec(args)

    def node(self, node_id: str) -> dict[str, Any]:
        out = self.status(node_id)
        start = out.find("\n{")
        if start < 0:
            raise WrapperError(f"status --node {node_id} returned no JSON:\n{out.strip()}")
        return json.loads(out[start + 1 :])

    def event(self, event_type: str, payload: dict[str, Any], summary: str) -> None:
        if self.dry_run:
            print(f"DRY-RUN {event_type} {json.dumps(payload, ensure_ascii=False)}")
            return
        tmp = tempfile.NamedTemporaryFile(
            "w", suffix=".json", prefix="eif-", delete=False, encoding="utf-8"
        )
        try:
            json.dump(payload, tmp, ensure_ascii=False, indent=2)
            tmp.write("\n")
            tmp.close()
            try:
                self._exec(["event", event_type, "--payload-file", tmp.name])
            except WrapperError as exc:
                self._record_pending(event_type, payload, str(exc))
                raise
        finally:
            try:
                os.unlink(tmp.name)
            except OSError as exc:
                print(f"eif_node: could not remove temporary payload: {exc}", file=sys.stderr)
        self._record_progress(f"{event_type} {summary}")

    def add_node(self, cli_args: list[str], summary: str) -> None:
        if self.dry_run:
            print(f"DRY-RUN add-node {' '.join(cli_args)}")
            return
        try:
            self._exec(["add-node", *cli_args])
        except WrapperError as exc:
            self._record_pending("add-node", {"args": cli_args}, str(exc))
            raise
        self._record_progress(f"node.add {summary}")

    # ----- durable side files -------------------------------------------------------

    def _record_progress(self, line: str) -> None:
        if not PROGRESS.exists():
            raise WrapperError(f"{PROGRESS} missing; refuse to mutate without a progress file")
        text = PROGRESS.read_text(encoding="utf-8")
        if PROGRESS_LOG_HEADING not in text:
            _append(PROGRESS, f"\n{PROGRESS_LOG_HEADING}\n\n")
        _append(PROGRESS, f"- `{_now()}` run `{self.run}` — {line}\n")

    def _record_pending(self, event_type: str, payload: dict[str, Any], error: str) -> None:
        block = (
            f"\n## {_now()} — {event_type} (run `{self.run}`)\n\n"
            "Intended mutation that program.py rejected. Replay with the wrapper once fixed.\n\n"
            "```json\n"
            f"{json.dumps({'event': event_type, 'payload': payload}, ensure_ascii=False, indent=2)}\n"
            "```\n\n"
            "Error:\n\n```\n" + error.strip() + "\n```\n"
        )
        if not PENDING.exists():
            _append(PENDING, "# Ledger pending mutations\n\nAppended by `scripts/eif_node.py` on failure.\n")
        _append(PENDING, block)


# ----- helpers ------------------------------------------------------------------------


def _next_evidence_id() -> str:
    ids: list[int] = []
    if LOG.exists():
        for line in LOG.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if entry.get("event") != "evidence.add":
                continue
            match = re.fullmatch(r"EV-(\d+)", str(entry.get("payload", {}).get("id", "")))
            if match:
                ids.append(int(match.group(1)))
    return f"EV-{(max(ids) + 1 if ids else 1):04d}"


def _read_lines(path: Path) -> list[str]:
    if not path.exists():
        raise WrapperError(f"file not found: {path}")
    return [ln.strip() for ln in path.read_text(encoding="utf-8").splitlines() if ln.strip()]


def _ensure_section(path: Path, node_id: str, title: str, body: str) -> bool:
    """Append a `## <node_id> …` section unless one already exists. Returns True if written."""
    existing = path.read_text(encoding="utf-8") if path.exists() else ""
    if re.search(rf"^##\s+{re.escape(node_id)}\b", existing, flags=re.MULTILINE):
        return False
    _append(path, f"\n## {node_id} {title}\n\n{body.rstrip()}\n")
    return True


# ----- subcommands ------------------------------------------------------------------------


def _json_file(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise WrapperError(f"cannot read control document {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise WrapperError(f"control document must be an object: {path}")
    return value


def _git(*args: str) -> bytes:
    result = subprocess.run(["git", *args], cwd=ROOT, capture_output=True)
    if result.returncode:
        raise WrapperError(f"git {args[0]} failed; verify repository, origin and branch availability")
    return result.stdout


def _digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _criteria_digest(criteria: list[str]) -> str:
    return _digest(json.dumps(criteria, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def _repo_path(raw: str) -> tuple[Path, str]:
    if not isinstance(raw, str) or not raw.strip():
        raise WrapperError("artifact path must be a nonempty repository-relative path")
    relative = Path(raw)
    if relative.is_absolute() or ".." in relative.parts or ":" in raw:
        raise WrapperError("artifact path must stay inside the repository")
    path = (ROOT / relative).resolve()
    try:
        rel = path.relative_to(ROOT.resolve()).as_posix()
    except ValueError as exc:
        raise WrapperError("artifact resolves outside the repository") from exc
    if rel.startswith((".git/", ".eif/runtime/")) or any(part.startswith(".env") for part in Path(rel).parts):
        raise WrapperError("protected or secret artifact path is not allowed")
    return path, rel


def _artifact(ref: dict[str, Any], commit: str) -> dict[str, str]:
    if not isinstance(ref, dict) or not re.fullmatch(r"[0-9a-f]{64}", str(ref.get("sha256", ""))):
        raise WrapperError("artifact requires path and lowercase SHA-256")
    path, rel = _repo_path(ref.get("path"))
    try:
        data = path.read_bytes()
    except OSError as exc:
        raise WrapperError(f"artifact unavailable: {rel}") from exc
    if not data or _digest(data) != ref["sha256"]:
        raise WrapperError(f"empty or changed artifact: {rel}")
    if _git("show", f"{commit}:{rel}") != data:
        raise WrapperError(f"artifact does not match committed bytes: {rel}")
    return {"path": rel, "sha256": ref["sha256"]}


def _pushed_head(reviewed: str) -> tuple[str, str]:
    if not re.fullmatch(r"[0-9a-f]{7,40}", reviewed or ""):
        raise WrapperError("commit must be a hexadecimal Git commit ID")
    if _git("branch", "--show-current").decode().strip() != WORKING_BRANCH:
        raise WrapperError(f"recovery controls require branch {WORKING_BRANCH}")
    reviewed_sha = _git("rev-parse", "--verify", f"{reviewed}^{{commit}}").decode().strip()
    head = _git("rev-parse", "HEAD").decode().strip()
    remote = _git("ls-remote", "--exit-code", "origin", f"refs/heads/{WORKING_BRANCH}").decode().split()
    if len(remote) != 2 or remote[1] != f"refs/heads/{WORKING_BRANCH}":
        raise WrapperError("origin branch has no unambiguous pushed commit")
    # A stale remote-tracking branch alone is not push evidence. ls-remote is read-only.
    _git("merge-base", "--is-ancestor", head, remote[0])
    _git("merge-base", "--is-ancestor", reviewed_sha, head)
    return reviewed_sha, head


def _control(node_id: str) -> dict[str, Any] | None:
    registry_path = CONTROLS / "registry.json"
    if not registry_path.exists() and node_id not in RECOVERY_NODES:
        return None
    registry = _json_file(registry_path)
    if registry.get("version") != 1 or not isinstance(registry.get("nodes"), dict):
        raise WrapperError("unsupported recovery registry")
    control = registry["nodes"].get(node_id)
    if node_id in RECOVERY_NODES and not isinstance(control, dict):
        raise WrapperError(f"recovery controls missing for {node_id}")
    if control is not None:
        if (not isinstance(control, dict)
                or set(control) != {"acceptance_file", "source_paths", "required_journeys", "visible_change"}
                or not isinstance(control["visible_change"], bool)
                or not isinstance(control["required_journeys"], list)
                or not all(isinstance(j, str) and j for j in control["required_journeys"])):
            raise WrapperError("registry must use the documented exact routing and approval fields")
    return control


def _expected_criteria(node: dict[str, Any], control: dict[str, Any]) -> list[str]:
    path, _ = _repo_path(control.get("acceptance_file"))
    expected = _read_lines(path)
    if not expected or node.get("acceptance_criteria") != expected:
        raise WrapperError("ledger acceptance criteria differ from the accepted recovery criteria file")
    return expected


def _approval(receipt_path: str, node_id: str, criteria: list[str], commit: str, *, kind: str,
              committed: bool = True) -> dict[str, str]:
    path, rel = _repo_path(receipt_path)
    receipt = _json_file(path)
    if (receipt.get("version") != 1 or receipt.get("node") != node_id
            or receipt.get("kind") != kind or receipt.get("approved") is not True
            or receipt.get("criteria_sha256") != _criteria_digest(criteria)
            or receipt.get("approver_role") != "operator"
            or not receipt.get("approver") or not receipt.get("statement")):
        raise WrapperError("approval receipt must identify explicit operator approval, node, scope and criteria digest")
    if kind != "scope-acceptance" and receipt.get("reviewed_commit") != commit:
        raise WrapperError("approval receipt is for another reviewed commit")
    ref = {"path": rel, "sha256": _digest(path.read_bytes())}
    return _artifact(ref, _git("rev-parse", "HEAD").decode().strip()) if committed else ref


def _bound_approval(ref: dict[str, Any], head: str, node_id: str, criteria: list[str], reviewed: str, kind: str) -> None:
    checked = _artifact(ref, head)
    _approval(checked["path"], node_id, criteria, reviewed, kind=kind)


def _outcome(record: dict[str, Any], head: str, node_id: str, criteria: list[str], reviewed: str) -> str:
    state = record.get("outcome")
    if state == "satisfied":
        refs = record.get("evidence")
        if not isinstance(refs, list) or not refs:
            raise WrapperError("satisfied outcome requires nonempty hashed evidence")
        for ref in refs:
            _artifact(ref, head)
    elif state == "waived":
        waiver = record.get("waiver") or {}
        if not waiver.get("reason") or not waiver.get("residual_limitation"):
            raise WrapperError("waiver requires reason and residual limitation")
        receipt = _artifact(waiver.get("receipt"), head)
        _bound_approval(receipt, head, node_id, criteria, reviewed, "waiver")
        data = _json_file(ROOT / receipt["path"])
        waived_ids = data.get("waived_ids")
        if (not isinstance(waived_ids, list) or not waived_ids
                or not all(isinstance(item, str) and item for item in waived_ids)
                or len(waived_ids) != len(set(waived_ids))):
            raise WrapperError("waiver IDs must be a nonempty list of distinct exact IDs")
        if record.get("id") not in waived_ids:
            raise WrapperError("operator waiver does not cover this criterion or journey")
    else:
        raise WrapperError(f"unverified outcome cannot complete: {record.get('id')}")
    return state


def _completion(node_id: str, node: dict[str, Any], commit: str, packet_path: str | None) -> dict[str, Any]:
    control = _control(node_id)
    if control is None:
        raise WrapperError("check-completion applies to registered recovery nodes")
    criteria = _expected_criteria(node, control)
    if node.get("acceptance_state") != "accepted":
        raise WrapperError("scope acceptance pending; use accept --receipt after explicit operator approval")
    reviewed, head = _pushed_head(commit)
    path, rel = _repo_path(packet_path or f"docs/eif/phase2-controls/{node_id}.json")
    packet = _json_file(path)
    _artifact({"path": rel, "sha256": _digest(path.read_bytes())}, head)
    for bound in [CONTROLS / "registry.json", ROOT / control["acceptance_file"]]:
        _artifact({"path": bound.relative_to(ROOT).as_posix(), "sha256": _digest(bound.read_bytes())}, reviewed)
    if (packet.get("version") != 1 or packet.get("node") != node_id
            or packet.get("reviewed_commit") != reviewed
            or packet.get("criteria_sha256") != _criteria_digest(criteria)):
        raise WrapperError("completion packet node, reviewed commit or criteria digest is stale")
    scope = control.get("source_paths")
    if not isinstance(scope, list) or not scope:
        raise WrapperError("registry must declare reviewed source paths")
    safe_scope = [_repo_path(p)[1] for p in scope]
    if _git("diff", "--name-only", reviewed, head, "--", *safe_scope).strip():
        raise WrapperError("reviewed source changed after the implementation commit")
    if _git("diff", "--name-only", head, "--", *safe_scope).strip():
        raise WrapperError("reviewed source has uncommitted changes")
    if _git("ls-files", "--others", "--exclude-standard", "--", *safe_scope).strip():
        raise WrapperError("reviewed source has untracked files")
    reviewer = packet.get("reviewer") or {}
    if (not packet.get("executor_session") or not reviewer.get("session")
            or reviewer.get("session") == packet["executor_session"]
            or not reviewer.get("model") or reviewer.get("result") != "verified"
            or reviewer.get("reviewed_commit") != reviewed):
        raise WrapperError("completion requires a separate reviewer session bound to the reviewed commit")
    review_ref = _artifact(reviewer.get("artifact"), head)
    review_receipt = _json_file(ROOT / review_ref["path"])
    outcomes_digest = _digest(json.dumps({"criteria": packet.get("criteria"), "journeys": packet.get("journeys", [])},
                                         ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8"))
    if (review_receipt.get("version") != 1 or review_receipt.get("node") != node_id
            or review_receipt.get("reviewed_commit") != reviewed
            or review_receipt.get("criteria_sha256") != _criteria_digest(criteria)
            or review_receipt.get("outcomes_sha256") != outcomes_digest
            or review_receipt.get("reviewer_session") != reviewer["session"]
            or review_receipt.get("reviewer_model") != reviewer["model"]
            or review_receipt.get("executor_session") != packet["executor_session"]
            or review_receipt.get("result") != "verified"):
        raise WrapperError("reviewer receipt does not bind the node, executor, criteria and exact outcomes")
    report_ref = _artifact(review_receipt.get("report"), head)
    circular_paths = {rel, review_ref["path"], report_ref["path"]}
    expected_ids = [f"C{i}" for i in range(1, len(criteria) + 1)]
    rows = packet.get("criteria")
    if (not isinstance(rows, list) or len(rows) != len(criteria) or not all(isinstance(r, dict) for r in rows)
            or [r.get("id") for r in rows] != expected_ids):
        raise WrapperError("completion must account for every criterion once in order")
    dispositions = {}
    for text, row in zip(criteria, rows):
        if row.get("criterion") != text:
            raise WrapperError("criterion text does not match accepted scope")
        for ref in row.get("evidence", []) or []:
            if isinstance(ref, dict) and _repo_path(ref.get("path"))[1] in circular_paths:
                raise WrapperError("circular evidence cannot use the packet or reviewer artifacts")
        dispositions[row["id"]] = _outcome(row, head, node_id, criteria, reviewed)
    journeys = packet.get("journeys", [])
    required = control.get("required_journeys", [])
    if (not isinstance(journeys, list) or not isinstance(required, list)
            or not all(isinstance(r, dict) for r in journeys)
            or len(required) != len(set(required))
            or sorted(r.get("id", "") for r in journeys) != sorted(required)):
        raise WrapperError("completion must account for exactly the mapped applicable journeys")
    for row in journeys:
        for ref in row.get("evidence", []) or []:
            if isinstance(ref, dict) and _repo_path(ref.get("path"))[1] in circular_paths:
                raise WrapperError("circular evidence cannot use the packet or reviewer artifacts")
        dispositions[row["id"]] = _outcome(row, head, node_id, criteria, reviewed)
    if control.get("visible_change") is True:
        _bound_approval(packet.get("operator_approval"), head, node_id, criteria, reviewed, "visible-acceptance")
    return {"node": node_id, "reviewed_commit": reviewed, "packet_commit": head,
            "packet": rel, "packet_sha256": _digest(path.read_bytes()), "outcomes": dispositions}


def cmd_check_completion(ledger: Ledger, args: argparse.Namespace) -> int:
    print(json.dumps(_completion(args.node, ledger.node(args.node), args.commit, args.packet), indent=2))
    return 0


def cmd_accept(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    control = _control(args.node)
    criteria = _expected_criteria(node, control) if control else node.get("acceptance_criteria", [])
    head = _git("rev-parse", "HEAD").decode().strip()
    ref = _approval(args.receipt, args.node, criteria, head, kind="scope-acceptance")
    ledger.event("node.accept", {"node": args.node, "expected_revision": node["revision"]},
                 f"{args.node} explicit scope acceptance receipt={ref['path']} sha256={ref['sha256']}")
    return 0


def cmd_sync_criteria(ledger: Ledger, args: argparse.Namespace) -> int:
    """Repair public-CLI delimiter loss; never redefine an accepted rule implicitly."""
    control = _control(args.node)
    if control is None:
        raise WrapperError("sync-criteria requires registered recovery scope")
    path, _ = _repo_path(control.get("acceptance_file"))
    criteria = _read_lines(path)
    head = _git("rev-parse", "HEAD").decode().strip()
    receipt = _approval(args.receipt, args.node, criteria, head, kind="scope-acceptance", committed=False)
    node = ledger.node(args.node)
    ledger.event("node.patch", {"node": args.node, "expected_revision": node["revision"],
                               "acceptance_criteria": criteria},
                 f"{args.node} exact accepted criteria restored; criteria_sha256={_criteria_digest(criteria)}; "
                 f"receipt={receipt['path']} sha256={receipt['sha256']} (working artifact; completion requires committed evidence)")
    return 0


def cmd_status(ledger: Ledger, args: argparse.Namespace) -> int:
    print(ledger.status(args.node).rstrip())
    return 0


def cmd_help(ledger: Ledger, args: argparse.Namespace) -> int:
    """Expose public CLI documentation without opening runtime implementation."""
    print(ledger._exec([*args.command, "--help"]).rstrip())
    return 0


def cmd_inspect(ledger: Ledger, args: argparse.Namespace) -> int:
    print(ledger._exec([args.report, *args.options]).rstrip())
    return 0


def cmd_event(ledger: Ledger, args: argparse.Namespace) -> int:
    """Forward an explicit public node event; runtime remains the gate authority."""
    if not args.event_type.startswith("node."):
        raise WrapperError("event requires a public node.* event")
    try:
        payload = json.loads(Path(args.payload_file).read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError) as exc:
        raise WrapperError(f"cannot read JSON payload {args.payload_file}: {exc}") from exc
    if not isinstance(payload, dict):
        raise WrapperError("event payload must be a JSON object")
    if "node" in payload or "expected_revision" in payload:
        raise WrapperError("omit node and expected_revision; the wrapper supplies them")
    if args.event_type == "node.accept":
        raise WrapperError("use accept --receipt; a generic event cannot establish operator approval")
    if args.event_type == "node.status" and payload.get("to") == "complete":
        raise WrapperError("use complete; generic events cannot bypass completion controls")
    if _control(args.node) and args.event_type == "node.patch" and any(
            key in payload for key in ("acceptance", "acceptance_state", "acceptance_criteria", "status", "verification")):
        raise WrapperError("recovery acceptance changes require an explicitly reviewed control revision")
    node = ledger.node(args.node)
    ledger.event(
        args.event_type,
        {**payload, "node": args.node, "expected_revision": node["revision"]},
        f"{args.node}: {args.note}",
    )
    return 0


def cmd_release(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    if not node.get("lease"):
        print(f"{args.node} is not leased")
        return 0
    ledger.event(
        "node.lease.release",
        {"node": args.node, "expected_revision": node["revision"]},
        f"{args.node} lease released",
    )
    return 0


def cmd_add(ledger: Ledger, args: argparse.Namespace) -> int:
    criteria = _read_lines(Path(args.acceptance)) if args.acceptance else []
    cli = [
        "--id", args.id,
        "--title", args.title,
        "--class", args.klass,
        "--risk", args.risk,
    ]
    if args.depends_on:
        cli += ["--depends-on", args.depends_on]
    if args.touches_existing:
        cli.append("--touches-existing")
    ledger.add_node(cli, f"{args.id} “{args.title}” class={args.klass} risk={args.risk}")
    if criteria:
        # The public add-node text delimiter cannot represent arbitrary prose.
        # A JSON array preserves commas, semicolons and criterion boundaries.
        node = {"revision": 0} if ledger.dry_run else ledger.node(args.id)
        ledger.event("node.patch", {"node": args.id, "expected_revision": node["revision"],
                                   "acceptance_criteria": criteria},
                     f"{args.id} exact acceptance criteria from {args.acceptance}")
    return 0


def cmd_lease(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    if node.get("lease"):
        print(f"{args.node} already leased: {json.dumps(node['lease'])}")
        return 0
    ledger.event(
        "node.lease.acquire",
        {"node": args.node, "expected_revision": node["revision"]},
        f"{args.node} lease acquired",
    )
    return 0


def cmd_evidence(ledger: Ledger, args: argparse.Namespace) -> int:
    ledger.node(args.node)  # existence check
    note = args.note
    if _control(args.node):
        reviewed, head = _pushed_head(args.commit)
        path, rel = _repo_path(args.path)
        try:
            ref = {"path": rel, "sha256": _digest(path.read_bytes())}
        except OSError as exc:
            raise WrapperError(f"evidence unavailable: {rel}") from exc
        _artifact(ref, head)
        note += f"; evidence_sha256={ref['sha256']}; artifact_commit={head}; reviewed_commit={reviewed}"
    ev_id = _next_evidence_id()
    payload = {
        "id": ev_id,
        "provenance": "implementation-observation",
        "path": args.path,
        "tree_hash": args.commit,
        "note": f"{args.node}: {note}",
    }
    ledger.event("evidence.add", payload, f"{ev_id} for {args.node} @ {args.commit} ({args.path})")
    print(ev_id)
    return 0


def cmd_complete(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    if node.get("acceptance_state") == "pending":
        raise WrapperError("scope acceptance pending; use accept --receipt after explicit operator approval")
    proof = None
    if _control(args.node):
        proof = _completion(args.node, node, args.commit, getattr(args, "packet", None))
        ledger.event("node.stage_note", {
            "node": args.node, "expected_revision": node["revision"],
            "note": "RECOVERY_COMPLETION_PROOF " + json.dumps(proof, sort_keys=True),
        }, f"{args.node} criterion-level completion proof {proof['packet_sha256']}")
        node = ledger.node(args.node) if not ledger.dry_run else {**node, "revision": node["revision"] + 1}
    ledger.event(
        "node.status",
        {"node": args.node, "expected_revision": node["revision"], "to": "complete"},
        f"{args.node} complete @ {args.commit}" + (f" outcomes={proof['outcomes']}" if proof else " (historical controls)"),
    )
    return 0


def cmd_await_approval(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    renders, renders_rel = _repo_path(args.renders)
    images = []
    if renders.is_dir():
        for candidate in sorted(renders.iterdir()):
            if candidate.suffix.lower() in {".png", ".jpg", ".jpeg"} and candidate.is_file() and not candidate.is_symlink():
                data = candidate.read_bytes()
                if data.startswith(b"\x89PNG\r\n\x1a\n") or data.startswith(b"\xff\xd8\xff"):
                    images.append({"path": candidate.relative_to(ROOT).as_posix(), "sha256": _digest(data)})
    renders_note = (f"{renders_rel}; image artifacts={json.dumps(images)}; authenticity and visual quality UNVERIFIED"
                    if images else f"{renders_rel} (UNABLE_TO_VERIFY — no PNG/JPEG image artifacts)")
    ledger.event(
        "node.stage_note",
        {
            "node": args.node,
            "expected_revision": node["revision"],
            "note": f"AWAITING_APPROVAL — queue note, not approval or rendered verification; renders={renders_note}. Do not complete until operator approves.",
        },
        f"{args.node} AWAITING_APPROVAL renders={renders_note}",
    )
    if node.get("lease") and not ledger.dry_run:
        node = ledger.node(args.node)
        ledger.event(
            "node.lease.release",
            {"node": args.node, "expected_revision": node["revision"]},
            f"{args.node} lease released",
        )
    if not ledger.dry_run:
        written = _ensure_section(
            AWAITING,
            args.node,
            node.get("title", ""),
            f"**Status:** pending operator review; this queue note grants no approval.\n\n**Renders:** `{renders_note}`\n\n**Approve?** {args.node}",
        )
        if written:
            print(f"added {args.node} section to {AWAITING.relative_to(ROOT)}")
    return 0


def cmd_human_check(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    steps_path = Path(args.steps)
    steps = steps_path.read_text(encoding="utf-8") if steps_path.exists() else None
    if steps is None:
        raise WrapperError(f"steps file not found: {steps_path}")
    ledger.event(
        "node.stage_note",
        {
            "node": args.node,
            "expected_revision": node["revision"],
            "note": f"HUMAN_CHECK — device/console/live-DB step recorded in docs/eif/HUMAN_CHECKS.md ({steps_path.name}).",
        },
        f"{args.node} HUMAN_CHECK steps={steps_path.name}",
    )
    if not ledger.dry_run:
        written = _ensure_section(HUMAN_CHECKS, args.node, node.get("title", ""), steps)
        print(
            f"{'added' if written else 'kept existing'} {args.node} section in {HUMAN_CHECKS.relative_to(ROOT)}"
        )
    return 0


# ----- CLI ------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="eif_node.py", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--dry-run", action="store_true", help="print intended program.py calls; write nothing")
    p.add_argument("--run", default=_default_run(), help="ledger run id (default: $EIF_RUN or R<YYYYMMDD>)")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("status", help="programme or node status")
    s.add_argument("--node")
    s.set_defaults(fn=cmd_status)

    h = sub.add_parser("help", help="read public programme CLI help without runtime source access")
    h.add_argument("command", nargs="*", help="public subcommand path")
    h.set_defaults(fn=cmd_help)

    i = sub.add_parser("inspect", help="read public programme diagnostics")
    i.add_argument("report", choices=["health", "account", "verify", "task-check"])
    i.add_argument("options", nargs=argparse.REMAINDER)
    i.set_defaults(fn=cmd_inspect)

    e = sub.add_parser("event", help="record an explicit public node event with current revision")
    e.add_argument("event_type")
    e.add_argument("node")
    e.add_argument("--payload-file", required=True)
    e.add_argument("--note", required=True)
    e.set_defaults(fn=cmd_event)

    r = sub.add_parser("release", help="release a node lease without changing its status")
    r.add_argument("node")
    r.set_defaults(fn=cmd_release)

    a = sub.add_parser("add", help="charter a new node")
    a.add_argument("--id", required=True)
    a.add_argument("--title", required=True)
    a.add_argument("--class", dest="klass", required=True)
    a.add_argument("--risk", required=True)
    a.add_argument("--depends-on", default="")
    a.add_argument("--acceptance", help="text file; one mechanical acceptance criterion per line")
    a.add_argument("--touches-existing", action="store_true")
    a.set_defaults(fn=cmd_add)

    l = sub.add_parser("lease", help="acquire the node lease")
    l.add_argument("node")
    l.set_defaults(fn=cmd_lease)

    e = sub.add_parser("evidence", help="attach implementation evidence")
    e.add_argument("node")
    e.add_argument("--commit", required=True)
    e.add_argument("--path", required=True)
    e.add_argument("--note", required=True)
    e.set_defaults(fn=cmd_evidence)

    a = sub.add_parser("accept", help="record explicit operator scope acceptance from a committed receipt")
    a.add_argument("node")
    a.add_argument("--receipt", required=True)
    a.set_defaults(fn=cmd_accept)

    a = sub.add_parser("sync-criteria", help="restore exact registered criteria after explicit scope acceptance")
    a.add_argument("node")
    a.add_argument("--receipt", required=True)
    a.set_defaults(fn=cmd_sync_criteria)

    c = sub.add_parser("complete", help="complete already accepted work; recovery nodes require verified criterion evidence")
    c.add_argument("node")
    c.add_argument("--commit", required=True)
    c.add_argument("--packet", help="committed recovery completion packet JSON")
    c.set_defaults(fn=cmd_complete)

    c = sub.add_parser("check-completion", help="read-only validation of recovery criteria, reviewer, artifacts and pushed commits")
    c.add_argument("node")
    c.add_argument("--commit", required=True)
    c.add_argument("--packet")
    c.set_defaults(fn=cmd_check_completion)

    w = sub.add_parser("await-approval", help="park a visible change for operator approval")
    w.add_argument("node")
    w.add_argument("--renders", required=True, help="directory of AVD renders, e.g. .eif/audit/N-0016")
    w.set_defaults(fn=cmd_await_approval)

    h = sub.add_parser("human-check", help="record device-only steps in HUMAN_CHECKS.md")
    h.add_argument("node")
    h.add_argument("--steps", required=True, help="markdown file with the steps")
    h.set_defaults(fn=cmd_human_check)
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        ledger = Ledger(run=args.run, dry_run=args.dry_run)
        return args.fn(ledger, args)
    except WrapperError as exc:
        print(f"eif_node: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
