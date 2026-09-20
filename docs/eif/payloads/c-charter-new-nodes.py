"""Charter Stage C correction + running-track nodes via program.py."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PY = [sys.executable, "-B", str(ROOT / ".eif/runtime/programme/program.py")]
RUN = "R20260920C"


def run(args: list[str]) -> None:
    cmd = [*PY, "--project", str(ROOT), "--run", RUN, *args]
    print("+", " ".join(cmd[3:]))
    subprocess.check_call(cmd, cwd=str(ROOT))


NODES: list[list[str]] = [
    [
        "add-node",
        "--id", "N-0036",
        "--title", "C-N HC declared equals requested equals used including location",
        "--class", "feature",
        "--risk", "R2",
        "--touches-existing",
        "--depends-on", "N-0015",
        "--criteria",
        "vitest-declared-requested-used-permission-sets-equal-including-location",
    ],
    [
        "add-node",
        "--id", "N-0037",
        "--title", "C-N server-side account deletion covers RLS-blocked and run tables",
        "--class", "feature",
        "--risk", "R2",
        "--touches-existing",
        "--depends-on", "N-0014",
        "--criteria",
        "script-or-vitest-zero-rows-for-deleted-test-user-in-every-user-keyed-table",
    ],
    [
        "add-node",
        "--id", "N-0038",
        "--title", "C-H Design Lab entry and route are DEV-only",
        "--class", "feature",
        "--risk", "R1",
        "--touches-existing",
        "--depends-on", "N-0001",
        "--criteria",
        "static-check-proves-DesignLab-entry-and-route-do-not-ship-in-production",
    ],
    [
        "add-node",
        "--id", "N-0039",
        "--title", "R0 session calorie source-of-truth via Health Connect",
        "--class", "feature",
        "--risk", "R2",
        "--touches-existing",
        "--depends-on", "N-0036",
        "--criteria",
        "post-session-HC-reread-with-provenance-no-invented-per-set-precision",
    ],
    [
        "add-node",
        "--id", "N-0040",
        "--title", "R1 training modes Strength Running Hybrid",
        "--class", "feature",
        "--risk", "R2",
        "--touches-existing",
        "--depends-on", "N-0021",
        "--criteria",
        "mode-persisted-unset-is-strength-buildFourWeekPlan-only-producer-started-sessions-frozen",
    ],
    [
        "add-node",
        "--id", "N-0041",
        "--title", "R2 running design document",
        "--class", "feature",
        "--risk", "R1",
        "--depends-on", "N-0013",
        "--criteria",
        "RUNNING_DESIGN.md-cites-sources-for-progression-intensity-deload-hybrid-interference",
    ],
    [
        "add-node",
        "--id", "N-0042",
        "--title", "R3 running guided session build",
        "--class", "feature",
        "--risk", "R2",
        "--touches-existing",
        "--depends-on", "N-0040,N-0041,N-0006,N-0037",
        "--criteria",
        "one-FGS-location-type-setIntent-only-vitest-mode-matrix-AVD-GPX-or-HUMAN_CHECKS",
    ],
    [
        "add-node",
        "--id", "N-0043",
        "--title", "R4 Wear OS companion proposal only",
        "--class", "observation",
        "--risk", "R1",
        "--depends-on", "N-0042",
        "--criteria",
        "charter-scope-effort-Play-implications-marked-proposed-do-not-build",
    ],
]


def main() -> None:
    for args in NODES:
        run(args)
    run(["status"])


if __name__ == "__main__":
    main()
