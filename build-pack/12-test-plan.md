# 12 — Test Plan

## Test Strategy

Use two-tier validation:

1. **Micro-task validation**: each task card has a local verification command and limited scope.
2. **Global validation**: full typecheck, build, integration checks, and deployment smoke tests before shipping.

## Unit Tests

- Zod schema validation for product, affiliate link, and page blueprint contracts.
- Compliance gate failure cases.
- PartnerStack link preservation rules.
- Claim risk classification.
- Budget guard decision order.
- Tracking event payload minimization.
- No raw IP storage.
- No third-party pixel behavior.
- `Do Not Track` handling where practical.

## Integration Tests

- Product creation creates required compliance/manual review state.
- Affiliate link creation rejects non-original or malformed referral links.
- Offer folder links product, affiliate URL, uploaded resources, rules, research, evidence, and destination review state.
- Program resource upload accepts allowed formats and records analysis state.
- Program resource analysis creates draft rules and manual review tasks.
- Purchase destination review records message match, visual affinity, friction, and compliance warnings without replacing the original affiliate URL.
- Hermes job claim uses lock-safe behavior.
- Job heartbeat/complete/fail state transitions work.
- Page publication blocks missing disclosure, missing evidence, or high-risk unsupported claims.
- Public affiliate redirect only works for active links.

## Database Tests

- Schema applies cleanly to Oracle Autonomous Database.
- Required indexes exist.
- Job queue claim query does not double-claim under concurrency.
- Audit log rows are created for meaningful compliance actions.

## UI Tests

- Mobile landing page shows disclosure before first CTA.
- Admin pages show compliance state and review reasons.
- Tap targets meet mobile usability expectations.
- Page renderer handles missing optional sections safely.

## Security/Privacy Tests

- Hermes APIs reject missing or invalid bearer token.
- Admin APIs reject unauthenticated requests once auth is implemented.
- Tracking APIs do not store sensitive personal data.
- Tracking APIs do not store raw IPs.
- Tracking implementation does not load third-party pixels.
- No self-referral signup/purchase tests exist.
- No third-party pixels are enabled by default.

## Deployment Tests

- Vercel build succeeds from repository dependencies.
- Vercel environment variables are configured.
- Oracle schema is present.
- Oracle worker can claim and complete a test job.
- ISR revalidation endpoint works with Hermes auth.
