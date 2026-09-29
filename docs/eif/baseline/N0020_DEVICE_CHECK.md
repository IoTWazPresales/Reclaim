# N-0020 — device check for the weekly sets line

Source tests do not prove the session-preview line on a device.
Do not mark N-0020 complete from them.

On the retained emulator session (do not reinstall, clear data, or change
networking):

1. Open Training and preview an existing planned day. Do not start the session.
2. Read the weekly sets line in the preview. Core work that the catalogue tags
   `core` should contribute to Core. Conditioning tagged `cardiovascular` and
   days tagged `full_body` should not appear as their own buckets.
3. Back out of the preview. No new session, dose, mood, or sleep row should be
   written for this check.

This session captured Home only (`emulator-5554`, Reclaim focused).
`uiautomator dump` returned "could not get idle state", so the preview was
not opened. That capture is not acceptance of the line.
