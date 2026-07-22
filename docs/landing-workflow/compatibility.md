# Neutral and Legacy Landing Workflow Compatibility

This page maps the agent-neutral interface in `src/lib/landing-workflow/` to the established implementation in `src/lib/codex-batches/`, `src/lib/generated/codex-batch-previews.ts`, `src/lib/design-references/contracts.ts`, and the legacy package commands. New integrations should use the neutral names; the legacy names and commands continue to be supported and resolve through the same underlying implementations.

## Module and command mapping

| Neutral name | Legacy name | Implementation source | Compatibility status | Serialized fields changed |
| --- | --- | --- | --- | --- |
| `landingBatchManifestSchema` | `codexLandingBatchManifestSchema` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `landingBatchV1Schema` | `codexLandingBatchV1Schema` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `landingBatchV2Schema` | `codexLandingBatchV2Schema` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `landingDraftSchema` | `codexEditorialDraftSchema` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `landingQualityScannerNames` | `codexQualityScannerNames` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `LandingBatchManifest` | `CodexLandingBatchManifest` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `LandingBatchV1` | `CodexLandingBatchV1` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `LandingBatchV2` | `CodexLandingBatchV2` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `LandingBatchQualityReceipt` | `CodexBatchQualityReceiptV1` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `LandingVisualReview` | `VisualDesignReviewV1` | `src/lib/codex-batches/contracts.ts` | Aliased | No |
| `loadLandingBatch` | `loadCodexLandingBatch` | `src/lib/codex-batches/loader.ts` | Aliased | No |
| `LoadedLandingBatch` | `LoadedCodexLandingBatch` | `src/lib/codex-batches/loader.ts` | Aliased | No |
| `LoadedLandingBatchArtifact` | `LoadedCodexBatchArtifact` | `src/lib/codex-batches/loader.ts` | Aliased | No |
| `LoadLandingBatchOptions` | `LoadCodexLandingBatchOptions` | `src/lib/codex-batches/loader.ts` | Aliased | No |
| `getLandingBatchPreview` | `getCodexBatchPreview` | `src/lib/generated/codex-batch-previews.ts` | Aliased | No |
| `listLandingBatchPreviewSlugs` | `listCodexBatchPreviewSlugs` | `src/lib/generated/codex-batch-previews.ts` | Aliased | No |
| `LandingBatchPreview` | `CodexBatchBlueprintPreview` | `src/lib/generated/codex-batch-previews.ts` | Aliased | No |
| `inspectLandingWorkflowBatch` | n/a | `src/lib/landing-workflow/inspection.ts` | New (read-only) | No |
| `renderLandingWorkflowTask` | n/a | `src/lib/landing-workflow/inspection.ts` | New (read-only) | No |
| `landingWorkflowArtifacts` | n/a | `src/lib/landing-workflow/registry.ts` | New (registry) | No |
| `landingWorkflowCommands` | n/a | `src/lib/landing-workflow/registry.ts` | New (registry) | No |
| `landingWorkflowStages` | n/a | `src/lib/landing-workflow/registry.ts` | New (registry) | No |

## Package command mapping

| Neutral command | Legacy command | Behaviour |
| --- | --- | --- |
| `npm run landing:workflow:describe -- --json` | n/a | Read-only workflow description. No batch required. |
| `npm run landing:workflow:inspect -- --batch-id <uuid> --format json\|task` | n/a | Read-only inspection using the strict loader. |
| `npm run landing:workflow:validate -- --batch-id <uuid>` | `npm run validate:codex-batch -- --batch-id <uuid>` | Strict batch validation. |
| `npm run landing:workflow:quality -- --batch-id <uuid> --mode draft` | (delegates to `scripts/run-landing-quality.mjs`) | Batch-scoped Stage 2 quality. |
| `npm run landing:workflow:visual -- --batch-id <uuid>` | (delegates to `scripts/run-landing-visual.ts`) | Repository visual QA. |
| `npm run landing:workflow:verify -- --batch-id <uuid> --mode draft --json` | n/a | Read-only orchestration of the existing checks. |

Legacy commands that remain operational:

- `npm run validate:codex-batch -- --batch-id <uuid>`
- `npm run package:codex-batch -- --batch-id <uuid>`
- `npm run landing:quality:draft -- --batch-id <uuid>`
- `npm run landing:quality:production`
- `npm run landing:visual`

## Compatibility guarantees

- Existing Codex exports remain supported.
- Existing package commands remain supported.
- Existing batch IDs remain valid.
- Existing serialized hashes remain valid.
- Serialized schemas are unchanged.
- Generated artifact paths are unchanged.
- No physical mass rename is part of this task.
- Existing published landing pages are unchanged.
- Existing tests in `tests/` continue to pass without modification.
- The strict loader, scanner registry, Stage 2 quality, and visual QA implementations are not copied or replaced.
