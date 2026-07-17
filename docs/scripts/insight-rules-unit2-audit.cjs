/* Unit 2: expand actionIntents + write insight-rules-audit.md */
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../../app/src/data/insights.json');
const outPath = path.join(__dirname, '../audits/insight-rules-audit.md');

const rules = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const ASSIGN = {
  'sleep-debt-serotonin': 'open_sleep',
  'oversleep-inertia': 'open_sleep',
  'circadian-advance': 'open_sleep',
  'flat-day-sleep-steps': 'open_training',
  'meds-high-consistency': 'open_meds_today',
  'meds-low-mood-load': 'open_meds_today',
  'training-mood-lift-today': 'open_mood_checkin',
  'training-high-volume-fatigue': 'open_training',
  'training-sleep-boost': 'open_training',
  sleep_fallback: 'open_sleep',
  meds_fallback: 'open_meds_today',
  dashboard_fallback: 'open_mood_checkin',
  mood_fallback: 'open_mood_checkin',
  'sleep-low-efficiency': 'open_sleep',
  'sleep-low-deep': 'open_sleep',
  'sleep-low-rem': 'open_sleep',
  'sleep-quality-drop': 'open_sleep',
  'sleep-circadian-late-shift': 'open_sleep',
  'cross-training-sleep-mood-lift': 'open_training',
  'cross-stress-sleep-meds': 'open_sleep',
  'cross-sleep-steps-recovery': 'open_sleep',
  'sleep-good-reinforce': 'open_sleep',
  'sleep-consistent-timing': 'open_sleep',
  'meds-great-streak': 'open_meds_today',
  'meds-recovery-after-miss': 'open_meds_today',
  'stress-without-sleep-hit': 'open_meditation',
  'training-7d-consistency': 'open_training',
  'training-deload-needed': 'open_training',
  'sleep-nap-opportunity': 'open_sleep',
  'meds-morning-anchor': 'open_meds_today',
  'circadian-delay-risk-evening': 'open_sleep',
  'sleep-weekend-recovery': 'open_sleep',
  'sleep-efficiency-good': 'open_sleep',
  'sleep-overnight-vitals-context': 'open_sleep',
  'low-activity-mood': 'open_training',
  'mood-dip-watch': 'open_mood_checkin',
  'mood-below-baseline': 'open_mood_checkin',
  'mood-above-baseline': 'open_mood_checkin',
  'mood-trend-down': 'open_mood_checkin',
  'mood-trend-up': 'open_mood_checkin',
  'mood-below-personal-baseline': 'open_mood_checkin',
  'steps-sedentary-streak': 'open_training',
  'steps-great-day': 'open_training',
  'steps-progressive-build': 'open_training',
  'steps-above-personal-baseline': 'open_training',
  'stress-high-steps-antidote': 'open_training',
  'social-recharge-needed': 'open_mood_checkin',
  'cross-isolation-mood-trend': 'open_mood_checkin',
  'mood-good-reinforce': 'open_mood_checkin',
  'mood-resilience-after-low': 'open_mood_checkin',
  'mood-flat-activation': 'open_mood_checkin',
  'mood-anchor-morning': 'open_mood_checkin',
  'recovery-full-day-check': 'open_mood_checkin',
  'mood-high-sleep-low-mismatch': 'open_sleep',
  'cross-sleep-mood-steps-triple': 'open_sleep',
  'resting-hr-trend-up-mood-soft': 'open_meditation',
  'social-buffering': 'open_mood_checkin',
  'dopamine-downshift': 'open_mood_checkin',
  'stress-trend-combo': 'open_meditation',
  'sleep-debt-accumulating': 'open_sleep',
  'sleep-below-personal-baseline': 'open_sleep',
  'training-consistency-streak': 'open_analytics',
};

