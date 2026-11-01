# Operator provenance decision - 2026-11-01

Operator explicitly accepted provenance by elimination and authorized proceeding: no published Android update exists for runtime 1.0.5 on any branch; update requests are rejected for missing channel, so none can be downloaded/cached for this runtime; embedded bundle, source-identical to 0cecd15, is accepted as the only launchable code. This is the operator's accepted provenance basis, not a claim that launch logs explicitly identified the embedded bundle. Prior raw evidence and limitations remain intact.

Release finding (record only, do not fix): updates are enabled but no channel is configured in this installed build; production OTA cannot be delivered with that configuration. Cold-start update requests confirm missing channel-name rejection. No EAS or app configuration changes authorized/performed.

Authorization: Monday-Friday is real schedule; preserve Strength, goals, experience, equipment and baselines; report before saving. Continue bounded steps 3-8, including ceiling vs working-weight interpretation and at most one logged set followed by Cancel & delete. Stop on a finding needing code changes. No broad programme or production deployment approval.
