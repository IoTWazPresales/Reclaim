"""Complete N-0036, N-0037, N-0038; evidence N-0007 without shipping UI."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PY = [sys.executable, "-B", str(ROOT / ".eif/runtime/programme/program.py")]
RUN = "R20260920C"
PAYLOADS = ROOT / "docs/eif/payloads"


def run(args: list[str]) -> None:
    cmd = [*PY, "--project", str(ROOT), "--run", RUN, *args]
    print("+", " ".join(args))
    subprocess.check_call(cmd, cwd=str(ROOT))


def write_json(name: str, payload: dict) -> Path:
    path = PAYLOADS / name
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return path


def complete(nid: str, evidence_id: str, path: str, note: str) -> None:
    lease = write_json(f"c-lease-{nid.lower()}.json", {"node": nid, "expected_revision": 0})
    run(["event", "node.lease.acquire", "--payload-file", str(lease)])
    ev = write_json(
        f"c-ev-{nid.lower()}.json",
        {"id": evidence_id, "provenance": "implementation-observation", "path": path, "note": note},
    )
    run(["event", "evidence.add", "--payload-file", str(ev)])
    acc = write_json(f"c-accept-{nid.lower()}.json", {"node": nid, "expected_revision": 1})
    run(["event", "node.accept", "--payload-file", str(acc)])
    done = write_json(
        f"c-complete-{nid.lower()}.json",
        {"node": nid, "expected_revision": 2, "to": "complete"},
    )
    run(["event", "node.status", "--payload-file", str(done)])


def main() -> None:
    complete(
        "N-0036",
        "EV-0011",
        "app/src/lib/health/__tests__/healthConnectPermissionUse.test.ts",
        "N-0036: declared plugin reads = HEALTH_CONNECT_DEFAULT_METRICS records = readRecords() in product source. Writes = ExerciseSession insert. Location family currently none on all three sides. typecheck 0; 131 files / 801 tests; dual-path 27/27 Git bash. Steps and ActiveCalories already used (R0/R3 keep them).",
    )
    complete(
        "N-0037",
        "EV-0012",
        "app/supabase/functions/delete-account/index.ts",
        "N-0037: Edge Function delete-account service-role wipes user-keyed tables including training_events, optional run_sessions/run_routes, then auth.admin.deleteUser. Client invokes it; missing-function fallback is RLS-allowed tables only. verify-account-deletion.ts for live zero-row check. Live DB wipe UNABLE_TO_VERIFY this pass — HUMAN_CHECKS.md.",
    )
    complete(
        "N-0038",
        "EV-0013",
        "app/src/lib/__tests__/designLabDevOnly.test.ts",
        "N-0038: Design Lab route/entry/Auth button remain __DEV__. Navigators load via loadDesignLabScreen (__DEV__ require). Static vitest proves no production import, no deep link. typecheck 0; 801 tests.",
    )
    lease7 = write_json("c-lease-n0007.json", {"node": "N-0007", "expected_revision": 0})
    run(["event", "node.lease.acquire", "--payload-file", str(lease7)])
    ev7 = write_json(
        "c-ev-n0007.json",
        {
            "id": "EV-0014",
            "provenance": "implementation-observation",
            "path": "app/src/lib/training/__tests__/activeSessionQueryTruth.test.ts",
            "note": "N-0007: settled empty activeSession query is missing (clears id), not spinner. Error and pending unchanged. AVD renders UNABLE_TO_VERIFY. Listed in docs/eif/AWAITING_APPROVAL.md — do not mark complete until operator approves UI.",
        },
    )
    run(["event", "evidence.add", "--payload-file", str(ev7)])
    note7 = write_json(
        "c-note-n0007.json",
        {"node": "N-0007", "expected_revision": 1, "note": "AWAITING_APPROVAL — spinner-vs-list change. Code landed; do not complete until visual approve."},
    )
    run(["event", "node.stage_note", "--payload-file", str(note7)])
    rel7 = write_json("c-release-n0007.json", {"node": "N-0007", "expected_revision": 2})
    run(["event", "node.lease.release", "--payload-file", str(rel7)])
    run(["status"])


if __name__ == "__main__":
    main()
