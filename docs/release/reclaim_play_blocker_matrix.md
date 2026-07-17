# Reclaim — Play blocker matrix

**Refresh:** 2026-07-17  
**Severity:** **P0** = likely rejection or misleading compliance; **P1** = high risk; **P2** = trust/review quality.

| Blocker | Severity | Evidence | Affected files / surfaces | Why it matters | Recommended action | If unresolved at resubmit |
|---------|----------|----------|---------------------------|----------------|--------------------|----------------------------|
| **Console declaration / Data safety unknown vs APK** | **P0** | **Open** **OQ-1**; past rejections on **minimum scope** | Play Console (not in repo); `withHealthConnectPermissions.js`, `healthConnectService.ts` | Google compares **declared** types + **visible** features to **manifest** | Export forms to `docs/memory/raw/play-console/`; reconcile every HC line | **Likely** repeat rejection |
| **Steps + ActiveCalories re-declared after second rejection cited them** | **P0** | Plugin now has `READ_STEPS` + `READ_ACTIVE_CALORIES_BURNED`; second letter named those types | `withHealthConnectPermissions.js`; training finish kcal; HR nudge steps gate | Reviewer may treat as relapse to over-scope | Declare + justify narrowly **or** remove until strategy ready | **High** rejection risk |
| **Internal health coverage doc vs plugin** | **P0** | Must match plugin | `app/Documentation/HEALTH_API_COVERAGE.md` | Wrong doc → wrong Console paste | Keep synced (refreshed 2026-07-17) | **High** mismatch risk |
| **First rejection mapped HR, SpO2, RR, body temp as “excessive”** | **P1** | `raw/play-console/2026_04_08_*.md` | Manifest still includes these **read** permissions | Reviewer may re-apply if features look thin | Ensure Sleep UI + listing show justification | **Possible** rejection |
| **Default connect omits steps/calories while manifest declares them** | **P1** | `HEALTH_CONNECT_DEFAULT_METRICS` vs plugin | Connect flow vs session/nudge paths | Confusing “when is it requested?” story | Document feature-path requests in Console; or unify bundles | Medium–high reviewer skepticism |
| **No approval record after rejections** | **P1** | **Open** **OQ-2** | — | Unknown if versionCode 8 reviewed | Confirm in Console | Unknown outcome |
| **Privacy policy URL / support not proven in repo** | **P1** | **Open** **OQ-4**; `storeCompliance.ts` | Listing | Play requires accessible policy | Verify live URL + contact | **Possible** compliance fail |
| **HR spike / overnight HR proxy narrative** | **P2** | `fetchHeartRateContextSummary`; overnight proxy on Android | Mindfulness + notifications | Harder “minimum necessary” story | Listing: optional spike nudges; document gating | Medium reviewer skepticism |
| **Telemetry + `user_id` to `app_logs`** | **P2** | `telemetry.ts` | Backend | Data safety accuracy | Declare collection; sanitizer coverage | Possible Data safety issue |
| **Play Integrity edge function** | **P2** | **Open** **OQ-5** | `playIntegrity/monitor.ts` | Broken calls → odd behavior | Verify Supabase function | Unlikely HC block |

---

## Play evidence quick map

| Rejection | Types cited as not required | Overlap with **current** manifest (2026-07-17) |
|-----------|----------------------------|-----------------------------------------------|
| First (2026-04-08) | Includes HR, SpO2, RR, body temp, steps, calories, exercise, RHR, HRV | **Overlaps** HR, SpO2, RR, body temp, **steps**, **active calories**, **exercise write** |
| Second (2026-04-16), **version 7** | ActiveCaloriesBurned, Steps, TotalCaloriesBurned, RHR, HRV | **Overlaps** ActiveCaloriesBurned + Steps (**re-introduced**); RHR/HRV/total calories still **not** declared |

**Inference:** Pass-1 posture was “narrow sleep+vitals+HR.” Training-confident work **re-widened** steps + active calories. Production resubmit needs a **new** Console story — not the version-7 “we removed those” narrative.

### Stale notes removed

- `ACTIVITY_RECOGNITION` is **not** in current `app.config.ts` — prior matrix rows assuming it are obsolete.
- Training calorie UX is no longer “dead for Play build” if `READ_ACTIVE_CALORIES_BURNED` ships — but Console must match.

---

*Blocker list is not exhaustive of all app bugs — only Play/policy/trust gates.*
