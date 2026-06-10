# 15 — Pre-Ship Checklist

## Planning Approval

- [ ] Build pack reviewed by operator.
- [ ] Open decisions resolved or explicitly deferred.
- [ ] Task cards approved for Step 2.

## Code Validation

- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] API contract tests pass.
- [ ] Database migration validation passes.

## Compliance Validation

- [ ] Disclosure enforcement verified.
- [ ] High-risk claim gate verified.
- [ ] Manual approval gate verified.
- [ ] Program-rule unknown state blocks publication.
- [ ] Audit logging verified.
- [ ] PartnerStack link preservation verified.

## Deployment Validation

- [ ] Vercel deploy succeeds.
- [ ] Oracle Autonomous Database schema applied.
- [ ] Oracle Hermes service running.
- [ ] Hermes can claim/complete job.
- [ ] Public page renders mobile-first.
- [ ] Tracking events recorded minimally.

## Release Readiness

- [ ] Rollback plan tested or reviewed.
- [ ] Secrets configured outside repo.
- [ ] No `node_modules` committed.
- [ ] No `.env` committed.
- [ ] Documentation updated.
