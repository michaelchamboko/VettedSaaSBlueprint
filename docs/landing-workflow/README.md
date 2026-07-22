# Landing Workflow

## Unattended publication

The current publication authority is [`unattended-publication.md`](./unattended-publication.md). Any agent may create a structured draft after reading this repository, but only the exact URL allowlist in root `approved-urls.md` may authorize unattended release. Run `npm run landing:workflow:describe -- --json` to discover the machine-readable contract and `npm run landing:allowlist:validate` before processing a manifest.

This is the canonical workflow authority for execution agents. It describes the existing batch contracts, repository renderer, scanners, and owner controls without changing their implementation. Discover the machine-readable form with `npm run landing:workflow:describe -- --json`.

Responsibility boundary: the execution agent creates only constrained structured artifacts; the repository validates and renders them; repository checks evaluate them; the owner approves and publishes.

Artifact ownership and exact command metadata are defined by the repository registry and exposed by the description command. `AGENT_WRITABLE` files may be changed only within their existing schemas. `REPOSITORY_GENERATED`, `OWNER_CONTROLLED`, and `READ_ONLY_INPUT` artifacts must not be changed by an execution agent.

## Stage: Design direction

### Input

- `docs/design-references/landing-pages/`
- `intents/<slug>.json`

### Agent may modify

- The `intent_brief` artifact category reported by workflow inspection.

### Agent must not modify

- Design-reference catalogue records or captures.

### Command

- `npm run landing:references:validate`
- `npm run landing:references:select -- --category <slug> --buyer-decision <text>`

### Success result

- Valid local references and a recorded design direction.

### Failure result

- `hold_for_design_direction` or a validation error.

### Stop conditions

- References are missing, stale, invalid, unsuitable, or reuse-limited.

### Next action

- Intent.

## Stage: Intent

### Input

- Product evidence pack and intent brief.

### Agent may modify

- `product_evidence_pack`, `intent_brief`, and `manifest` categories reported by inspection.

### Agent must not modify

- Owner records, quality receipts, or design-reference inputs.

### Command

- `npm run landing:workflow:validate -- --batch-id <uuid>`

### Success result

- Intent gate is `pass`.

### Failure result

- Intent gate is `fail`, `pending`, `blocked`, or `not_run`.

### Stop conditions

- The intent gate is not `pass`.

### Next action

- Draft.

## Stage: Draft

### Input

- Passing intent and design direction.

### Agent may modify

- `draft_artifact` and `manifest` categories reported by inspection.

### Agent must not modify

- Renderer code, CSS, or arbitrary frontend components.

### Command

- `npm run landing:workflow:validate -- --batch-id <uuid>`

### Success result

- Draft gate is `pass` and strict validation succeeds.

### Failure result

- Strict-loader or draft-gate error.

### Stop conditions

- The draft does not validate as the existing PageBlueprint contract.

### Next action

- Preview.

## Stage: Preview

### Input

- Valid draft artifact and registered noindex preview.

### Agent may modify

- No visual QA or preview-registry artifact.

### Agent must not modify

- Preview registry, visual-review result, renderer, analytics behavior, or affiliate URLs.

### Command

- `npm run landing:workflow:visual -- --batch-id <uuid>`

### Success result

- Repository visual QA passes for the production renderer preview.

### Failure result

- Visual QA is missing, fails, or requests revision.

### Stop conditions

- Visual QA is not `pass`; do not begin downstream specialist gates.

### Next action

- Visual QA.

## Stage: Visual QA

### Input

- A registered production-identical noindex preview for a valid draft.

### Agent may modify

- No visual-review artifact.

### Agent must not modify

- Visual-review results, screenshots, preview registry, renderer, or preview analytics settings.

### Command

- `npm run landing:workflow:visual -- --batch-id <uuid>`

### Success result

- Repository visual QA records a passing result.

### Failure result

- Visual QA is `NOT_RUN`, requests revision, or fails.

### Stop conditions

- Visual QA is not passing.

### Next action

- Uniqueness.

## Specialist gate policy

### Input

- Passing visual QA and the page’s structured review artifacts.

### Agent may modify

- `specialist_review` and `manifest` categories reported by inspection.

### Agent must not modify

- Compliance approval, link approval, owner approval, or publication state.

### Command

- `npm run landing:workflow:quality -- --batch-id <uuid> --mode draft`

### Success result

- Uniqueness, compliance, and conversion gates are `pass`; quality receipt passes.

### Failure result

- Any gate or scanner is `fail`, `pending`, `blocked`, or `not_run`.

### Stop conditions

- Do not advance past the first non-passing gate.

### Next action

- Retro.

## Stage: Uniqueness

