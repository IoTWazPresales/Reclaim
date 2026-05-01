# Reclaim — launch-critical integrations (coherence lens)

**Framing:** What **must** work **together** for Reclaim to feel like **one integrated system** (not a kit of tools). **Not** the same as Play must-fix list.

---

## MUST WORK TOGETHER BEFORE LAUNCH

| Integration | Why it matters to identity |
|-------------|----------------------------|
| **`fetchInsightContext` ↔ mood + sleep + training data** | Without fresh, merged context, **insights.json** cross-domain rules are **dead** — core “brain” fails. |
| **Dashboard: sync → `refreshInsight`** | If health sync runs but insights **don’t** refresh, user sees **stale** interpretation vs data. |
| **Mood log / key actions → insight refresh** | Closes the **feedback loop** from behavior to interpretation (`Dashboard.tsx` mood path). |
| **Recovery card vs insight card — minimum clarity** | User must **not** see **contradictory** “next step” without explanation — either **align** CTAs or **scope** copy **Inference**. |
| **Daily signal notification ↔ top insight** | Same engine output; **preserves** “one interpretation” off-app (`dailySignalNotification.ts`). |

---

## SHOULD WORK TOGETHER BEFORE LAUNCH

| Integration | Why |
|-------------|-----|
| **Calendar slice ↔ insights + calendar nudges** | Context-aware nudges **should** align with rules using `calendar` fields. |
| **Health triggers ↔ mindfulness** | Deep link **should** land on a **consistent** intervention (`notificationTriggers.ts`). |
| **Meds adherence ↔ insights + recovery** | Same adherence signal; **both** use `medsContext` / recovery — **avoid** divergent numbers **Inference**. |
| **Training sessions ↔ insight rules** | Training+mood+sleep rules **should** fire when user trains — verify data freshness after session end. |

---

## CAN REMAIN LIGHTLY CONNECTED FOR V1

| Integration | Why acceptable |
|---------------|----------------|
| **Garmin / Huawei** | Placeholders — **not** core brain. |
| **Analytics tab** | Retrospective; **not** the live loop. |
| **Evidence / Moments** | Depth; **optional** path. |
| **iOS reactive HR parity with Android** | Documented PARTIAL — **defer** unified peripheral brain. |
| **Full routine remote sync** | Enhancement if local routines **work**. |
| **Optimize/thrive recovery “plan” rows** | `planSteps` in `recoveryCardMeta.ts` are **generic** — **OK** if earlier stages **solid**. |

---

*Aligns with `reclaim_launch_non_negotiables.md` (vision) — this file is **system coherence**.*
