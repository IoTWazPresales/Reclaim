# Guided training — device QA (notifications & phone Done)

Use after preview/internal builds. Focus: **guided mode**, phone + optional watch.

## Phone Done → rest (ordering)

**Expected sequence**

1. Start a guided session with at least **two sets** on the same exercise and **rest &gt; 0** after set 1.
2. Complete **set 1** with **Done** on the phone (not the watch).

**Expected**

- **Rest UI appears immediately** after tapping Done (no multi-second delay waiting on network).
- **No flash** of the **set 2 / next work** card before the rest countdown appears.
- After rest ends (or Skip rest), the **next work set** appears as before.

**Regression checks**

- Last set of an exercise (**no rest** after final set): advances to next exercise or completion without stuck rest.
- Offline / queue failure path: rare; if sync totally fails, user should not be left on rest if the app reverts the set (same as prior behavior).

## Watch / notification paths

- Covered separately from phone Done; watch `SET_DONE` does not drive in-app `restTimer` (by design today).

## Snapshot / resume

- After entering rest, guided snapshot should show **`phase: 'rest'`** when persisted (debounced save).
