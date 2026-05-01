# Reclaim — orchestration overlap matrix

| Overlap | What each system does | Healthy or problematic? | Severity | Recommendation |
|---------|------------------------|-------------------------|----------|----------------|
| **Insights vs Recovery** | **InsightEngine** ranks rule matches; **recoveryCardMeta** ranks stage steps / CTA | **Problematic** for **single** “next action” — two authorities | **High** | **Clarify** product: which owns primary CTA; **defer** code merge |
| **Routines vs Recovery** | Routines: templates/suggestions/overlay; Recovery: stage progression | **Parallel** — both “plan” life | **Medium** | **Clarify** hierarchy; **defer** merge |
| **Notification families** | `NotificationScheduler` (routine reminders), training schedulers, health triggers, daily signal | **Healthy** if **reconcile** is single sink; **risk** of **competing** pings | **Medium** | **Keep** reconcile; **audit** caps per `reclaim_system_coherence_audit` |
| **Dashboard local logic vs shared** | `Dashboard` invalidates + refreshes insights; **insights** don’t invalidate other screens automatically | **Normal** for RN; **risk** of **stale** non-home screens | **Low–Medium** | **Inference:** focus/refresh patterns |
| **Sync vs surface refresh** | `SyncCoordinator` runs sync + `reconcileNotifications`; **Dashboard** runs `invalidateQueries` + `refreshInsight` | **Overlap** — both refresh after sync | **Medium** | **Healthy** if order is consistent; **document** contract |
| **useNotifications vs SyncCoordinator** | Both call `reconcileNotifications` | **Intentional** duplication — **idempotent** reconcile **Inference** | **Low** | **Keep**; watch for **double** work on boot |
| **Background sync vs foreground** | `backgroundSync` + coordinator | **Parallel** entry points | **Low** | **Keep** cooldowns |

---

## Summary

| Pattern | Assessment |
|---------|------------|
| **`reconcileNotifications` as sink** | **Good** — multiple producers, one reconciler |
| **Dual prioritizers (insight + recovery)** | **Ambiguous** — product decision |
| **Dashboard as orchestration hub** | **Powerful but not reusable** — **formalization** candidate |

---

*See `reclaim_existing_orchestrator_candidates.md`.*
