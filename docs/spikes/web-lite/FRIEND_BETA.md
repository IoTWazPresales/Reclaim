# Reclaim Web Friend Beta

Beta URL: **https://eliasonw-reclaim-app--beta.expo.app**

This is the stable, non-production EAS Hosting alias `beta`. Deployed application
source: merge `c4e13cf` of `fix/training-confident-ux` 407bb27 (weekly policy v4, split preference)
into this branch, deployment `kiuocudv7k` (2026-11-04). Previous: `70de865`, deployment `tuefyoucce`.

## Sign up and sign in

Choose **New here? Create account**, enter your email and a new password, then
choose **Create account**. Click the confirmation email Supabase sends you.

After clicking the confirmation email you may land on an unrelated page; ignore it, open the beta URL and sign in.

Sign in with your email and password. Sign-in survives a normal page reload using
browser storage. Sign out on shared devices. Browsers can deny or clear storage,
so persistence in private mode or after browser cleanup is not guaranteed.

**Password reset is not supported in the beta.** Google sign-in is unavailable.

## What works

Setup, the weekly plan, Session Preview, manual logging and history have been
verified against live Supabase on the hosted beta with a dedicated test account.

1. Open **Training setup**, choose your goals, schedule, equipment, constraints and
   optional baselines, then **Save**. Select equipment you actually have. If a
   programme cannot meet those requirements, review the equipment, constraints and
   training days before saving. Saving replaces your active programme; started
   sessions keep their frozen planned sets.
2. Choose a week and **Preview** a lifting day. Choose **Start manual session**.
3. **Log what you actually lift. Edit weight/reps before saving if they differ.**
   A set is saved only after Supabase confirms it. If saving fails, reconnect and
   retry; the beta does not queue offline sets.
4. Choose **Finish manual session**, then **History** and the finished session to
   see your saved weights and reps. Reload also recovers an unfinished manual
   session and its saved sets from server truth.

## Not on web

Guided timers, notifications, rest alarms, Health Connect, Wear, run tracking and
offline logging are not available. Unsupported capabilities say **Not available on
web**. Use the Android app for those capabilities.

## Report an issue

Send a screenshot and what you expected to happen. Include the beta URL,
browser/device, steps taken and any visible error. Keep passwords and private
health information out of screenshots.

## Verification and limitations

Test account: `warren.eliason+reclaimweb@gmail.com`. After the operator confirmed
its email, the hosted password sign-in, setup Save (12 programme days), weekly
plan, Session Preview, manual logging, finish and History all passed. Authenticated
read-back confirmed the artificial 12 kg x 7 test set in both canonical
`training_session_items.performed.sets` and its set-log row. Reload preserved
sign-in, the unfinished manual session, the saved set and finished History. Frozen
planned sets were unchanged. No operator-account requests or writes occurred.

The 390 x 844 Chromium journey had no JavaScript errors, HTTP errors or horizontal
overflow. Physical iPhone Safari remains unverified: keyboard resizing, safe areas,
touch/modal scrolling, private-mode storage and page suspension still need an
actual iPhone check. The earlier Windows WebKit protocol failure remains unresolved.

No Supabase settings were changed, including Site URL or Redirect URLs. Signup
passes email/password only, with no `emailRedirectTo`; confirmation uses the
existing Site URL. No redirect entry, config push or Management API auth change
was performed or is needed for this flow. No production alias, OTA, store
submission or EIF acceptance was performed.

[Live verification and gate evidence](FRIEND_BETA_VERIFICATION.md),
[complete source-gate inventory](evidence/friend-beta-validation.json).
