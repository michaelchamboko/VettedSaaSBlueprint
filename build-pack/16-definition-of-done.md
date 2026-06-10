# 16 — Definition of Done

The MVP is done when the controlled affiliate intelligence loop works end to end in the intended deployment environments.

## Functional Done

- Operator can create a product.
- Operator can store an original PartnerStack affiliate link.
- Product has reviewed compliance profile/program rules.
- Hermes can claim and process research jobs from Oracle.
- Scrapling research stores source records and crawl runs.
- Evidence claims are stored and risk-classified.
- A direct-review page draft is generated as structured JSON.
- Quality/compliance gate blocks unsafe drafts.
- Operator can manually approve first publication.
- Vercel renders the approved mobile-first page.
- Public CTA clicks preserve PartnerStack attribution.
- First-party tracking events are stored.
- Hermes creates daily optimization recommendations.

## Compliance Done

- No page publishes without visible disclosure.
- No high-risk claim publishes without claim-level evidence and approval.
- Unknown compliance states default to blocked/manual review.
- Audit log records publication, rejection, overrides, link changes, and disclosure changes.

## Deployment Done

- Vercel app is deployed from repo.
- Oracle Autonomous Database schema is applied and backed up according to the selected Oracle tier's capabilities.
- Oracle Hermes worker is managed as a persistent service.
- Environment variables are configured outside source control.

## Verification Done

- Typecheck passes.
- Build passes.
- Unit/integration tests pass.
- Security/privacy review passes.
- Database review passes.
- Frontend mobile review passes.
- Pre-ship checklist is complete.
