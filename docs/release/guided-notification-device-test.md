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

## Prep countdown (no duplicate restart)

**Bug fixed:** prep countdown effect previously depended on unstable parent callbacks and **restarted ~when `startSessionMutation` finished** (~few seconds).

**Verify**

1. Guided prep **30s** (or settings value): timer counts **once** from full duration — **does not jump back** to 30 after a few seconds when “Starting session…” clears.

## Watch REST → Next set (no stale “edit set” modal)

**Bug fixed:** `next_set` normalized to `set_done`; if performed-state lagged, UI opened **edit** for the next set instead of Set Focus.

**Verify**

1. Complete rest on watch via **Next set** (or wait for rest-end notification).
2. App should land on **Set focus** for the next work set, **not** the edit-set dialog.

## Rest / next-set notifications while locked

**Changes:** foreground reconcile is **forced** (cooldown bypass) so intents are not left unscheduled until unlock; Android **`SCHEDULE_EXACT_ALARM`** declared for more reliable delayed alarms (requires new native build). **U4:** guided start shows a soft Alarms & reminders prompt when exact is denied (does not block start); FGS rest-end timer remains primary.

**Verify**

- Rest start / rest complete notifications should not **only** appear after unlocking (exact alarm policy still OS-dependent).
- Fresh install / Alarms OFF: guided start may show the soft prompt; session still starts; rest-end still arrives while session FGS is alive.
- After enabling Alarms & reminders mid-session: only **new** rest cycles get exact OS alarms (no retro-upgrade of an already-armed inexact alarm).

## Log markers (debug builds / logging enabled)

Filter logs by:

| Marker | Meaning |
| --- | --- |
| `[GUIDED_START]` | Guided prep flow started |
| `[GUIDED_PREP]` | Prep countdown arm / complete / cancel |
| `[GUIDED_REST_NOTIFY]` | Rest notification scheduling path |
| `[GUIDED_NEXT_NOTIFY]` | Delayed next-set after rest |
| `[GUIDED_RECONCILE]` | Training intents in merged reconcile plan |
| `[GUIDED_NATIVE_SCHEDULE]` | Native notification id for a training logical key |
| `[GUIDED_MODAL]` | Set focus vs edit routing from notification |

