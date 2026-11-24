# Approval receipt verification

An instrumented run of the existing synthetic test "validates approved binding in development" counted opens of its private approved.json fixture. The probe observed both Node filesystem read functions and forwarded every call.

| Implementation | Synchronous reads | Asynchronous reads | Preview result |
| --- | ---: | ---: | --- |
| Original implementation at ada8bad | 1 | 1 | Passed |
| Approval-owned snapshot | 0 | 1 | Passed |

The regression "approval verifies the loaded snapshot after its file changes" loads the approved JSON, replaces the synthetic file, and checks the original snapshot against the recorded evidence. The original snapshot passes. A fresh preview rejects the changed file.

The digest-only historical receipt regression exercises both supported positional argument orders. It also checks that an object with nested identity and root fields cannot authenticate a historical receipt through the compatibility entry point.

Both regressions passed on Node 24.22.3. The tests use temporary synthetic imports.
