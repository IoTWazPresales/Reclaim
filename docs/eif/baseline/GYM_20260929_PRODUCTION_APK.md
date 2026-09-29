# Gym observations — production APK, 2026-09-29

Source: gym session on the production build
https://expo.dev/accounts/eliasonw/projects/reclaim-app/builds/dea4df60-4f2c-4f4b-961b-7096863413d7

These are observations. They are not fixes, and source tests do not close them.
They do not jump the charter queue.

| Observation | Owner |
|---|---|
| Training stayed in a loading loop until every training profile was deleted. `getTrainingProfile` uses `.single()`. | Not N-0007. N-0007 is a different spinner case and stays awaiting approval. No node in the current wave owns this. |
| Exercise illustrations still do not match the movement. | N-0034, unstarted. |
| First open showed "Couldn't confirm your profile" (`OnboardRetryScreen`). Close and reopen then entered. The six-second profiles probe lost the cold start. | N-0005 only stopped a dump onto Welcome. |
| Guided training worked. Starting a session asked to reconfirm permissions. Notification permission is requested at guided start. Health Connect exercise-session write and active-calorie read are requested on the first training start of that process. | Record only. N-0061 device proof is still the human check. |
| No running module. | N-0040, N-0041, and N-0042 are unstarted. |
| Devices do not reconnect by themselves. Garmin and Huawei are stubs. Health Connect is the Android connection. | Record only. |
| Some notifications appeared only when the app was opened. Foreground reconcile is not proof that lock-screen, Doze, or Wear delivery works. | N-0061 human check. N-0017 and N-0042 stay non-compliant. |
| Integrations copy for sleep, heart rate, oxygen, breathing rate, temperature, steps-as-inactivity, post-session active calories, and exercise-session write is supposed to work only when Health Connect is connected. It did nothing useful in that gym session. | Record only. Not owned by N-0021. |
