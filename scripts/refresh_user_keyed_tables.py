"""Refresh public user-key/FK metadata through Supabase CLI; never queries user rows.

Run at repo root: python scripts/refresh_user_keyed_tables.py [--check]
Requires an authenticated Supabase CLI. The project is pinned deliberately.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUERY = ROOT / "scripts" / "user_keyed_tables.sql"
SNAPSHOT = ROOT / "docs" / "schema" / "user_keyed_tables.json"
PROJECT_REF = "bgtosdgrvjwlpqxqjvdf"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if live metadata differs; write nothing")
    args = parser.parse_args()
    npx = shutil.which("npx.cmd") or shutil.which("npx")
    if not npx:
        raise RuntimeError("npx is required to run the Supabase CLI")
    proc = subprocess.run(
        [npx, "--yes", "supabase", "db", "query", "--linked", "--project-ref", PROJECT_REF,
         "--file", str(QUERY), "-o", "json"],
        cwd=ROOT / "app", capture_output=True, text=True, encoding="utf-8", timeout=90,
    )
    if proc.returncode:
        raise RuntimeError(f"Supabase metadata query failed: {proc.stderr.strip()}")
    response = json.loads(proc.stdout)
    tables = response.get("rows")
    if not isinstance(tables, list) or not tables:
        raise RuntimeError("Refusing an empty or malformed schema snapshot")
    for table in tables:
        if table.get("schema") != "public" or not table.get("user_columns"):
            raise RuntimeError("Unexpected metadata row; snapshot not written")
    snapshot = {
        "version": 1,
        "project_ref": PROJECT_REF,
        "source": "supabase db query --project-ref; pg_catalog metadata only",
        "query_sha256": hashlib.sha256(QUERY.read_bytes().replace(b"\r\n", b"\n")).hexdigest(),
        "tables": tables,
    }
    content = json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not SNAPSHOT.exists() or json.loads(SNAPSHOT.read_text(encoding="utf-8")) != snapshot:
            print("SCHEMA_DRIFT: refresh docs/schema/user_keyed_tables.json and review deletion coverage")
            return 1
        print(f"OK live snapshot unchanged: {len(tables)} public user-keyed tables")
        return 0
    SNAPSHOT.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT.write_text(content, encoding="utf-8")
    print(f"Wrote {SNAPSHOT.relative_to(ROOT)}: {len(tables)} public user-keyed tables")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
