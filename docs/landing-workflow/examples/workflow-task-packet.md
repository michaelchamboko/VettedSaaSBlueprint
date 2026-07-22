# Landing Workflow Task

## Objective

Review the synthetic synthetic-studio-workflow-checklist batch and decide whether the owner-controlled publication path can advance.

## Current state

READY_FOR_OWNER_REVIEW

## Read-only inputs

- docs/design-references/landing-pages/

## Files the agent may modify

- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/manifest.json
- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/product-pack.json
- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/intents/synthetic-studio-workflow-checklist.json
- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/drafts/synthetic-studio-workflow-checklist.json
- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/reviews/synthetic-studio-workflow-checklist/uniqueness.json
- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/reviews/synthetic-studio-workflow-checklist/compliance.json
- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/reviews/synthetic-studio-workflow-checklist/conversion.json
- src/generated/landing-page-batches/00000000-0000-4000-8000-000000000100/retro.json

## Files or states the agent must not modify

- Do not approve owner review.
- Do not publish or register a public page.
- Do not edit quality receipts, visual QA results, preview registry, or owner-controlled records.

## Required outputs

- None; owner handoff is the deliverable.

## Exact commands

- npm run landing:workflow:inspect -- --batch-id 00000000-0000-4000-8000-000000000100 --format task

## Acceptance criteria

- The owner receives a complete handoff; approval and publication remain owner-controlled.

## Stop conditions

- An earlier agent-executable gate or retrospective is blocked.

## Handoff requirements

- Produce this inspection in `--format task` after all agent-executable gates pass.
- Owner approval and publication are outside the agent's authority.
