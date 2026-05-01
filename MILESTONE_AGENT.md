# Reclaim Agent Milestone – v2

## Goal
Automate safe improvements via PRs with proof (CI + tests), reducing regressions and stop/start friction. This may include features, updates, fixes, changes, integrations or advanced testing.

## Primary Truth Checks (must stay green)
- `cd app && npx tsc --noEmit`
- `cd app && npx vitest run`

## Guardrails (Never touch without explicit approval)
- DB schema/migrations
- Auth flow
- RootNavigator onboarding gating logic
- Core InsightEngine algorithms
- Training progression engine core logic
- Json Rule files - Always ask first
- Code structure - Unless absolutely neccessary

## Patch policy
- Default to Surgical Mode
- Deep Fix only after escalation triggers (see AGENT_RULES.md)

## Stop Feature
The agent must stop when:
- Primary truth checks are green AND
- Milestone checklist items are complete AND
- No open agent-created PRs remain

## Reporting
Each agent run must output:
- What was attempted
- What succeeded
- What is blocked and why
- Links to PRs and CI runs
- (Later) E2E screenshots/videos when UI changes
