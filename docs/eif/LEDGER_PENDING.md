# Ledger pending mutations

N-0056 add retry: rejected `maintenance` class corrected to supported `feature`; wrapper add succeeded. Do not replay the rejected variant. Earlier public schema probes remain diagnostic failures, not gate evidence.

Appended by `scripts/eif_node.py` on failure.

## 2026-09-20T15:40:58Z — node.status (run `R20260920D`)

Intended mutation that program.py rejected. Replay with the wrapper once fixed.

```json
{
  "event": "node.status",
  "payload": {
    "node": "N-0044",
    "expected_revision": 2,
    "to": "complete"
  }
}
```

Error:

```
program.py event node.status --payload-file C:\Users\WARREN~1\AppData\Local\Temp\eif-84gg0wa6.json failed (2):
ERROR QUALITY_GATE: QUALITY_GATE: N-0044 required dimensions/verification/acceptance incomplete
```

## 2026-09-20T20:11:38Z — node.quality (run `R20260920D`)

Intended mutation that program.py rejected. Replay with the wrapper once fixed.

```json
{
  "event": "node.quality",
  "payload": {
    "node": "N-0044",
    "expected_revision": 3
  }
}
```

Error:

```
program.py event node.quality --payload-file C:\Users\WARREN~1\AppData\Local\Temp\eif-t6yxcgnl.json failed (2):
ERROR QUALITY_DIM: QUALITY_DIM: dim required
```

## 2026-09-20T20:11:54Z — node.verify (run `R20260920D`)

Intended mutation that program.py rejected. Replay with the wrapper once fixed.

```json
{
  "event": "node.verify",
  "payload": {
    "node": "N-0044",
    "expected_revision": 3
  }
}
```

Error:

```
program.py event node.verify --payload-file C:\Users\WARREN~1\AppData\Local\Temp\eif-zfz7x5_a.json failed (2):
ERROR UNKNOWN_EVENT: UNKNOWN_EVENT: node.verify
```

## 2026-09-20T20:12:03Z — node.verification (run `R20260920D`)

Intended mutation that program.py rejected. Replay with the wrapper once fixed.

```json
{
  "event": "node.verification",
  "payload": {
    "node": "N-0044",
    "expected_revision": 3
  }
}
```

Error:

```
program.py event node.verification --payload-file C:\Users\WARREN~1\AppData\Local\Temp\eif-u4x5u4xm.json failed (2):
ERROR VERIFY_KIND: VERIFY_KIND: None
```

## 2026-09-20T20:12:20Z — node.verification (run `R20260920D`)

Intended mutation that program.py rejected. Replay with the wrapper once fixed.

```json
{
  "event": "node.verification",
  "payload": {
    "kind": "mechanical",
    "status": "pass",
    "evidence": [
      "EV-0017"
    ],
    "note": "Typecheck 0; 132 files/807 Vitest tests pass with 30-second timeout; dual-path 27/27; catalogue 357 rows/0 issues; wrapper 3/3. Self-verification only, not an independent reviewer.",
    "node": "N-0044",
    "expected_revision": 3
  }
}
```

Error:

```
program.py event node.verification --payload-file C:\Users\WARREN~1\AppData\Local\Temp\eif-qd7nd3mp.json failed (2):
ERROR VERIFY_KIND: VERIFY_KIND: mechanical
```

## 2026-09-20T20:41:10Z — add-node (run `R20260920D`)

Intended mutation that program.py rejected. Replay with the wrapper once fixed.

```json
{
  "event": "add-node",
  "payload": {
    "args": [
      "--id",
      "N-0056",
      "--title",
      "Restore bounded AVD dev-client journeys after repeat ANR",
      "--class",
      "maintenance",
      "--risk",
      "R1",
      "--criteria",
      "Restore a bounded, reproducible AVD + Metro boot using the installed debug client, without wiping existing user state or changing product semantics to bypass authentication.,Prove the actual app renders and responds to a safe input; capture screenshot and UI hierarchy with timeouts and binary-safe transfer.,Re-run affected N-0046/N-0047 journeys; startup error and ANR screenshots are blocker evidence, not product approval.,If the environment still cannot run after the prescribed single restart, record exact diagnostics and continue source-side; do not claim the journey passed."
    ]
  }
}
```

Error:

```
program.py add-node --id N-0056 --title Restore bounded AVD dev-client journeys after repeat ANR --class maintenance --risk R1 --criteria Restore a bounded, reproducible AVD + Metro boot using the installed debug client, without wiping existing user state or changing product semantics to bypass authentication.,Prove the actual app renders and responds to a safe input; capture screenshot and UI hierarchy with timeouts and binary-safe transfer.,Re-run affected N-0046/N-0047 journeys; startup error and ANR screenshots are blocker evidence, not product approval.,If the environment still cannot run after the prescribed single restart, record exact diagnostics and continue source-side; do not claim the journey passed. failed (2):
ERROR NODE_CLASS: NODE_CLASS: maintenance
```

## 2026-09-22T10:48:55Z — node.blocker.resolve (run `R20260922A`)

Intended mutation that program.py rejected. Replay with the wrapper once fixed.

```json
{
  "event": "node.blocker.resolve",
  "payload": {
    "type": "environment",
    "ref": "N-0056",
    "note": "Resolved by the repository's canonical npm run android workflow. Non-disruptive inspection confirmed emulator, package/PID/focused MainActivity, Metro HTTP 200, actual signed-in Home render, responsive Settings navigation, and binary-safe captures. Prior manual-APK socket/class errors are historical. See docs/eif/baseline/N0056_RETRY.md.",
    "node": "N-0056",
    "expected_revision": 5
  }
}
```

Error:

```
program.py event node.blocker.resolve --payload-file C:\Users\WARREN~1\AppData\Local\Temp\eif-sdm81uy7.json failed (2):
ERROR UNKNOWN_EVENT: UNKNOWN_EVENT: node.blocker.resolve
```
