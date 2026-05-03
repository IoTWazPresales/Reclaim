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

## Watch / notification SET_DONE → in-app rest (Phase B)

**Expected sequence**

1. From watch or phone notification, complete **set N** via **SET_DONE** while the session exists (guided mode).

**Expected**

- Opening the app or focusing the training screen shows **REST for set N** when **rest &gt; 0** before focusing **set N+1** work (no jump straight to next work while rest should apply).
- **rest = 0** after set N: UI advances to the **next work set** as before (no forced rest screen).

**Stale / duplicate**

- Completing later sets then tapping an **old** SET_DONE should **not** rewind rest or focus to an earlier set (`ahead_of_payload` guard).

## Snapshot / resume

- After entering rest, guided snapshot should show **`phase: 'rest'`** when persisted (debounced save).
