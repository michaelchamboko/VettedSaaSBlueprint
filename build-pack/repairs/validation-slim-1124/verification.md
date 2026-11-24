## Changes
Presentation notes can describe observations without naming the desktop and mobile viewports. The existing checks for unavailable inspections and the structured browser evidence still apply.

The research validator and assessment-input builder each hash and decode one buffer per retained source. JSON evidence readers and hash-only verification use the same byte verifier.

## Evidence
Before the change, a 13-source sample required 26 snapshot reads in each caller. Afterward each caller performed 13 reads, and the serialized source snapshot payload retained the same SHA-256. Descriptive notes without viewport names passed; a note reporting an unavailable check failed.

Focused regressions cover notes, mismatched hashes, changed source bytes, unsupported excerpts, stale assessment bindings and pricing context. Browser checking, commercial verification and editorial pass logic have no behavioral changes.

Rollback is a revert of this change. There is no state migration.