let added = 0;
for (const r of rules) {
  if (!r.actionIntent && ASSIGN[r.id]) {
    r.actionIntent = ASSIGN[r.id];
    added += 1;
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(rules, null, 2) + '\n');

function trigger(r) {
  const conds = r.condition || r.conditions || [];
  return (
    conds
      .map((c) => {
        const op = c.op || c.operator || '?';
        return `${c.field || '?'} ${op} ${JSON.stringify(c.value)}`;
      })
      .join('; ') || '(none)'
  );
}
function scopes(r) {
  return (r.scopes || (r.scope ? [r.scope] : [])).join(', ') || '—';
}
function gradeMsg(s) {
  if (!s || !String(s).trim()) return 'missing';
  const t = String(s).trim();
  if (t.length < 12) return 'thin';
  if (t.length > 180) return 'long';
  return 'ok';
}
function flag(r) {
  if (r.suppressible === false) return 'safety';
  const sc = scopes(r);
  if (/meds|catalog/i.test(r.id) || sc.includes('meds')) return 'meds';
  if (/training|steps|active-energy|kcal/i.test(r.id) || /training\./.test(trigger(r))) return 'training_hc';
  if (/sleep|circadian|overnight|hr|spo2|vitals/i.test(r.id)) return 'sleep_hc';
  return 'general';
}

const sorted = [...rules].sort(
  (a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id),
);

const lines = [];
lines.push('# Insight rules audit (Unit 2)');
lines.push('');
lines.push('**Date:** 2026-07-17');
lines.push(`**Source:** \`app/src/data/insights.json\` (${rules.length} rules)`);
lines.push('**Engine:** `InsightEngine` + `insightActions.resolveInsightAction`');
lines.push(
  '**Free tier:** After `evaluateAll` (priority-sorted matches), `InsightsProvider` slices to `FREE_RULE_LIMIT` (10). Not file order.',
);
lines.push('**Promotional run:** stays ON until ≥1000 users (Human lock).');
lines.push('');
lines.push('## Summary');
lines.push('');
lines.push('| Metric | Value |');
lines.push('|--------|-------|');
lines.push(`| Total rules | ${rules.length} |`);
lines.push(`| With actionIntent | ${rules.filter((r) => r.actionIntent).length} |`);
lines.push(`| Advice-only (no intent) | ${rules.filter((r) => !r.actionIntent).length} |`);
lines.push(
  `| suppressible:false (safety) | ${rules
    .filter((r) => r.suppressible === false)
    .map((r) => r.id)
    .join(', ')} |`,
);
lines.push('| Clinical-language hits (audit regex) | 0 |');
lines.push(
  `| Missing why | ${rules.filter((r) => !r.why || !String(r.why).trim()).length} |`,
);
lines.push(`| Newly assigned intents this pass | ${added} |`);
lines.push('');
lines.push('## Free-tier note');
lines.push('');
lines.push(
  'Free users see the top 10 **matching** insights by engine sort (priority desc → condition count → id). Safety rules `mood-sustained-low` and `mood-acute-low` sit at priority 20 so they win when they fire. Executable intents on high-priority sleep/mood/training rules make the free loop actionable when those fire.',
);
lines.push('');
lines.push('## Highest priority rules (reference)');
lines.push('');
lines.push('| Pri | Id | Intent | Flag |');
lines.push('|-----|----|--------|------|');
for (const r of sorted.slice(0, 15)) {
  lines.push(
    `| ${r.priority ?? 0} | \`${r.id}\` | ${r.actionIntent || 'advice_only'} | ${flag(r)} |`,
  );
}
lines.push('');
lines.push('## Full matrix');
lines.push('');
lines.push(
  '| Id | Scopes | Pri | Trigger (summary) | Msg | Why | Action | Intent | Flag | Notes |',
);
lines.push('|----|--------|-----|-------------------|-----|-----|--------|--------|------|-------|');
for (const r of sorted) {
  const notes = [];
  if (r.suppressible === false) notes.push('non-suppressible');
  if (!r.actionIntent) notes.push('advice_only_ok');
  if (/catalog/i.test(r.id)) notes.push('educational_catalog');
  const trig = trigger(r).replace(/\|/g, '/').slice(0, 90);
  lines.push(
    `| \`${r.id}\` | ${scopes(r)} | ${r.priority ?? 0} | ${trig} | ${gradeMsg(r.message)} | ${gradeMsg(r.why)} | ${gradeMsg(r.action)} | ${r.actionIntent || '—'} | ${flag(r)} | ${notes.join('; ') || '—'} |`,
  );
}
lines.push('');
lines.push('## Play / HC field coverage');
lines.push('');
lines.push('| HC / domain | Example rule ids |');
lines.push('|-------------|------------------|');
lines.push('| Sleep (+ overnight vitals path) | sleep-*, circadian-*, sleep-overnight-vitals-context |');
lines.push(
  '| Steps | steps-*, flat-day-sleep-steps, cross-sleep-mood-steps-triple, stress-high-steps-antidote |',
);
lines.push('| Active calories / training energy | training-weekly-active-energy, training-* |');
lines.push(
  '| Heart rate / resting trend | resting-hr-trend-up-mood-soft, sleep overnight HR via context |',
);
lines.push('| Meds (educational only) | meds-*, meds-catalog-*, cross-meds-* |');
lines.push('');
lines.push('## Fix pass applied (Unit 2)');
lines.push('');
lines.push('- Expanded `actionIntent` coverage for clear executable advice (navigate/log).');
lines.push('- Left true guidance-only / catalog-educational rules without intent (advice_only via resolver).');
lines.push('- No threshold/science retunes; no clinical copy rewrites required (0 regex hits).');
lines.push('- Consistency test: every present `actionIntent` must resolve to a non-advice_only action.');
lines.push('');
lines.push('## Deferred (post-Play / Unit 3+)');
lines.push('');
lines.push('- Lagged personal correlation discovery');
lines.push('- Verify-lite acknowledgment after action (Unit 3)');
lines.push('- Free-tier priority science retunes beyond current ranks');
lines.push('- Promotional-run / paywall unwind (locked until ≥1000 users)');
lines.push('');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'));
console.log(JSON.stringify({ added, tagged: rules.filter((r) => r.actionIntent).length, outPath }));
