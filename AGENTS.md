# Agent Operating Contract

This repository is the local Spec Kit, implementation, automation, and deployment workspace for Vetted SaaS B. The source strategy documents remain the product authority; implementation proceeds here through small, verifiable vertical slices.

## Active phase

- Document-intelligence foundation work is complete.
- Global Setup was a one-time initializer and is no longer part of the execution path.
- Phase One must produce one connected Decision Hub, Solution Hub, and Decision Scenario, then deploy and verify them on Vercel.
- Later phases add the research, editorial, publishing, optimisation, watchdog, recovery, and notification workflows.
- Prefer the smallest deployable slice. A successful phase ends with working URLs and recorded verification evidence.

## Non-inference gate

- Cite an exact source document, heading, and stable source identifier before treating a statement as a repository fact.
- Label user directives, inferences, proposals, and external evidence explicitly.
- Do not convert silence into a requirement or prohibition.
- Keep conflicts unresolved until the product owner deliberately adjudicates them.
- Do not reinterpret reduced-motion requirements as minimal motion.
- Do not weaken commercial intent or let it silently override evidence, disclosure, ranking independence, or anti-deception requirements.

## Repository boundaries

- GitNexus is a navigation and impact-analysis aid, not semantic authority.
- `docs/document-intelligence/` is the explicit semantic layer.
- Application code, workflows, tests, and deployment configuration created in this repository are members of its GitNexus index.
- Source strategy documents remain unchanged unless the product owner separately approves an amendment.
- Existing external VettedSaaSBlueprint code and deployments are migration context, not implementation authority.
- Do not create or retain an authoritative `CLAUDE.md`.

## Execution workflow

1. Select the smallest unblocked vertical slice from `build-pack/10-implementation-plan.md`.
2. Read the slice's exact source sections and stable identifiers before implementation.
3. Refresh GitNexus before impact-sensitive work and use it to identify affected code and tests.
4. Implement the slice with its automated checks and production-facing acceptance criteria.
5. Deploy Phase One and later release slices to Vercel through the repository deployment configuration.
6. Verify the deployed URLs independently of worker self-reporting and record the deployment receipt.
7. Keep scheduled jobs authenticated, idempotent, observable, retryable, and outside latency-sensitive public request paths.

## Source-intelligence workflow

Run this workflow when source documents or their derived intelligence change:

1. Regenerate the source inventory with `powershell -NoProfile -File scripts/build-document-inventory.ps1`.
2. Verify `docs/document-intelligence/SOURCE_MANIFEST.json` and `DOCUMENT_INVENTORY.md` cover the same source files and headings.
3. Use direct source inspection for semantic conclusions.
4. Record cross-document relationships and unresolved findings in the explicit relationship map.
5. Run `scripts/verify-document-intelligence.ps1`, then the stable-UID impact command before proposing a later document amendment. Commit-delta detection remains unavailable while the baseline commit is deferred.

Refresh GitNexus with `powershell -NoProfile -File scripts/refresh-gitnexus.ps1`. The wrapper pins GitNexus 1.6.9 and the repository-level `.gitnexusrc` enforces index-only mode so refreshes cannot inject tool-specific authority files.

## Affiliate-copy capability gate

- Before planning or drafting affiliate copy, read `docs/document-intelligence/DOMAIN_QUERY_EVIDENCE.md` sections **External Hormozi-skills review**, **Affiliate-safe Hormozi output map**, and **Affiliate-safe Hormozi invocation chain**.
- Invoke only the mapped individual skill at its declared lifecycle stage. Treat every output as a proposal and apply the pricing, evidence, independence, disclosure, page-contract, and QA boundaries recorded there.
