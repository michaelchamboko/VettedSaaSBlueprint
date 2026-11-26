# Agent Operating Contract

<!-- build-faster-skills:workflow:start -->
## Mandatory build-faster workflow

Every repository-changing task—including pages, components, content, configuration, automation, and fixes—must use these four mandatory beats: **Isolate** in a fresh branch/worktree from `origin/main` after the scope check; **Build** with the `code-structure` service-layer guidance where shared mechanics apply; **Prove** with repository checks plus runtime before/after evidence; and **Ship** through a PR with before-and-after evidence and an independent current-head Codex code review. When the exact reviewed head passes every required gate, merge and deploy automatically; owner approval is not a release prerequisite. Run `unslop` on human-facing text. Read-only analysis is excluded. The workflow is subordinate to this repository's planning authority, non-inference gate, automation contract, source-intelligence requirements, and other repository-specific gates.

For UI changes, use both `design-taste-frontend` and the project-local Impeccable skill, including their required context and critique/audit/detect checks. Every repository change must pass `npm run verify:agent-workflow`, `npm run lint`, and `npm run typecheck`. For corrections, run only the tests that exercise the changed behavior and its directly affected callers. Select individual test cases or files and skip the full suite and full end-to-end flow. For other repository changes, run `npm test`. Add `npm run build`, `npm run validate:public-site`, and the applicable stage or release gates when the changed surface requires them. Record before/after evidence whenever runtime behavior changes.
<!-- build-faster-skills:workflow:end -->

This repository is the local Spec Kit, implementation, and deployment workspace for Vetted SaaS B. The source strategy documents remain the product authority; implementation proceeds here through small, verifiable vertical slices.

## Active phase

- Document-intelligence foundation work is complete.
- Global Setup was a one-time initializer and is no longer part of the execution path.
- Phase One must produce one connected Decision Hub, Solution Hub, and Decision Scenario, then deploy and verify them on Vercel.
- No later-phase automation programme is active. Future automation requires a new explicit product-owner directive and planning amendment.
- Prefer the smallest deployable slice. A successful phase ends with working URLs and recorded verification evidence.

## Non-inference gate

- Cite an exact source document, heading, and stable source identifier before treating a statement as a repository fact.
- Label user directives, inferences, proposals, and external evidence explicitly.
- Do not convert silence into a requirement or prohibition.
- Keep conflicts unresolved until the product owner deliberately adjudicates them.
- Do not reinterpret reduced-motion requirements as minimal motion.
- Do not weaken commercial intent or let it silently override evidence, disclosure, ranking independence, or anti-deception requirements.

## Automation retirement and non-deviation rule

- The retired multi-stage automation programme has no active runner, schedule manifest, tracked prompts, BuildRunner packet, or release authority. Do not recreate a prerequisite, service, schedule, release channel, workflow stage, or capability by inference.
- Before proposing new automation, inspect `AGENTS.md`, `planning.md`, and the source-intelligence records. Source strategy language and historical receipts do not reactivate retired work.
- Ask the product owner only when a specific, documented stage cannot proceed because a required authority, input, or external state is genuinely absent. State that exact blocker and no invented remedy.
- The article-to-page workflow runs only from an explicit manual or API trigger in the primary checkout. Scheduled execution and secondary-worktree execution are prohibited. A trigger must not weaken evidence, receipt, quality, review, or deployment gates.
- A manual intake start snapshots the regular Markdown/text files present in `Article Intake` at start time. The snapshot is immutable; later files wait for the next start. The supervising agent processes entries in stable filename order, executes every recorded action through verified publication, then advances to the next entry. Article-specific blockers are recorded and skipped; shared Git, credential, editorial-tool, or deployment failures stop the run. A processing pass can finish with exceptions; it is not an all-published result.

## Repository boundaries

- Owner directive for supervised authoring: after evidence-backed drafting and before candidate validation, complete the mandatory full-article workflow in `.agents/skills/eleanor-editorial/SKILL.md`. This covers DecisionSetV2, direct-review landing blueprints, VisibilityPageV1 and individual BlogPostV1 records. Rewrite every editable prose field through all three SlopMonster passes, require an independent editorial review in a verified context separate from every rewrite session, using any tool and model, run the final fidelity review, and require a 5/5 CLEAN result. Save `EditorialEvidenceV2` under `build-pack/editorial`; preserve protected fields and semantic meaning; reuse it only for an unchanged artifact fingerprint and revision. A partial cleanup or missing pass cannot proceed. Retain the original policy and evidence for historical receipts. This does not authorise schedules, automated publication, or a change to source strategy.

