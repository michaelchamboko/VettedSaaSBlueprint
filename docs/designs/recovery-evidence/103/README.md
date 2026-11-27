# Catalogue and import approval evidence

Issue: [#103](https://github.com/michaelchamboko/VettedSaaSBlueprint/issues/103)

## Authority and limits

- User directive, 27 November 2026: investigate issue #103 with synthetic fixtures only. Do not run a real import, change product behavior, deploy, or publish.
- GitHub issue #103, `What to build` and `Acceptance criteria`: compare catalogue and import approvals for identical synthetic content, vary five inputs one at a time, keep a control article, and record publication-record disagreements.
- GitHub issue #96, `Implementation Decisions / Publication and evidence`: one approval contract covers catalogue and import routes. Public serving remains independent of mutable local import state. LIVE requires agreement between the served article, approved revision, intended commit, retained production proof, and terminal record.
- GitHub issue #96, `Testing Decisions / Catalogue and import approval`: exercise the existing public route and preserve a control article while content, renderer, style, asset, and rule inputs change.

This evidence does not claim a product correction. It records current behavior at branch head. Historical WebCatalog causation remains unknown.

## Expected behavior

1. The catalogue entry and import artifact must contain the same approved article revision before release.
2. A target-only content or asset change should require fresh evidence for that article. An unrelated article keeps valid evidence.
3. Shared renderer, style, or rule changes affect both articles and require fresh presentation evidence. Unchanged content approval may survive.
4. A terminal `LIVE` label is insufficient when serving, approval, commit, retained observations, or terminal identity disagree.

## Observed evidence

The focused test uses two boundaries. First, it imports the real `src/app/blog/[slug]/page.tsx` module after installing a two-article synthetic catalogue in a disposable fixture root. React renders that route component to static HTML. Second, it copies the application into a separate disposable fixture, starts that fixture's Next server on `127.0.0.1`, and requests the target and control routes over HTTP.

The HTTP target and control both returned 200. Their canonical URLs were `https://vettedsaasblueprint.online/blog/synthetic-catalogue-target` and `https://vettedsaasblueprint.online/blog/synthetic-catalogue-control`. The target response contained the approved title and answer summary. The test then changed only the fixture's separate mutable import artifact. The catalogue-authority validator returned `BLOG_AUTHORITY_ARTIFACT_MISMATCH`, but a fresh HTTP request still served the approved catalogue body. The server never reads the caller's tracked catalogue or local import state.

| One-at-a-time change | Target content approval | Control content approval | Target catalogue binding | Control catalogue binding | Target presentation | Control presentation |
| --- | --- | --- | --- | --- | --- | --- |
| Target content | Revalidate | Reuse | Rejects mismatch | Reuse | Revalidate | Revalidate |
| Shared renderer | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |
| Shared styles | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |
| Target hero asset | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |
| Shared schema rule | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |

The content and catalogue checks isolate the control article correctly. Presentation reuse is broader. `captureRenderingInputs` records the complete renderer inventory, so both article receipts fail when any recorded file changes. That includes a target-only content file and target-only hero asset. This is safe but over-broad compared with issue #103's expected affected-article scope. It is an observed limitation, not authority for a product fix.

The release code has separate gates for catalogue binding, content approval, rendering inputs, deployment commit, production verifier evidence, and terminal evidence. Runtime probes returned `BLOG_AUTHORITY_ARTIFACT_MISMATCH`, `DEPLOYMENT_COMMIT_METADATA_MISSING_OR_MISMATCHED`, and `PRODUCTION_DEPLOYMENT_MISMATCH` for the first three disagreements. The deployment probe called the local synthetic adapter's `deploy(expectedCommit)` with provider metadata that consistently named a different commit. It retained the expected commit, observed commit, operation, and exact error without making an external deployment. The final terminal-to-serving case is static and unreachable through one validator. `inspectImportCompletion` checks frozen terminal evidence but does not read the served catalogue route. The synthetic disagreement records therefore remain not LIVE. Reconciliation would need one served revision, one approved artifact, the intended commit at the production assignment, production observations bound to that deployment, and a matching terminal record.

## Files

- `catalogue-import-probe.test.ts`: repeatable synthetic probe.
- `served-catalogue.html`: local render from the real public blog route.
- `http-observations.json`: retained HTTP status, canonical path, body evidence digest, control result, and serving-independence result.
- `observations.json`: expected and observed result summary.
- `red-output.txt`: TDD failure before the probe existed.
- `test-output.txt`: passing focused test receipt.

## Run

```powershell
node_modules\.bin\tsx.cmd --test docs/designs/recovery-evidence/103/catalogue-import-probe.test.ts
```

The test builds all mutable inputs under disposable roots. The HTTP fixture lives in the checkout's owned `.scratch` directory so its Windows dependency junction stays on one drive. This works in a regular checkout and a linked worktree. It never writes the caller's tracked catalogue, user files, import records, database, deployment, or publication state. The retained HTML and HTTP observation are checked references. Ordinary test runs compare their bytes, write the complete rerun to a unique `.scratch/recovery-evidence-runs/103-*` directory, and do not rewrite the references. Each rerun records the tested checkout SHA separately from the historical product baseline. The test records the exact child it starts, sends termination only to that child, waits for exit, and then removes its fixture.
