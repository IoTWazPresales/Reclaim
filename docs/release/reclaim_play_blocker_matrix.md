# Reclaim — Play blocker matrix

**Severity:** **P0** = likely rejection or misleading compliance; **P1** = high risk; **P2** = trust/review quality.

| Blocker | Severity | Evidence | Affected files / surfaces | Why it matters | Recommended action | If unresolved at resubmit |
|---------|----------|----------|---------------------------|----------------|--------------------|----------------------------|
| **Console declaration / Data safety unknown vs APK** | **P0** | **Open** **OQ-1**; past rejections on **minimum scope** | Play Console (not in repo); code: `withHealthConnectPermissions.js`, `healthConnectService.ts` | Google compares **declared** types + **visible** features to **manifest** | Export forms to `docs/memory/raw/`; reconcile every HC line item | **Likely** repeat rejection or stalled review |
| **Internal health coverage doc contradicts Android manifest** | **P0** | `reclaim_policy_audit.md` §2; `HEALTH_API_COVERAGE.md` vs plugin | `app/Documentation/HEALTH_API_COVERAGE.md` | Wrong doc → wrong Console if copied | Update doc **or** code; single source of truth | **High** mismatch risk |
| **First rejection mapped HR, SpO2, RR, body temp as “excessive”** | **P1** | **Verbatim** `raw/play-console/2026_04_08_*.md` | Manifest still includes these **read** permissions | Reviewer may re-apply if **features** look thin | Ensure Sleep UI + listing **show** justification | **Possible** rejection despite second-letter narrowing |
| **Second rejection mapped calories, steps, RHR, HRV (version 7)** | **P1** | **Verbatim** `raw/play-console/2026_04_16_*.md` | Current manifest **omits** these HC reads | **Favorable** if Console also omits | Verify **no** stale declaration rows | Lower risk **if** aligned |
| **`ACTIVITY_RECOGNITION` without clear HC step/activity read** | **P1** | `app.config.ts` | Android manifest | Looks like **sensor** access without matching HC story | Tie to feature or remove | **Possible** policy question |
| **Training weekly “Active calories (Health Connect…)”** | **P1** | `TrainingHistoryView.tsx`; `active_energy` **not** in `HEALTH_CONNECT_DEFAULT_METRICS` | Training history | Implies HC calorie merge **Inference** user may never see it; if seen, may confuse reviewers reading code | Remove/reword unless adding `READ_ACTIVE_CALORIES_BURNED` with Play strategy | **Medium** trust + review perception |
| **No approval record after rejections** | **P1** | **Open** **OQ-2** | — | Unknown if latest **versionCode 8** was reviewed | Confirm in Console before assuming clean slate | Unknown outcome |
| **Privacy policy URL / support not proven in repo** | **P1** | **Open** **OQ-4**; `storeCompliance.ts` has default URL | Listing | Play requires accessible policy | Verify live URL + contact | **Possible** compliance fail |
| **HR spike uses Android without resting HR context** | **P2** | `fetchHeartRateContextSummary.ts`; `notificationTriggers.ts` | Mindfulness + notifications | Harder “minimum necessary” narrative | Strengthen listing: “optional spike nudges”; document gating | **Lower** legal risk; **medium** reviewer skepticism |
| **Telemetry + `user_id` to `app_logs`** | **P2** | `telemetry.ts` | Backend | Data safety accuracy | Declare collection; review `sanitizeLogPayload` coverage on all events | **Possible** Data safety issue if under-declared |
| **Play Integrity edge function deployment** | **P2** | **Open** **OQ-5** | `playIntegrity/monitor.ts` | Broken calls → odd behavior | Verify Supabase function | **Unlikely** HC block; **possible** functional flake |

---

## Play evidence quick map

| Rejection | Types cited as not required | Overlap with **current** manifest |
|-----------|----------------------------|-----------------------------------|
| First (2026-04-08) | Includes HR, SpO2, RR, body temp, steps, calories, exercise, RHR, HRV | **Overlaps** HR, SpO2, RR, body temp (**still declared**) |
| Second (2026-04-16), **version 7** | ActiveCaloriesBurned, Steps, TotalCaloriesBurned, RHR, HRV | **No overlap** — those reads **not** in current plugin |

**Inference:** Team narrowed Android HC toward sleep + overnight vitals + HR sample use; **declaration and listing must tell that story**.

---

*Blocker list is not exhaustive of all app bugs — only Play/policy/trust gates.*