- `docs/document-intelligence/` remains the reviewable semantic source layer. Neon schema `repository_intelligence_v1` stores document, section, claim, directive and finding relationships for semantic queries and impact analysis; it is evidence, not product authority.
- Produce a deterministic snapshot with `npm run intelligence:sync`. Apply it only with an explicit database connection through `npm run intelligence:sync:apply`, then query bounded impact with `npm run intelligence:impact -- --snapshot <sha256> --node <id> --depth <0-8>`.
- Document snapshots bind their Git commit, source-manifest digest, graph digest, node count and edge count. Code relationships belong only to codebase-memory-mcp. Historical mixed Neon snapshots remain retained, but active queries exclude code and import relationships.
- Source strategy documents remain unchanged unless the product owner separately approves an amendment.
- Existing external VettedSaaSBlueprint code and deployments are migration context, not implementation authority.
- Do not create or retain an authoritative `CLAUDE.md`.

## Execution workflow

1. Select the smallest dependency-ready BuildRunner packet embedded in `planning.md` and materialised in `build-pack/execution-state.json`; `planning.md` is the only planning authority.
2. Read the slice's exact source sections and stable identifiers before implementation.
3. Before impact-sensitive code work, follow Code Intelligence below. For source-authority changes, build the document snapshot from the selected checkout and confirm its commit and digests. Use direct source inspection, `rg`, TypeScript imports, route inventories, and affected-test checks alongside graph results. Commercial activation remains fail-closed until licence rights are recorded.
4. Implement the slice with its automated checks and production-facing acceptance criteria.
5. Deploy Phase One and later release slices to Vercel through the repository deployment configuration.
6. Verify the deployed URLs independently of worker self-reporting and record the deployment receipt.
7. Keep manual and API-triggered runs authenticated, idempotent, observable, retryable, and outside latency-sensitive public request paths.

## Mandatory frontend design workflow

- Every agent and model that creates or changes a page, component, layout, typography, styling, or motion must use both `design-taste-frontend` and the project-local Impeccable skill. This applies to manual and API-triggered page-building runs as well as interactive work; do not treat either as optional inspiration.
- Before implementation, read `C:/Users/micha/.agents/skills/design-taste-frontend/SKILL.md` (or the checkout copy if provisioned), state its one-line Design Read, and choose a page-type direction using the approved visual references and dials in D04 §6.2 (`D04-S-c5113e3d7e2d`) and D04 §32 Stage 4 (`D04-S-1daaf8613a03`). Preserve the established site identity unless the approved brief calls for a redesign.
- Before a UI edit, run `.agents/skills/impeccable/scripts/impeccable.cmd context --target <source-file-or-route>` from the repository root, follow its project context, and read `.agents/skills/impeccable/reference/craft-floor.md`. If the launcher is unavailable, follow the Impeccable skill's documented fallback and report that the detector did not run.
- After rendering, inspect desktop and mobile together; run `.agents/skills/impeccable/scripts/impeccable.cmd critique <target>`, `audit <target>`, and `detect <target>` for the changed surface, correct the findings in one bounded pass, then confirm once. Preserve content, evidence, responsive behavior, accessibility, and reduced-motion requirements. Do not claim a design pass from a clean mechanical detector alone.
- Keep both skills available to page-building runs: `design-taste-frontend` is installed at `C:/Users/micha/.agents/skills/design-taste-frontend/SKILL.md` (or `.agents/skills/design-taste-frontend/SKILL.md` when provisioned in the checkout); Impeccable must be installed at `.agents/skills/impeccable/SKILL.md` with its local launcher. Check these paths before page work and restore a missing skill before proceeding. Use the Impeccable project hook after user approval in Codex `/hooks`.

## Source-intelligence workflow

Run this workflow when source documents or their derived intelligence change:

1. Regenerate the source inventory with `powershell -NoProfile -File scripts/build-document-inventory.ps1`.
2. Verify `docs/document-intelligence/SOURCE_MANIFEST.json` and `DOCUMENT_INVENTORY.md` cover the same source files and headings.
3. Use direct source inspection for semantic conclusions.
4. Record cross-document relationships and unresolved findings in the explicit relationship map.
5. Run `scripts/verify-document-intelligence.ps1`, then the stable-UID impact command before proposing a later document amendment. Commit-delta detection remains unavailable while the baseline commit is deferred.

When semantic records or their relationships change, verify the SQL migration, rebuild the deterministic document snapshot, inspect its counts and digests, and validate a known semantic path on an isolated Neon branch before applying the migration or snapshot to production. Verify code paths through codebase-memory-mcp and source inspection; Neon code-import traversal is retired. Never treat a database row as stronger authority than its cited source section.

## Article handoff continuation

The mandatory sequence and machine-readable rule registry are exposed by `npm run import:article -- --describe-workflow`. Read that output and run `--preflight` before a future authorized article trigger. Evidence research precedes a complete draft and intent/SEO/AEO assessment; Eleanor's full workflow precedes final assessment and approval; design/browser validation precedes release; retained production proof precedes LIVE. Work packets include the exact result schema. Missing work is not a reason to skip an article.

