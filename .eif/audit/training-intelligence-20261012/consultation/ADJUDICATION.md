# Consultation and independence receipt

Status: **external consultation attempted, no external critique received**. This limitation does not invalidate reproduced source defects, but prevents claiming separate-model verification or domain certification.

Three separate Codex subagents actually executed: `training_logic` (algorithm/domain), `product_architecture` (product/red-team/architecture/journey), and `framework_process` (incident/process/runtime/evidence). These are three executors using several contracts, not one independent reviewer per skill. They inherited parent context. The product agent subsequently re-executed the other agents' probes and inspected primary sources; this is separate-executor, same-model cross-checking, not blind external review. Their reports and verification-deltas record what they received, performed and concluded. Model identities beyond the available runtime metadata are not invented.

An external route was discovered: authenticated Claude Code2.1.295. The saved `request.txt` contained the framework/product reports, selected raw source excerpts and synthetic probe output. No secrets or live account data were included. Requested model alias: `opus`; actual resolved inference model is unknown because no inference occurred. Tools, customizations, MCP and session persistence were disabled. The request hash is in `request-sha256.txt`; `prepare_consult.py` reproduces the packet and `run_consult.py` the invocation.

Attempts:

1. An initial shell quoting invocation failed locally with “Input must be provided”; no model request was completed and no response artifact resulted.
2. Direct executable invocation failed with ECONNREFUSED. Saved `attempt1-response.json` and `attempt1-receipt.json`: zero input/output tokens, API error, no critique.
3. The authorized outside-sandbox retry reached the service but returned HTTP429 `usage_limit_reached`: weekly limit, reset reported as October14 15:00 Africa/Johannesburg. Saved `response.json`, `receipt.json`, `stderr.txt`: zero input/output tokens and empty modelUsage. This is not an approval-review rejection and not a successful consultation.

No model-switching, alternate account, credentials or quota bypass was attempted. There are no external findings to adjudicate. The operator can supply the consolidated report and evidence bundle to ChatGPT or a qualified reviewer; that future review must not be backdated into this audit.

## Actual internal challenge dispositions

- Accepted: repeated exercise/week structures are not inherently poor science; narrowed longitudinal claim to missing coherent accepted policy and demonstrated progression defects.
- Accepted: no ledger independence receipt does not establish no historical review; all-gov-001 actor values are explained by wrapper behavior.
- Accepted: upstream pure-function gate results are not installed-runtime or full-public-event certification.
- Accepted: floor-only fixtures prove algorithm behavior, not account incidence or approved product support; system must either support or explicitly reject such configuration.
- Accepted: experience affects loads even when balanced slot/set structure stays the same.
- Accepted: one logged-set progression is not universally wrong; the missing prescribed-work completeness context prevents proper qualification.
- Accepted: template families alone are insufficient; the existing defective path is itself a curated recipe approach. Common contracts, feasibility, stable identity, versioning and independent programme acceptance are necessary.
- Accepted: clinical harm, unauthorized historical approval, current Android mismatch and Wear load mismatch are not established.

Final report status: **source/evidence findings verified with limitations; external model and qualified exercise-domain acceptance outstanding**. Implementation remains stopped at the operator direction gate.
