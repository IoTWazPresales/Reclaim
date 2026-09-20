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
            except OSError:
                pass
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
    if criteria:
        cli += ["--criteria", ",".join(criteria)]
    if args.touches_existing:
        cli.append("--touches-existing")
    ledger.add_node(cli, f"{args.id} “{args.title}” class={args.klass} risk={args.risk}")
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
    ev_id = _next_evidence_id()
    payload = {
        "id": ev_id,
        "provenance": "implementation-observation",
        "path": args.path,
        "tree_hash": args.commit,
        "note": f"{args.node}: {args.note}",
    }
    ledger.event("evidence.add", payload, f"{ev_id} for {args.node} @ {args.commit} ({args.path})")
    print(ev_id)
    return 0


def cmd_complete(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    if node.get("acceptance_state") == "pending":
        ledger.event(
            "node.accept",
            {"node": args.node, "expected_revision": node["revision"]},
            f"{args.node} accepted",
        )
        node = ledger.node(args.node) if not ledger.dry_run else {**node, "revision": node["revision"] + 1}
    ledger.event(
        "node.status",
        {"node": args.node, "expected_revision": node["revision"], "to": "complete"},
        f"{args.node} complete @ {args.commit}",
    )
    return 0


def cmd_await_approval(ledger: Ledger, args: argparse.Namespace) -> int:
    node = ledger.node(args.node)
    renders = Path(args.renders)
    has_renders = renders.is_dir() and any(renders.iterdir())
    renders_note = str(renders) if has_renders else f"{renders} (UNABLE_TO_VERIFY — renders missing)"
    ledger.event(
        "node.stage_note",
        {
            "node": args.node,
            "expected_revision": node["revision"],
            "note": f"AWAITING_APPROVAL — visible change; renders={renders_note}. Do not complete until operator approves.",
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
            f"**What changed:** _fill in_\n\n**Renders:** `{renders_note}`\n\n**Approve?** {args.node}",
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

    c = sub.add_parser("complete", help="accept (if pending) and mark complete")
    c.add_argument("node")
    c.add_argument("--commit", required=True)
    c.set_defaults(fn=cmd_complete)

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
