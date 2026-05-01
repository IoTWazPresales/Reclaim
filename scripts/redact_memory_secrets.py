"""One-off redaction helper for memory raw docs. Run from repo root."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CURSOR_REL = Path("docs/memory/raw/cursor/2026_02_18_06_12_40Z_gradle_build_failure_in_recla.md")
SPECSTORY_GRADLE = Path(
    ".specstory/history/2026-02-18_06-12-40Z-gradle-build-failure-in-reclaim-app.md"
)

PAT_LINE = re.compile(
    r'printf "https://IoTWazPresales\\n:github_pat_[A-Za-z0-9_]+@github\.com\\n" > /root/\.git-credentials\\nchmod 600 /root/\.git-credentials'
)

PAT_REPL = (
    'printf "https://[REDACTED_USER]:[REDACTED_GITHUB_PAT]@github.com\\n" > /root/.git-credentials\\n'
    "chmod 600 /root/.git-credentials"
)

JSON_BLOCK = re.compile(
    r"\{\s*\n"
    r'  "type": "service_account",\s*\n'
    r'  "project_id": "[^"]+",\s*\n'
    r'  "private_key_id": "[^"]+",\s*\n'
    r'  "private_key": "-----BEGIN PRIVATE KEY-----\\n.*?-----END PRIVATE KEY-----\\n",\s*\n'
    r'  "client_email": "[^"]+",\s*\n'
    r'  "client_id": "[^"]+",\s*\n'
    r'  "auth_uri": "[^"]+",\s*\n'
    r'  "token_uri": "[^"]+",\s*\n'
    r'  "auth_provider_x509_cert_url": "[^"]+",\s*\n'
    r'  "client_x509_cert_url": "[^"]+",\s*\n'
    r'  "universe_domain": "[^"]+"\s*\n'
    r"\}",
    re.DOTALL,
)

JSON_REPL = """{
  "type": "service_account",
  "project_id": "[REDACTED_PROJECT_ID]",
  "private_key_id": "[REDACTED_PRIVATE_KEY_ID]",
  "private_key": "[REDACTED_PRIVATE_KEY]",
  "client_email": "[REDACTED_CLIENT_EMAIL]",
  "client_id": "[REDACTED_CLIENT_ID]",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "[REDACTED_CLIENT_X509_URL]",
  "universe_domain": "googleapis.com"
}"""


def redact_gcp_json(path: Path) -> bool:
    """Replace one raw GCP service-account JSON block; return True if written."""
    text = path.read_text(encoding="utf-8")
    if '"private_key": "[REDACTED_PRIVATE_KEY]"' in text:
        print(f"skip already redacted GCP JSON: {path}")
        return False
    new_text, n = JSON_BLOCK.subn(JSON_REPL, text, count=1)
    if n != 1:
        raise SystemExit(f"Expected 1 JSON block replace in {path}, got {n}")
    path.write_text(new_text, encoding="utf-8")
    return True


def main() -> None:
    if redact_gcp_json(ROOT / CURSOR_REL):
        print(f"redacted GCP JSON in {CURSOR_REL}")

    ss = ROOT / SPECSTORY_GRADLE
    if ss.exists():
        if redact_gcp_json(ss):
            print(f"redacted GCP JSON in {SPECSTORY_GRADLE}")
    else:
        print(f"skip missing {SPECSTORY_GRADLE}")

    codex_files = [
        Path("docs/memory/raw/codex/2026_03_02_Audit_and_fix_guided_training_notifications_flow.md"),
        Path("docs/memory/raw/codex/2026_03_11_ Audit_notification_system_functionality_.md"),
    ]
    total_pat = 0
    for rel in codex_files:
        p = ROOT / rel
        c = p.read_text(encoding="utf-8")
        c2, k = PAT_LINE.subn(PAT_REPL, c)
        if k:
            p.write_text(c2, encoding="utf-8")
            total_pat += k
        print(f"{rel}: replaced {k} PAT printf line(s)")
    print(f"total PAT lines: {total_pat}")


if __name__ == "__main__":
    main()
