# Ledger pending mutations

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
