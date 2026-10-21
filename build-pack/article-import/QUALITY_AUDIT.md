# External article import quality audit

## Authority

- Repository fact: D07 section 32, `D07-S-761a1d533ac1`, requires direct answers, meaningful uncertainty, useful next steps, and no repetitive AI phrasing or fake first-hand experience.
- Repository fact: D10 section 9.4, `D10-S-574481d73201`, requires coherent headings, truthful claim labels, accurate links and complete production copy.
- Owner directive: article import uses four separate responsibilities: research, editorial approval, presentation, and release verification. Presentation cannot rewrite approved words.
- Owner directive: paused production schedules remain paused.

## Workflow map

| Responsibility | Implementation | Failure route |
|---|---|---|
| Import and research | `src/lib/article-import/engine.ts` parses untrusted Markdown, resolves approved URLs, fingerprints sources and drives bounded strategies. | Temporary dependencies enter `WAITING_EXTERNAL`; unusable content can reach `QUARANTINED`. |
| Editorial approval | `content-approval.ts` binds the schema artifact, source, pinned Eleanor revision, editorial evidence and format quality receipt. | Any artifact or evidence mismatch returns to `REFINING`. |
| Presentation | `presentation.ts` requires owner-format schema validation plus hashed verifier evidence for desktop, mobile, accessibility, technical SEO, overflow and runtime proof. | Missing, stale or tampered proof returns to `VALIDATING` while preserving content approval. |
| Release | `release.ts` and `local-release-adapter.ts` derive the target from the approved artifact, stage declared files, open or reuse a PR, require independent current-head Codex review, wait for owner merge, deploy the exact merged commit and verify or roll back. | Git, GitHub, credentials, network and deployment failures remain resumable. |

## Reuse and duplicate audit

The implementation reuses:

- `src/lib/editorial/refinement.ts` for the pinned Eleanor fingerprint and evidence contract.
- Blog contracts and `auditBlogPost` for blog validation.
- Landing candidate quality and landing deployment verification.
- Visibility contracts and catalogue, with one format-owned production verifier added because none existed.
- DecisionSetV2 contracts and the existing decision production verifier.

A bounded search of the current checkout, open PR file lists and attached worktrees found one `ExternalArticleImportV1` engine and one command surface. No second complete importer was found. This does not assert coverage of unknown remote branches or external services.

## Quality findings resolved

1. Release cannot proceed without content approval and a presentation receipt bound to the same artifact fingerprint.
2. A wording change clears presentation, prepared PR and release state; a layout-only repair retains editorial approval.
3. Recovery executes an injected stage worker under an exclusive expiring lease, checkpoints atomically and changes deterministic strategy after three failures.
4. Transient failures never consume content-repair strategies or delete the raw source.
5. Direct review, blog, visibility and decision-set validation and production verification delegate to their format owners.
6. A locally prepared commit is durable before branch push, so interrupted PR creation resumes without a duplicate commit.
7. Production deployment waits for owner-approved PR merge and binds the merge commit, deployment identity, canonical route and presentation receipt.
8. Rollback must restore and verify the previous production identity before fix-forward work.
9. The supervised heartbeat exchanges source-bound work and result packets with the existing Codex agent; the CLI validates each result and runs the existing gates without adding a model service.
10. Format verifiers reject caller-selected slugs or routes that differ from the approved artifact, and presentation receipts hash real verifier files.
11. Closed pull requests are replaced, and a passed independent Codex review is bound to the exact current PR head before release can continue.

## Pilot

The Switcher Studio candidate uses the unique approved URL ending `fqvgdx9`. Its approved content fingerprint is `06ce5284ef6f0603e9fbc7ad09a2e60f13f3f9dce2c891ade66821778aef7589`. The candidate first appears in commit `83e22ed324cb5587600c5b33c07f4e6054fcdf7e`; the previous release receipt referenced a commit that did not contain it and is corrected in this delivery.

Production publication remains gated by the repository's required owner-approved PR merge. After merge, the quiet heartbeat resumes the durable release state, deploys the exact merge commit and records the Vercel deployment and verified canonical URL.

## Verification evidence

- Focused importer and verifier suite: 70 passed, 0 failed.
- Full repository suite: 355 passed, 0 failed, 3 environment skips.
- TypeScript route generation and typecheck: passed.
- Mandatory workflow contract: passed.
- Lint: 0 errors and 34 pre-existing warnings outside the changed importer surface.
- Public-site validation, production build and all 16 Switcher candidate checks: passed.
- Independent current-head review is requested and recorded on the PR before owner approval.

## Rollback

Revert the focused import commits and remove the project heartbeat. Existing published content, paused schedules and approved URL authority remain unchanged. If a new deployment fails, the release adapter restores the captured production deployment and verifies its deployment ID and commit before another release attempt.
