"""Smoke test for scripts/eif_node.py.

Run from repo root: ``python -m pytest scripts/test_eif_node.py -q``

Skips when the EIF runtime is not installed in this checkout (``.eif/runtime`` is
machine-local and not committed).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
WRAPPER = ROOT / "scripts" / "eif_node.py"
PROGRAM = ROOT / ".eif" / "runtime" / "programme" / "program.py"
PROGRESS = ROOT / "docs" / "eif" / "PROGRESS.md"

pytestmark = pytest.mark.skipif(not PROGRAM.exists(), reason="EIF runtime not installed in this checkout")


def _run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-B", str(WRAPPER), *args],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def test_status_reads_ledger() -> None:
    proc = _run("status")
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert "id=PRG-" in proc.stdout
    assert "frontier" in proc.stdout


def test_dry_run_mutation_writes_nothing() -> None:
    before = PROGRESS.read_text(encoding="utf-8")
    proc = _run("--dry-run", "lease", "N-0016")
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert "DRY-RUN node.lease.acquire" in proc.stdout or "already leased" in proc.stdout
    assert PROGRESS.read_text(encoding="utf-8") == before


def test_unknown_node_fails_non_zero() -> None:
    proc = _run("--dry-run", "lease", "N-9999")
    assert proc.returncode != 0
    assert "eif_node:" in proc.stderr
