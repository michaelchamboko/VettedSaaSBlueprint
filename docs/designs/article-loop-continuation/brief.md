# Approved brief: local article loop continuation

The existing article lifecycle remains unchanged. One selected local agent owns the current import packet, executes the bound work, writes the exact result atomically, verifies it, and resumes the same fixed snapshot until a verified terminal result or durable blocker.

The implementation is agent/model agnostic and local-only. It adds no scheduler, paid service, Durable Harness, model client, lifecycle stage, or second article orchestrator. Existing editorial, validation, release, review, deployment, rollback, and shared-failure gates remain authoritative.

Success is measured by a persisted canary that exercises multiple productive handoffs, one changed repair, one pending external dependency, and one restart with zero routine continuation prompts, duplicate release effects, false `LIVE` receipts, or bypassed gates.
