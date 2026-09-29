# N-0067 rendered category headings

Status: rendered on 2026-09-29, emulator-5554, after the operator signed in.
Ordinary text is font scale 1.0. Large text is font scale 1.3, then restored to 1.0.
Screenshots are under `.eif/audit/N-0067/product-renders/`. This does not complete
the node. No mood, sleep, or medication records were written.

## What was on screen

| Surface | Category line | Card actually shown | File |
|---|---|---|---|
| Home, ordinary | Medication | Dose-recording insight. The line does not say a mechanism. | `ordinary-home-medication.png` |
| Sleep, ordinary | Sleep | Local Sleep screen rule `midpoint_drift`, stored tag `sleep`. Message: "Bed/wake timing is drifting". | `ordinary-sleep-category.png` |
| Mood, ordinary | Mood | Catalogue `mood_fallback`, stored tag `mood_fallback`. | `ordinary-mood-category.png` |
| Home, large | Medication | Same dose-recording card. "Medication" stays on its own line above the message. The screen title truncates to "Ho...". | `large-home-after-dismiss.png` |
| Sleep, large | Sleep | Same local sleep card. "Sleep" stays above the message. The screen title truncates to "Sle...". | `large-sleep-category.png` |
| Mood, large | Mood | Same fallback card. "Mood" stays above the message. The screen title truncates to "Mo...". | `large-mood-category.png` |

## Named rules that were not the active cards

Last night on the Sleep screen is 7h 24m. Catalogue rules `sleep-debt-serotonin`
(`sleep_serotonin`) and `vagal-tone-breath` (`sleep_breath_vagal`) both require
recorded sleep under 6 hours, so they were not selected. Mood still says the
history is settling, and the card is `mood_fallback`, not `dopamine-downshift`
(`mood_dopamine`). Those three stored tags were not opened. Action routes were
not tapped. Chemistry chips were not enabled. N-0035 still owns those chips.

A dev LogBox about linking configured in more than one place appeared during the
large-text restart. It was dismissed. It is not a category-heading result.