New automation records use workflow version 2. Historical records remain inspectable; never edit their JSON to fabricate approval or mark an entry LIVE. Explicit upgrade, reconciliation and diagnosis commands validate bindings and preserve history. Read-only checks never repair state. Expired leases do not authorize takeover; recovery requires verified exit of the owning local process. Unverified ownership stops execution.

Packet ARTICLE-HARDENING-002 authorizes automation-code work and synthetic tests only. Do not build articles, resume real imports, migrate actual records, merge, deploy or publish as part of that packet.

The supervising agent must execute every manual or API article work packet through LIVE, QUARANTINED, or a durable documented blocker. A missing packet result, editorial receipt, or validation artifact is unfinished agent work and must be completed before selecting another fixed-snapshot entry. Folder intake resumes the earliest PROCESSING entry before PENDING entries and preserves captured source bytes and order. Article-specific blockers may advance the folder; shared capability, access, integrity, or release blockers stop it. Never substitute a scanner report or another article's receipt for EditorialEvidenceV2.

Missing, invalid, stale or insufficient research evidence requires the supervising agent to conduct research under the research recovery protocol in `.agents/skills/external-article-import/SKILL.md`. This is non-negotiable. Validate `ResearchEvidenceV2` before advancing; failed evidence is unfinished research work, not grounds to skip or quarantine an article. Before release starts, research invalidation returns active imports to `RESEARCHING` and invalidates dependent approvals while preserving history and retry counters. Existing release attempts retain their journal and rollback target and require verified integrity recovery.

Missing or invalid `EditorialEvidenceV2` requires the supervising agent to complete `.agents/skills/eleanor-editorial/SKILL.md` before submitting another validation result. That skill owns the editorial procedure. Never substitute `LandingEditorialReviewV1` or fabricated attestations. Submit the current artifact, its genuine matching editorial receipt, required quality evidence, and correctly bound work packet.

Do not resubmit unchanged failing input. Diagnose the failure and complete the relevant artifact, evidence, or packet repair before retrying. After three unsuccessful repairs, stop speculative retries and investigate the underlying assumption; continue when a verified remedy is available. Preserve existing retry counters and all editorial and release gates.

Missing work alone does not justify a durable blocker or skipping an article. Record a blocker only for a specific, demonstrated obstacle, including its cause, attempted recovery, and exact requirement for resumption. Genuine article-specific blockers follow the existing continuation policy. Shared capability, model-access, integrity, or release failures stop the run. Clear an article blocker through the existing explicit intake-retry operation only after resolving its cause, then resume the same immutable snapshot. Processing completion does not establish publication.

## Affiliate-copy capability gate

- Before planning or drafting affiliate copy, read `docs/document-intelligence/DOMAIN_QUERY_EVIDENCE.md` sections **External Hormozi-skills review**, **Affiliate-safe Hormozi output map**, and **Affiliate-safe Hormozi invocation chain**.
- Invoke only the mapped individual skill at its declared lifecycle stage. Treat every output as a proposal and apply the pricing, evidence, independence, disclosure, page-contract, and QA boundaries recorded there.

## Code Intelligence

Owner directive, 24 November 2026: codebase-memory-mcp is the sole code graph. GitHub's reviewed `.codebase-memory/` artifact is the shared baseline. Graph evidence does not replace source strategy authority. Neon retains document-authority evidence only.

1. Before substantial code investigation, run `index_status` and `check_index_coverage` with the relevant paths or scopes. Check the published source SHA and local changes. Missing or stale coverage requires source inspection, never an assumption that a dependency is absent.
2. Query `get_architecture`, `search_graph` and `trace_path` before broad exploration. Use `detect_changes` for impact before changing shared functions, interfaces or workflows. Use `query_graph` for bounded relationship queries and `get_code_snippet` for targeted inspection. Verify important connections in actual source.
3. Load the shared baseline with `node scripts/code-intelligence/load.ts`. After implementation and checks, run `node scripts/code-intelligence/update-local.ts`. Keep automatic synchronization enabled. Local updates may rewrite exports; do not publish those changes automatically.
4. When MCP is unavailable, use `codebase-memory-mcp cli --json <tool>`, for example `codebase-memory-mcp cli --json trace_path --project VettedSaaSBlueprint --function-name handlePublicEventPost --direction inbound --format json`. Setup and coverage examples are in `docs/code-intelligence.md`. Codex and OpenCode start the installed binary from user-managed configuration; never add a checkout-owned automatic launcher.

The owner authorizes only the code-graph maintenance workflow in `.github/workflows/code-graph.yml`: default-branch changes, nightly source-change checks and manual dispatch, with reviewed update PRs. This does not reactivate article or retired multi-stage automation. Keep databases, caches, locks and diagnostics local; commit only the compressed graph, its metadata/provenance, attributes and portable setup. Never create an authoritative CLAUDE.md.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
