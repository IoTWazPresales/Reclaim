# N-0043 — Wear OS companion proposal

Observation only. No watch module, tile, complication, or Health Services client was added.

## What exists

The phone already mirrors guided actions through Android notifications. Wear shows those notifications when the watch is paired. Done on the watch uses the same `applySetCompletion` path as the phone. Opening the phone must not cancel that guidance.

`app/src/wearables/WearablesDeliveryService.ts` is a stub. `WearOSDeliveryAdapter.deliver` logs and returns 0. There is no Wear OS module in the Android project.

A finished phone session can write a Health Connect `ExerciseSession` after the fact. That is not a live workout on the watch. The writer notes that a live Wear workout UI needs Health Services.

A run cue is the same notification path: `TRAINING_RUN`, reconciled by `NotificationScheduler`, with no set-Done action. It can appear on a paired watch as a notification. It is not a Wear app.

## Proposal

Keep the companion unbuilt this cycle.

If a later node is chartered to build it, the smallest useful version is still the notification mirror, not a second app:

- Phone owns the session, the foreground service, GPS, and the route.
- The watch shows the existing notification and its actions.
- A run does not gain a watch-side GPS recorder. Two location streams would disagree, and the phone service is already the one foreground service.
- Health Connect remains the place a watch workout becomes data Reclaim can read. Reclaim does not start a Health Services exercise on the watch in this proposal.

A real Wear OS app (ongoing activity, tiles, its own exercise client) is a separate product surface. It needs its own manifest, a Wear form factor on Play, Data Safety for the watch, and a decision about whether the watch or the phone owns the route. That decision is not made here.

## Effort

| Option | What it is | Effort |
|---|---|---|
| Notification mirror | Already the phone path. Prove it on a worn watch. | Device check only. No new module. |
| Glance stub | `WearOSDeliveryAdapter` stays a stub. | No work. Do not pretend it delivers cards. |
| Wear OS app | New module, Play Wear track, Health Services if the watch runs the workout. | A later programme, not this node. |

## Play

The current listing is the phone app. Notification bridging does not add a Wear APK. Declaring a Wear app, watch location, or a watch foreground service is out of scope until a build node exists. Data Safety for precise location and the route belongs to the phone run in N-0042, not to a watch companion.

Heart-rate variability and resting heart rate stay out of this cycle. A watch companion must not become the path that adds them.

## Acceptance

This file is the proposal. Nothing in `app/` was added for N-0043.
