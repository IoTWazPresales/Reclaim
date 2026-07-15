# Training follow-up audit (post X-26)

**Date:** 2026-07-15  
**Branch at audit:** `chore/reclaim-uiux-audit-pilot` @ `3545d42`  
**Scope:** X-11 week labels, guided Wear notifications, Health Connect calories, deep links, HR nudges, movement diagrams, stale timeout  
**Status:** Diagnosis only in the audit chat. Confident low-risk fixes landed on a follow-up branch (see handover).

---

## Training step-0 clear

Handover + remediation log read; branch confirmed; no edits during audit.

---

## Findings summary

| Area | Verdict | Confidence | Touches guided SET_DONE pipeline? |
|------|---------|------------|-----------------------------------|
| Rest-complete **to** Wear works | Outbound alarm path (`scheduleGuidedTrainingAfterSetPersist` → intents → OS → Wear) | High | No — leave alone |
| Wear **Done** often does not advance phone | Inbound JS fragile: delivery + mark-before-persist + rest UI via nav params only | High architecture / medium which mode dominates on device | **Yes — hold for Phase 0 logs** |
| HC / session calories | Write-on-finish only; no live workout; `active_energy` not in default HC grant | High | No |
| Full Plan jump vs notifs | Cursor-only; chain = first pending set | High | Yes if rescheduled — **hold** |
| Extra confirm after Done | Path-dependent (overlay / Log Set), not profile gate | High | Hold |
| 5h close-and-save notif | In-app stale dialog at **6h** only; no proactive push | High | Threshold change safe; push **hold** |
| Meditation / mindfulness deep links | Meditation consumer exists; Mindfulness ignores params; type fallbacks weak | High | No (separate types) |
| Elevated HR stress nudge | Code exists; Android resting baseline always empty → never fires | High | No |
| Stick-man diagrams | Pattern-family SVG, not form coaching | High | Hold (needs assets) |
| X-11 week labels | Dual sources: `week_index` vs calendar `weekNumber` | High | No |

---

## Guided Done — recommended phases (not started in confident fix)

0. Device log matrix (`[WATCH_ACTION_DELIVERY]`, `[GUIDED_NOTIF_ACTION]`, navRef, external rest reject)  
1. Durable pending rest transition / cursor rest fields; drain on mount  
2. Idempotency mark after persist+schedule  
3. Optional foreground wake trade-off  
4. Canonical single transition for UI / phone / Wear Done  

Do not rewrite `scheduleGuidedTrainingAfterSetPersist` or reconciler bodies while fixing Done — that is the working outbound path.

---

## X-11 authority decision

**Authority for “Week N” copy:** `programDay.week_index` (planner SSOT).  
Calendar math from `start_date` may remain for date-range chrome only.

---

## Related docs

- `docs/handover/ui-excellence-post-x26-handover.md`
- `docs/audits/remediation-log.md`
- `docs/handover/training-confident-fixes-handover.md` (post-fix branch)
