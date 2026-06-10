# 13 — Review Gate

## Required Specialist Reviews

- Product requirements review.
- Architecture review.
- Database review.
- Security/privacy review.
- Frontend/mobile review.
- Performance review.
- QA/release review.
- Documentation review.

## Review Questions

1. Does the implementation preserve the Vercel app / Oracle database / Oracle Hermes responsibility split?
2. Are all AI-generated outputs constrained to structured JSON?
3. Can any page publish without disclosure, valid affiliate link, evidence, and manual approval?
4. Can Hermes overrun crawl, AI, or runtime budgets?
5. Can high-risk claims bypass manual review?
6. Are PartnerStack links preserved without stripping tracking parameters?
7. Is public tracking minimal and consent-aware?
8. Are database migrations reversible or covered by rollback steps?
9. Are all task cards independently testable?

## Gate Outcome Options

- `APPROVED_FOR_STEP_2`
- `APPROVED_WITH_CHANGES`
- `BLOCKED_PENDING_DECISION`
- `REJECTED_REWORK_REQUIRED`
