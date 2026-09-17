# Phase 1 crash — `RUNTIME_INTEGRITY: IndexError: 3`

**Recorded:** 2026-09-17  
**Host:** `C:\Reclaim` (repo root is the VCS root; Expo app lives under `app/`)  
**Preserved bytes:** `docs/eif-bootstrap/phase1-crash-evidence/`  
**Evidence class:** VERIFIED — read the vendored hook source; reproduced `pathlib` `IndexError(3)` on this host.

This write-up is committed **before** any clean re-install. The framework repo was not modified.

---

## Exact expression

File: `docs/eif-bootstrap/phase1-crash-evidence/hooks/eif_guard.py`  
Function: `verified_runtime`  
**Line 236:**

```python
source_root = hook_dir.parents[3]
```

where `hook_dir = Path(__file__).resolve().parent` (line 235), i.e. the directory containing `eif_guard.py`.

On a host install that directory is `{vcs_root}/.cursor/hooks`.

Python's `pathlib._PathParents.__getitem__` raises `IndexError(idx)` when `idx` is past the ancestor list. That produces the exact message `IndexError: 3`, not `list index out of range`.

Caught at lines 1894–1899 of the same file and emitted as:

```text
RUNTIME_INTEGRITY: IndexError: 3
```

`RUNTIME_INTEGRITY` is in `CRASH_REASON_CODES` (line 173), so `decision_kind` is **`harness_fault`**, not `policy`.

---

## Why index 3 was out of range on this host

VERIFIED by executing:

```text
hook_dir C:\Reclaim\.cursor\hooks
parents [C:\Reclaim\.cursor, C:\Reclaim, C:\]
len 3
0 C:\Reclaim\.cursor
1 C:\Reclaim
2 C:\
3 IndexError IndexError(3)
```

`C:\Reclaim\.cursor\hooks` has **three** parents (indices 0–2). There is no `parents[3]`. The chain stops at the Windows drive root.

The same expression **is** in range when the file still lives in the framework tree:

```text
C:\AI\engineering-intelligence-framework\runtime\cursor\.cursor\hooks
parents[3] == C:\AI\engineering-intelligence-framework
```

That is the layout `verified_runtime` was written for. It then tests whether this process is the framework source copy:

```python
reference = (hook_dir == source_root / 'runtime/cursor/.cursor/hooks'
             and (source_root / 'tools/compile_cursor.py').is_file())
```

Host delivery copies the hook to `{project}/.cursor/hooks` (two levels below the project, three levels to `C:\` on this machine). The installer does not rewrite line 236. The host copy still indexes as if it were four levels below the EIF repo root.

`_project_root()` in the same file (lines 263–270) already uses `parents[2]`, which **is** the host project on this layout. The crash is only in `verified_runtime`, and it runs on **every** hooked event before policy is loaded.

---

## Classification against the offered causes

| Candidate | Verdict |
|-----------|---------|
| **(i) Windows path separators** | **Not the cause.** This is not a `\` vs `/` split. `pathlib` resolved the path. A POSIX repo at `/Reclaim/.cursor/hooks` also has `len(parents) == 3` and would raise `IndexError(3)`. Windows contributes only in that a drive-rooted two-segment repo (`C:\Reclaim`) has no ancestor past `C:\`. |
| **(ii) `app/` nesting** | **Not the cause.** Hooks were at repo-root `.cursor/hooks`, not `app/.cursor/hooks`. Expo-under-`app/` never entered this expression. |
| **(iii) Partial/aborted install leaving a missing artefact** | **Not the cause of this IndexError.** Line 236 runs **before** `.cursor/eif-runtime-manifest.json` is read (line 239). This host did have a partial `.eif/` tree and a runtime manifest; they were never consulted. A complete host install of the same hook on `C:\Reclaim` would still crash here. |
| **(iv) Something else** | **This is the cause.** Hard-coded framework depth `hook_dir.parents[3]` with no bounds check, executed on a host path that only has `parents[0..2]`. |

Secondary condition that made it fire **here** rather than on a deeper clone: VCS root is `C:\Reclaim`, not e.g. `C:\Users\…\Reclaim`. A deeper Windows checkout can have a `parents[3]`; that ancestor would be the **wrong** directory for host layout, `reference` would be false, and the guard would continue into the manifest check. That is luck of clone depth, not a supported host contract.

---

## Host policy vs framework change

**Requires a change in the framework repo.** Do not patch it here.

- `AUTONOMY_POLICY.md` / compiled `.cursor/eif-runtime-policy.json` are loaded **after** `verified_runtime()` (line 1904). Policy cannot skip line 236.
- The bytes are hashed as hook inventory. Editing the host copy of `eif_guard.py` is control-plane drift; once past `parents[3]`, `verify_hook_runtime` would refuse the digest.
- Relocating the git root deeper is not a policy fix and would still compute the wrong `source_root`.

The correct fix is in the framework's `eif_guard.py` `verified_runtime`: detect “running from `runtime/cursor/.cursor/hooks`” without assuming four pathlib parents exist (walk for `tools/compile_cursor.py`, or `try/except IndexError`, or reuse the host `parents[2]` used by `_project_root()`).

**This run does not change the framework repo.** Clean install on this host will re-copy the same line 236 and will crash again until that framework change exists.

---

## Fail-closed, total, no degraded mode

### What happened in session

1. First hooked calls: Cursor **failClosed** (`hooks.json` `preToolUse` / `beforeShellExecution` / `beforeReadFile` / `beforeMCPExecution` / `subagentStart` are `"failClosed": true`). Empty or invalid hook stdout is a mute block.
2. Once Python emitted JSON: `permission: deny`, `decision_kind: harness_fault`, `reason_code: RUNTIME_INTEGRITY`. Still a total block of the tool. Not a policy deny (`OUT_OF_CHANGE_SCOPE` etc.).

### Is there a degraded mode?

**No**, for this class of failure.

`verified_runtime` is mandatory on every `main()` invocation (lines 1894–1899). Integrity failure always `deny('RUNTIME_INTEGRITY', ...)`. There is no path that allows reads, shell, or a subset of tools after that exception.

The only nearby “degraded” behaviour is **after** policy has already succeeded: a later logging fault on a **read-only** event can still allow the read (`out()` around lines 394–398 / 434–438). That path is unreachable if integrity never returns.

Launcher `eif_guard.cmd` also has no continue-on-error mode: a Python failure becomes static `HOOK_INTERNAL_ERROR` JSON; a failed stdout `type` is `exit /b 1`.

### Finding

A parse / indexing error in the hook **bricks every fail-closed tool call in the session**. There is no in-session recovery: Read, Shell, Glob, and MCP are themselves hooked. The operator must disable or remove `.cursor/hooks.json` **outside** the agent (this is how the session was unblocked). That is a harness defect, not an autonomy-policy outcome.

---

## What was not done

- No framework edit.
- No clean re-install (it would reinstall the crashing expression onto `C:\Reclaim`).
- Partial `.eif/` from the aborted install was left in place for this diagnosis; it is not the IndexError cause.