### Input

- Passing visual QA and the uniqueness review artifact.

### Agent may modify

- The applicable `specialist_review` and `manifest` categories reported by inspection.

### Agent must not modify

- Quality receipts, owner decisions, or publication state.

### Command

- `npm run landing:workflow:validate -- --batch-id <uuid>`

### Success result

- Uniqueness gate is `pass`.

### Failure result

- Uniqueness gate is non-passing.

### Stop conditions

- Do not begin compliance until uniqueness passes.

### Next action

- Compliance.

## Stage: Compliance

### Input

- Passing uniqueness gate and compliance review artifact.

### Agent may modify

- The applicable `specialist_review` and `manifest` categories reported by inspection.

### Agent must not modify

- Compliance approval, link approval, destination approval, owner approval, or publication state.

### Command

- `npm run landing:workflow:validate -- --batch-id <uuid>`

### Success result

- Compliance gate is `pass`.

### Failure result

- Compliance gate is non-passing.

### Stop conditions

- Do not begin conversion until compliance passes.

### Next action

- Conversion.

## Stage: Conversion

### Input

- Passing compliance gate and conversion review artifact.

### Agent may modify

- The applicable `specialist_review` and `manifest` categories reported by inspection.

### Agent must not modify

- Owner approval or publication state.

### Command

- `npm run landing:workflow:validate -- --batch-id <uuid>`

### Success result

- Conversion gate is `pass`.

### Failure result

- Conversion gate is non-passing.

### Stop conditions

- Do not run owner handoff until conversion and quality pass.

### Next action

- Quality.

## Stage: Quality

### Input

- A strictly valid batch with passing upstream gates.

### Agent may modify

- No quality receipt or scanner output.

### Agent must not modify

- Quality receipts, scanner pass results, or visual results.

### Command

- `npm run landing:workflow:quality -- --batch-id <uuid> --mode draft`

### Success result

- Existing batch-scoped scanner workflow writes a current passing receipt.

### Failure result

- Any scanner or Stage 2 gate fails.

### Stop conditions

- Do not proceed while quality is failed, stale, or absent.

### Next action

- Retro.

## Stage: Retro

### Input

- Passing gates and quality receipt.

### Agent may modify

- `batch_retro` and `manifest` categories reported by inspection.

### Agent must not modify

- Owner approval, publication audits, public routes, or publication status.

### Command

- `npm run landing:workflow:inspect -- --batch-id <uuid> --format task`

### Success result

- A task-format owner handoff reports `READY_FOR_OWNER_REVIEW`.

### Failure result

- Retro or an earlier gate remains blocked.

### Stop conditions

- Owner review and publication cannot be performed by an execution agent.

### Next action

- Owner review.

## Stage: Owner review

### Input

- Passing agent-executable gates and a task-format handoff.

### Agent may modify

- No owner-controlled record.

### Agent must not modify

- Owner approval, audit provenance, publication readiness, or public routes.

### Command

- `npm run landing:workflow:inspect -- --batch-id <uuid> --format task`

### Success result

- The owner receives a complete handoff; the repository reports `READY_FOR_OWNER_REVIEW`.

### Failure result

- An earlier gate or retrospective is blocked.

### Stop conditions

- Execution agents must not approve or publish.

### Next action

- Owner-controlled publication decision.

## Stage: Publication

### Input

- Owner-reviewed handoff and durable owner-controlled approval records.

### Agent may modify

- No publication artifact or system state.

### Agent must not modify

- Owner approval, publication approvals, audits, routes, link state, or destination state.

### Command

- No execution-agent command exists for publication.

### Success result

- Owner-controlled systems complete audited publication.

### Failure result

- Owner readiness or publication gate is incomplete.

### Stop conditions

- An execution agent must stop before approval or publication.

### Next action

- None.

## Checks and exit codes

Use `landing:workflow:verify` for a read-only status report. It reports skipped checks as `NOT_RUN` and owner-only actions as `NOT_APPLICABLE`; it never treats their absence as a pass. Inspection returns exit code `0` for a successfully identified blocked batch and exit code `2` for usage or command errors. Validation and delegated quality/visual commands retain their existing nonzero failure behavior.

Preview URLs are `/landing-page-previews/<slug>`. They use the production renderer with `noindex,nofollow`, suppress analytics, and preserve the affiliate destination exactly.

## Legacy compatibility

The existing `codex-batches`, `validate:codex-batch`, `package:codex-batch`, and preview-catalogue exports remain operational. New integrations should use `src/lib/landing-workflow/` and the `landing:workflow:*` commands. No serialized schema, batch ID, hash, generated batch path, or preview route changed in this phase.
