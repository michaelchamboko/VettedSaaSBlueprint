# Task T06A — Offer Intelligence Folder

## Context Baseline

- `build-pack/06-database-contract.md`
- `build-pack/17-offer-intelligence-folder-and-conversion-continuity.md`

## Must-Haves

- Create an Oracle-owned offer folder concept for each affiliate offer.
- Link product, primary affiliate link, uploaded resources, extracted rules, research sources, evidence claims, purchase destination review, and page drafts.
- Store folder metadata in Oracle Database.
- Store large files in approved Oracle storage when database storage is not appropriate.
- Preserve the original affiliate URL as the outbound purchase URL.

## Target Artifacts

- Offer folder schema/migration contract.
- Owner UI folder view.
- API contract for create/read folder.
- Tests for relationship integrity.

## Verification Command

```powershell
npm test -- offer-folder relationships
```

Expected: offer folder links required entities and rejects orphaned resources or page drafts.
