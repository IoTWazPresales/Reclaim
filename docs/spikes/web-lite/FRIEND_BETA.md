# Reclaim Web Friend Beta

Preview: https://eliasonw-reclaim-app--77x8x4nmmq.expo.app

Verification status: sign-up UI and signed-out 390 x 844 Chromium layout checked.
Source gate: **1,534 tests / 209 files pass**, typecheck passes, dual-path 31/31,
catalogue 357/0 and web export pass. A simulated-backend Chromium journey passes
password sign-in/reload, Save (12 days), plan, preview, manual 12 kg x 7, finish and
history, with frozen planned sets unchanged and zero page errors. This is not a
live account check. [Validation and complete file inventory](evidence/friend-beta-validation.json).

Dedicated-account setup Save, hosted sign-in/reload, weekly plan, Session Preview,
manual logging and history still need live verification. The operator is choosing a dedicated test inbox; Supabase email confirmation is
required and signup is enabled. No test account has been created yet. This preview is not yet cleared for the friend invitation.
No setup or set writes were made to the operator account.

## Sign up and sign in

Choose **New here? Create account**, enter your email and a new password, then
choose **Create account**. If asked, confirm the email Supabase sends you, return
to this same preview URL and sign in with your email and password. Google sign-in
is unavailable on web. Use a dedicated test account to verify setup before inviting
friends; never replace the operator's active programme as a test.

Sign-in persists across reload using browser storage. Browsers can deny or clear
storage; an error means persistence cannot be promised. Sign out on shared devices.

## Training

The beta provides setup, a weekly plan, Session Preview, manual logging and history.
These capabilities are implemented; their complete hosted journey remains pending
the dedicated-account verification above.

1. Open **Training setup**, choose your goals, schedule, equipment, constraints and
   optional baselines, then **Save**. Select equipment you actually have: infeasible combinations are
   rejected before any write; the minimal default equipment fixture was rejected,
   while the full-gym fixture saved successfully. Saving replaces your active programme; past
   started sessions keep their frozen planned sets.
2. Choose a week and **Preview** a lifting day. Choose **Start manual session**.
3. **Log what you actually lift. Edit weight/reps before saving if they differ.**
   A set is saved only after Supabase confirms it. If saving fails, reconnect and
   retry; web does not queue offline sets.
4. Choose **Finish manual session**, then **History** and the finished session to
   view the weights and reps actually saved. Reload recovers unfinished sessions
   from server truth; it does not rebuild their prescriptions.

Not on web: guided timers, notifications, rest alarms, Health Connect, Wear, run
tracking and offline logging. Unsupported capabilities say **Not available on web**.
Use the Android app for these capabilities.

## Report an issue

Send a screenshot and what you expected to happen. Include the preview URL,
browser/device, steps taken and any visible error. Keep passwords and private
health information out of screenshots.

## Operator configuration and verification

No Supabase settings were changed. For this preview the exact confirmation return
URL is `https://eliasonw-reclaim-app--77x8x4nmmq.expo.app/`. Add that exact URL to
Supabase Auth **Redirect URLs** before testing email confirmation on this domain.
If this beta becomes the intended default web auth destination, its **Site URL**
would be that same exact URL. Do not replace an existing production/mobile Site URL
just to allow a preview: the app supplies `emailRedirectTo`, so the additional
redirect allow-list entry is sufficient. Repeat the exact entry for the final
preview URL when a new deployment is used. Password sign-in itself uses no redirect.

[Supabase redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls)
and [EAS preview deployments](https://docs.expo.dev/eas/hosting/).

Pending live check: create and confirm a new email/password account; sign in; save
setup; verify the saved weekly plan and Session Preview; enter an artificial weight
and reps on that account; log once; finish; check History and reload; verify the
canonical `training_session_items.performed.sets` values by authenticated read-back.
Repeat on the hosted URL. Do not use service-role/admin confirmation to bypass the
email/password signup requirement.

Physical iPhone Safari is unverified. Check keyboard resizing, safe-area insets,
touch scrolling, modal scrolling, private-mode storage and page suspension there.
Chromium at an iPhone viewport is layout evidence only. The earlier spike's Windows
WebKit protocol failure remains unresolved.
