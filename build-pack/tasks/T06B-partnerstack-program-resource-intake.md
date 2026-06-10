# Task T06B — PartnerStack Program Resource Intake

## Context Baseline

- `build-pack/07-api-contract.md`
- `build-pack/08-ui-contract.md`
- `build-pack/09-permissions-contract.md`

## Must-Haves

- Owner can manually enter PartnerStack program rules and affiliate link metadata.
- Owner can upload or reference PDFs, images/screenshots, links, and video resources where practical.
- Uploaded resources are stored in Oracle or an approved Oracle-adjacent object store with metadata in Oracle DB.
- Existing Hermes/MiniMax analyzes resources into draft compliance rules, disclosures, channel restrictions, link rules, and manual review tasks.
- Extracted rules remain draft/review state until the owner approves them.

## Target Artifacts

- Program resource intake API contract.
- Owner UI upload/link-entry workflow.
- Oracle storage metadata tables or schema extension.
- Hermes resource-analysis job type.
- Tests for upload metadata, analysis status, and review gating.

## Verification Command

```powershell
npm test -- program-resources partnerstack compliance
```

Expected: resource intake stores metadata, analysis produces draft rules, and unapproved extracted rules cannot govern publication.
