# N-0058 device verification — UNABLE_TO_VERIFY

N-0056 still owns the recorded dev-client EOF/ANR after the prescribed cold restart
and timed Reload attempt. See N0046_DEVICE_CHECK.md and `.eif/audit/N-0046/`.
No additional identical restart loop, product screenshot, or live deletion is claimed.

After environment recovery, using throwaway accounts only:

1. On Settings and Data & privacy, confirm the selected account and Delete account
   wording. Open confirmation, change account through a separate pending auth flow,
   then accept the old confirmation: reject without deleting the new account.
2. During deletion, verify the busy message is readable at large text size and
   announced by TalkBack; Back/deep-link must not expose a usable login form.
3. Delay device cleanup after successful server response. Auth appears only when
   cleanup ends; sign in as a different throwaway user and verify its state survives.
4. Verify offline/error recovery removes the busy gate and permits a retry.
5. Complete N-0047's multi-domain wipe and zero-row/auth-user-absence checks.

Record screenshots in `.eif/audit/N-0058/` and journey evidence in
`.eif/audit/delete-account/`. Warren reviews the visible change in the final build.
