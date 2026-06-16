# Local-first overnight worklog

**Start:** `local-first-data-architecture` @ `e585867` (restore active guided sessions from snapshot)  
**End state:** `local-first-data-architecture` — see latest `git log` after overnight commits  
**Remote:** `origin/local-first-data-architecture`

---

## Phase 0 — Preflight

| Check | Result |
|-------|--------|
| Branch | `local-first-data-architecture` |
| Tracking | `origin/local-first-data-architecture` |
| Dirty tracked files | None |
| Untracked | `.specstory/` — **never commit** |

---

## Phase 1 — Full stable validation matrix

| Command | Result |
|---------|--------|
| `cd app && npm run typecheck` | PASS |
| `npx vitest run src/lib/localData` | PASS |
| Training / sync / guided snapshot / resume tests | PASS |
| Regression bundle (`--pool=threads` health/recovery/mood) | PASS |
| `npm test` (full Vitest) | PASS after harness fixes (486 tests) |

**Issue captured:** Initial `npm test` failed with `Cannot find module './ImportMetaRegistry'` when importing full `api.ts` without stubbing native expo-sqlite — **classified:** test harness / Vitest + Expo winter runtime under `vi.resetModules()` or heavy `api` import.

---

## Phase 2 — Test harness / coverage hardening

### Fixes (no production behavior change)

1. **`moodCanonical.test.ts`, `moodService.deviceFirst.test.ts`** — Added file-level `vi.mock('expo-sqlite', …)` stub so dynamic imports after `vi.resetModules()` do not pull failing Expo winter stack.
2. **`getLocalDayDate.test.ts`** — Same `expo-sqlite` mock (imports `getLocalDayDate` from `api.ts`).
3. **`smallModuleMirrors.clearBlob.test.ts`** — New focused tests for `clearBlobMirrorForDomain` (guided snapshot clear path).

### Commit

`harden local-first regression coverage` _(pending push with batch)_

---

## Phase 3 — Browser / automation smoke

| Attempt | Result |
|---------|--------|
| `package.json` scripts | `"web": "expo start --web"` present |
| Overnight automation | **Not run** — starting Expo web server + Playwright would exceed unattended scope; app remains React Native–first with native-only modules on several paths |

**Blocker (exact):** No committed Playwright/E2E harness in repo; smoke automation deferred.

**Next step:** Optional future slice — add CI step `expo export --platform web` only if product commits to web surface area.

---

## Phase 4 — Checkpoint docs / release QA

| Artifact | Path |
|----------|------|
| Architecture branch snapshot | Updated `docs/architecture/local-first-data-architecture.md` (append, matrix preserved) |
| Release QA checklist | `docs/release/local-first-release-qa.md` |

---

## Phase 5 — Low-risk cleanup

- Harness duplication (`expo-sqlite` mock repeated in 3 files): acceptable debt document in architecture doc; extracting shared `vitest/mockSqlite.ts` deferred (would touch multiple tests in follow-up).

---

## Phase 6 — Final summary

### Tests passed (representative)

- `npm run typecheck`
- `npm test` — **63 files, 486 tests**
- Stable suites from Phase 1 matrix

### Bugs fixed

- **Harness-only:** ImportMetaRegistry / expo-sqlite load failures in mood + `getLocalDayDate` tests — **not** app runtime bugs.

### Blockers requiring user input

- Guided notification / watch QA — **manual** per `docs/release/local-first-release-qa.md` §3.
- Global Expo web smoke — deferred.

### Next recommended implementation slices

1. Optional shared Vitest `expo-sqlite` stub helper to reduce duplication.
2. Cold-open Training from snapshot without opening Training tab first (product decision).
3. CI job pinning Node Vitest + same commands as this overnight pass.

### Manual guided notification checklist

See **`docs/release/local-first-release-qa.md`** section **3. Guided training / watch (manual)**.

---

### Pushed commits (this overnight pass)

From baseline `e585867`, three commits were added. Inspect:

```bash
git log e585867..HEAD --oneline
```

Expected titles:

- `harden local-first regression coverage`
- `document local-first release QA checklist`
- `record local-first overnight validation results`
