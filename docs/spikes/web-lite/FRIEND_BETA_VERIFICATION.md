# Hosted friend beta verification - 2026-11-02

The real Supabase journey passes on
https://eliasonw-reclaim-app--beta.expo.app at deployed source
`70de865b94aa16b51386bbc371da1d920c9a7e8b`, deployment `tuefyoucce`.
No source changes were required after email confirmation.

## Account and executed journey

Dedicated email: `warren.eliason+reclaimweb@gmail.com`; auth user
`509b209b-06de-4459-8830-c86fe178d1f5`. Signup on the hosted alias returned HTTP 200
with a confirmation timestamp and no redirect override. The operator clicked the
Gmail confirmation and explicitly resumed the run. Hosted password sign-in then
returned that exact user with `email_confirmed_at` present. No admin/service-role
confirmation, magic-link sign-in or auth configuration change was used.

The test began with zero profiles, programmes, programme days and sessions for that
account. Through the actual 390 x 844 UI it saved a three-day strength programme
using the full-gym equipment fixture (12 days over four weeks), viewed the weekly
plan, opened Session Preview, and started one manual session. It edited the first
set to the artificial 12 kg x 7 values and logged it once through the existing
`applySetCompletion` path. Authenticated Supabase GETs confirmed one performed
set and one corresponding set-log row. The entire planned-item snapshot retained
its SHA-256 fingerprint before logging, after logging and after finishing.

Reload preserved authentication and restored the unfinished session with the saved
set. Finishing recorded an end time; History showed the same set. Reload followed
by reopening History retained it. No open session remains. The dedicated account
retains its test programme and one finished test session for inspection.

No browser responses were mocked or fulfilled. A browser route guard verified the
JWT subject of every REST request and allowed writes only for the dedicated test
identity. Operator-prefix requests/writes: 0/0. JavaScript errors, HTTP errors and
horizontal overflow: zero. Screenshots were inspected for preview/history at
390 x 844 and retained outside Git; no physical Safari claim is made.

Sanitized live receipt: [beta-live-20261102.json](evidence/beta-live-20261102.json).
Passwords, browser tokens, private storage and bulk screenshots are excluded.

## Post-confirmation gate

**PASS: 1,534 tests across all 209 files**, no missing or duplicated files.
Each of the four fallback processes exited 0; their JSON reports were reconciled
against every discovered `src/**/*.{test,spec}.ts?(x)` file. The configured
30-second test budget was retained. No source/test edits were made during this
verification run.

| Shard | Files passed | Tests passed | Exit |
| --- | ---: | ---: | ---: |
| 1/4 | 53 | 324 | 0 |
| 2/4 | 52 | 375 | 0 |
| 3/4 | 52 | 507 | 0 |
| 4/4 | 52 | 328 | 0 |
| Total | 209 | 1,534 | 0 |

Command for each shard (private result paths supplied per shard):

```text
npx vitest run --reporter=verbose --reporter=json --outputFile=<shard-json> --shard=<n>/4 --maxWorkers=1 --sequence.shuffle.files --sequence.seed=20261103
```

Typecheck, training dual-path 31/31 and standalone catalogue retry (357 rows,
zero governance issues) pass with process exit 0. EIF wrapper smoke tests: 3
skipped because runtime is absent in this isolated worktree; no EIF mutation.
The source export and hosted asset hashes were verified before email signup;
application source remains byte-identical to deployed 70de865.

The first post-confirmation full threaded run stalled after two successful tests
and was stopped as INCOMPLETE. The initial standalone catalogue run printed a
passing assertion but exited 1 without a completion summary, so it was not counted
as a passing process. Its cmd-redirect retry exited 0. Raw logs and JSON reports
stay outside Git at `C:/Reclaim-web-lite-evidence/20261102`; generated snapshot and
volume-report changes are restored to the branch baseline before staging.

[Complete per-shard file inventory](evidence/beta-post-confirmation-gate-20261102.json),
[signup receipt](evidence/beta-signup-20261102.json),
[combined validation receipt](evidence/friend-beta-validation.json).

## Scope limits

Only the dedicated test account received application data writes. The operator's
account was neither used nor modified. No Supabase settings, production deployment,
OTA publish, store submission or EIF acceptance. Native behavior and training
engine/persistence source are unchanged by this verification run.

Physical Safari remains unverified, especially keyboard/viewport resizing,
safe-area insets, touch/modal scrolling, private storage and page suspension.
Minimal equipment combinations can still be rejected by the existing feasibility
rules; no programme-validation bypass was introduced.
