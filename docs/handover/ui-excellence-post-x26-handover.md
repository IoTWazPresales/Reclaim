# UI Excellence track — Handover (post X-26)

**Date:** 2026-07-17 (docs refresh)  
**Primary UI branch:** `chore/reclaim-uiux-audit-pilot` @ `038cf96`  
**Active training/UI follow-up:** `fix/training-confident-ux` @ `e9a02d0` (branched from audit tip)  
**Never touch `main`.**  
**Parallel track:** Med module on `feat/meds-catalog-governance` — do not mix.

---

## Status

| Track | Status |
|-------|--------|
| Audit Batches 1–4 | ✅ Complete |
| Remediation Phases 0–8 | ✅ Complete (committed through `a40d053`) |
| Post-remediation device QA | ✅ Done (partial blocks — Finish/stale need manual) |
| **X-26 cold-start fix** | ✅ `3545d42` |
| **X-11 week labels** | ✅ Fixed on `fix/training-confident-ux` (`9df3aa2`) — `programDay.week_index` SSOT |
| Training confident package + preview UI fixes | ✅ Through `e9a02d0` — **needs new EAS preview for device sign-off** |
| Session Finish / stale visual QA | ⏳ Manual / DEV-client |

---

## Read first (next agent)

1. This handover  
2. `docs/handover/training-confident-fixes-handover.md` — if working training / Wear / Home UI  
3. `docs/audits/remediation-log.md` — phase matrix + QA + X-26  
4. `CONTEXT.md` (top sections only)

**App root:** `app/` — `npm run typecheck`  
**ADB:** `C:\Users\warren_eliason\AppData\Local\Android\Sdk\platform-tools\adb.exe`  
**Package:** `com.fissioncorporation.reclaim`

---

## Commit map (relevant)

| Item | Commit | Notes |
|------|--------|-------|
| Phases 0–8 remediations | `f6612f8` … `a40d053` | See remediation handover |
| Full-track handover doc | `f0cac28` | Audit+remediation summary |
| **X-26 fix + splash bar** | **`3545d42`** | Permission-only splash await; reconcile backgrounded |
| Training audit docs | `038cf96` | |
| Training confident + UI regressions | `9df3aa2` … `e9a02d0` | On `fix/training-confident-ux` |

---

## What X-26 changed (`3545d42`)

- `runStartupNotificationPermissionGate()` awaits **permission + clearBadge only**
- `reconcileNotifications()` still runs (intent → reconcile) but **fire-and-forget** after gate
- Splash copy: `"Almost ready..."`
- Splash progress bar: halo / sheen / shimmer (`reduceMotion` skips shimmer)
- Unit test: `app/src/startup/__tests__/notificationStartupGate.test.ts`

**Not touched:** reconciler internals, `applySetCompletion`, session work authority, GUIDED_TRACE.

---

## Frozen invariants (still apply)

- Preserve `[GUIDED_TRACE]`
- No empty catches (`logger.debug` in `__DEV__`)
- Do not modify `applySetCompletion`, `guidedSetCompletionCanonical`, `sessionWorkAuthority` internals, or notification reconciler internals unless explicitly scoped
- Explicit `git add <paths>` only; commit only when asked; push after commits on feature branches
- Never touch `main`

---

## Open / deferred

### Device / QA

- New EAS preview on `fix/training-confident-ux` @ `e9a02d0+` (insight chrome, session modal, Home gaps)
- Session Finish confirm + complete summary — manual verify
- Stale Resume/Discard — `__DEV__` + `EXPO_PUBLIC_STALE_SESSION_MINUTES=1`
- Evening Wear Done checklist — see training-confident handover

### Product / Play (separate)

- Play Console declaration vs current HC plugin (now includes steps + active calories) — see `docs/release/reclaim_play_readiness_audit.md`
- Optional: AppCard double-margin pattern on **non-Home** screens
- Home widgets (native) — deferred since final-pass Phase 7

### Dirty tree (do not casually commit)

- Untracked: `.cursor/skills/`, `docs/archive/`, bulk `docs/audits/evidence/*`, audit batch markdown, `releases/`, etc.

---

## Document index

| Path | Role |
|------|------|
| `docs/handover/ui-excellence-post-x26-handover.md` | **This file** |
| `docs/handover/training-confident-fixes-handover.md` | Training + preview UI follow-up |
| `docs/handover/ui-excellence-remediation-handover.md` | Phases 0–8 remediation |
| `docs/audits/remediation-log.md` | Tracker + QA + X-26 |
| `docs/audits/cold-start-audit.md` | X-26 diagnosis |
| `docs/release/reclaim_play_readiness_audit.md` | Play / HC gate |

---

## Next-agent checklist

1. Prefer `fix/training-confident-ux` for training/UI follow-ups; pull before work.  
2. Do **not** reopen Phases 0–8 or re-litigate X-26 unless a proven regression.  
3. Queue EAS preview before claiming device-fixed UI.  
4. Prefer this handover + training-confident handover over stale “X-11 deferred / X-26 uncommitted” wording in older CONTEXT sections (history is add-only; trust the top).
