# Authority-to-execution matrix

| Policy | Authority | Current consumer | Current behaviour | Disposition |
| --- | --- | --- | --- | --- |
| P-01 Source documents are product authority | AGENTS.md line 11; planning non-inference gate | Source manifest, canonical graph, Neon snapshot | Sources feed derived records without granting database authority | Aligned |
| P-02 planning.md is the only planning authority | AGENTS.md line 50; planning.md line 20 | BuildRunner execution state | Current state is derived from planning and approved sources | Aligned |
| P-03 Neon owns semantic persistence/query and code impact/navigation | planning.md lines 26–30 | SQL schema, graph builder, persistence adapter, impact query | One commit-bound semantic and code snapshot | Aligned, rollback test missing |
| P-04 Article work starts only by explicit manual/API trigger for a named run | AGENTS.md line 35 | external-article-import skill, import CLI, engine, package scripts | Unbound resume-pending advances all pending imports and is described as heartbeat work | Contradiction C-202 |
| P-05 A clean reviewed head merges and deploys automatically | AGENTS.md line 6 | release adapter, supervised executor, external-import skill, code-review skill | Runtime auto-merges; two skills require owner merge or forbid automatic merge | Contradiction C-201 |
| P-06 UI work uses design-taste-frontend and Impeccable | AGENTS.md lines 60–64 | landing-page-production-orchestrator skill | Orchestrator requires only Impeccable | Contradiction C-203 |
| P-07 Retired scheduled programme cannot regain execution | AGENTS.md lines 30–35; planning.md line 14 | requirement mapper and retirement tests | Retired requirements remain unmapped | Aligned |
| P-08 Full editorial and independent review receipts remain mandatory | AGENTS.md line 39; release contracts | article import approval and release code | Receipt binding and exact-head review are enforced | Aligned |
| P-09 Database apply requires an explicit connection | AGENTS.md line 42 | BuildRunner graph sync and sync script | Apply fails without an explicit environment-provided connection | Intentional operational distinction |
| P-10 Manual or API runs remain authenticated, idempotent, observable, retryable, and off public request paths | AGENTS.md execution workflow item 7; Plan 1 P2-005 | package scripts, import CLI, engine, supervised executor, local release adapter, recovery/release tests | Current trigger is a local manual CLI, not a public API route; durable atomic state, stage idempotency keys, leases, failure stages, retries, and authenticated GitHub/Vercel release adapters exist. Unbound bulk resume contradicts the named-run boundary | Aligned except C-202; any future API route requires authentication and separate evidence |

## Plan 1 P2-005 disposition

- Receipt enforcement is covered by P-08 and the release/presentation negative tests.
- The current trigger surface is local CLI execution in the primary checkout. No `src/app` route imports the article-import engine, so no API capability is claimed and authoring remains outside latency-sensitive public requests.
- Atomic state files, stage-scoped idempotency keys, leases, explicit waiting/failure states, recovery strategies, and retry tests provide the current observability, idempotency, and retry evidence.
- GitHub and Vercel release operations use authenticated local adapters. A future API trigger would need an authenticated boundary before it could be accepted.
- C-202 carries the one remaining enforcement mismatch: bulk `resume-pending` must be removed so continuation always names an existing run.
