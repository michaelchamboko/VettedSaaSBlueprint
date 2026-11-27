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

The focused test imports the real `src/app/blog/[slug]/page.tsx` module after installing a two-article synthetic catalogue in a disposable fixture root. React renders that existing public route component to static HTML. This is component rendering, not an HTTP observation. The generated page contains the approved target title and answer. Changing a separate mutable import artifact leaves the rendered HTML byte-for-byte unchanged. The catalogue-authority check rejects that changed import artifact with `BLOG_AUTHORITY_ARTIFACT_MISMATCH`.

| One-at-a-time change | Target content approval | Control content approval | Target catalogue binding | Control catalogue binding | Target presentation | Control presentation |
| --- | --- | --- | --- | --- | --- | --- |
| Target content | Revalidate | Reuse | Rejects mismatch | Reuse | Revalidate | Revalidate |
| Shared renderer | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |
| Shared styles | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |
| Target hero asset | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |
| Shared schema rule | Reuse | Reuse | Reuse | Reuse | Revalidate | Revalidate |

The content and catalogue checks isolate the control article correctly. Presentation reuse is broader. `captureRenderingInputs` records the complete renderer inventory, so both article receipts fail when any recorded file changes. That includes a target-only content file and target-only hero asset. This is safe but over-broad compared with issue #103's expected affected-article scope. It is an observed limitation, not authority for a product fix.

The release code has separate gates for catalogue binding, content approval, rendering inputs, deployment commit, production verifier evidence, and terminal evidence. Runtime probes returned `BLOG_AUTHORITY_ARTIFACT_MISMATCH`, `DEPLOYMENT_COMMIT_METADATA_MISMATCHED`, and `PRODUCTION_DEPLOYMENT_MISMATCH` for the first three disagreements. The final terminal-to-serving case is static and unreachable through one validator. `inspectImportCompletion` checks frozen terminal evidence but does not read the served catalogue route. The synthetic disagreement records therefore remain not LIVE. Reconciliation would need one served revision, one approved artifact, the intended commit at the production assignment, production observations bound to that deployment, and a matching terminal record.

## Files

- `catalogue-import-probe.test.ts`: repeatable synthetic probe.
- `served-catalogue.html`: local render from the real public blog route.
- `observations.json`: expected and observed result summary.
- `red-output.txt`: TDD failure before the probe existed.
- `test-output.txt`: passing focused test receipt.

## Run

```powershell
node_modules\.bin\tsx.cmd --test docs/designs/recovery-evidence/103/catalogue-import-probe.test.ts
```

The test builds all mutable inputs under a disposable temporary root. It never writes the caller's tracked catalogue, user files, import records, database, deployment, or publication state. The retained HTML is a checked reference. Ordinary test runs compare its bytes and do not rewrite it.
