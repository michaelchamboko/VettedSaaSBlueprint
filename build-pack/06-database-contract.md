# 06 — Database Contract

## Database Owner

Oracle Autonomous Database is the MVP system of record. The approved free-tier target is Oracle Autonomous Transaction Processing / Autonomous AI Database Always Free, with an upgrade path to paid Oracle Autonomous Database if capacity or backup requirements demand it.

## Core Tables

- `products`
- `offer_folders`
- `categories`
- `affiliate_links`
- `partnerstack_program_rules`
- `partnerstack_program_resources`
- `offer_purchase_destination_reviews`
- `compliance_profiles`
- `manual_review_tasks`
- `generation_jobs`
- `hermes_research_sessions`
- `scrapling_crawl_runs`
- `research_sources`
- `evidence_claims`
- `research_payloads`
- `page_blueprints`
- `page_versions`
- `dynamic_pages`
- `conversion_events`
- `page_daily_metrics`
- `optimization_recommendations`
- `audit_log`

## Locking Contract

`generation_jobs` must support safe concurrent workers:

- Jobs are claimed with Oracle-compatible row-level locks, using `FOR UPDATE SKIP LOCKED` where available.
- Active jobs set `status = running`, `locked_by`, and `locked_at`.
- Stale locks can be reclaimed after a configured timeout.
- Failed jobs increment `retry_count` and store `error_message`.
- Jobs fail permanently after the configured retry limit.

## Compliance Contract

A page cannot publish unless database state proves:

- Product is active or eligible for publication.
- Compliance profile exists and is reviewed.
- Affiliate link exists and is active.
- Page version is approved.
- Required disclosure exists.
- Evidence threshold is met.
- High-risk claims have approved claim-level evidence.
- Audit log records approval and publication.

## Program Resource Contract

PartnerStack program resources must support manual owner intake before analysis:

- Text notes and manually copied terms.
- PDF files.
- Images/screenshots.
- Source links.
- Video references or uploads where practical.

Oracle Database stores resource metadata, source type, retrieval/upload timestamp, usage notes, extraction status, and owner approval state. Large binary files may be stored in an approved Oracle object storage location with pointers in Oracle Database if direct database storage is not appropriate.

Hermes/MiniMax analysis outputs draft structured rules only. Extracted rules do not become enforceable until owner review/approval.

## Offer Folder Contract

Every affiliate offer should have a parent `offer_folder` record that links:

- Product.
- Primary affiliate link.
- PartnerStack resources and manual notes.
- Extracted affiliate rules.
- Affiliate research sources.
- Evidence claims.
- Purchase destination review.
- Landing page blueprint/version candidates.

The `offer_folder` is the Oracle-side organizing unit for all files, analysis, and compliance state related to one affiliate offer.

## Purchase Destination Review Contract

The affiliate URL provided by the owner is the outbound purchase URL. The system may inspect redirect behavior and the final visible destination for review, but must not replace the original affiliate URL with the final redirect URL.

The destination review stores:

- Affiliate URL checked.
- Redirect chain metadata.
- Final visible page URL for audit/review only.
- Page screenshots/extractions where permitted.
- CTA wording, offer promise, pricing/trial/guarantee claims.
- Visual affinity profile.
- Friction notes.
- Compliance warnings.
- Conversion continuity score.

## Oracle Compatibility Policy

- Convert PostgreSQL `uuid` to Oracle-compatible ID strategy, such as `RAW(16)` or `VARCHAR2(36)`.
- Convert PostgreSQL `jsonb` to Oracle `JSON` columns or `CLOB` with JSON constraints depending on selected Oracle version.
- Convert PostgreSQL arrays such as `text[]` into child tables or JSON arrays.
- Replace `gen_random_uuid()` and `pgcrypto` with Oracle UUID generation strategy.
- Replace PostgreSQL timestamp defaults with Oracle-compatible timestamp defaults.

## Migration Policy

- Step 1 creates schema contract only.
- Step 2 must apply schema through a controlled migration process.
- Destructive schema changes require rollback plan and explicit approval.
- Indexes must be included for job claims, page lookup, event metrics, and evidence lookup.

## Step 2 Database Follow-Ups

- Whether to keep a single `db/schema.sql` file or introduce versioned Oracle migrations.
- Whether to use Oracle APEX/ORDS tooling for admin or database operations.
- Retention period for raw conversion events.
