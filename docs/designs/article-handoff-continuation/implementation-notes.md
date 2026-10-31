# Article handoff continuation

Implemented from the approved plan on `codex/article-intake-completion`.

Independent EGM findings incorporated before coding:

- Intake needed durable shared versus article blocker state and explicit retry semantics.
- A fixed snapshot must resume the bound processing import before pending entries.
- Missing or mismatched import bindings must fail closed.
- Executor output errors must remain repair work; storage and dependency failures retain external handling.
- Reusing an existing LIVE import is idempotency evidence, not a fresh ingest-to-live test.

Verification evidence for this implementation is retained in the command output and the article-import run log. The real publication run remains a release gate after merge because it requires authenticated GitHub/Vercel operations and a non-LIVE snapshot source.
