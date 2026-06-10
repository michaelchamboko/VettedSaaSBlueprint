# 09 — Permissions Contract

## Actors

- `owner_operator`: the only authenticated human user, with full approval authority.
- `hermes_worker`: authenticated Oracle worker.
- `public_visitor`: anonymous visitor.
- `system`: internal app processes.

## Permission Matrix

| Action | owner_operator | hermes_worker | public_visitor | system |
| --- | --- | --- | --- | --- |
| Create product | Yes | No | No | No |
| Create affiliate link | Yes | No | No | No |
| Upload program resource | Yes | No | No | No |
| Analyze program resource | Yes | Yes if queued | No | No |
| Claim job | No | Yes | No | No |
| Complete/fail job | No | Yes | No | No |
| Create evidence | Review required or via worker | Yes | No | No |
| Approve first publication | Yes | No | No | No |
| Publish page | Yes | No | No | Controlled via approved state |
| Track page view/click | No | No | Yes | Yes |
| Revalidate page | No | Yes | No | Yes |
| Apply low-risk update | Configurable approval lane | Yes if enabled | No | Yes |

## Default Deny Rules

- Unknown program terms block publication.
- Unknown source usage blocks public use.
- Unknown claim evidence blocks claim use.
- Suspicious affiliate redirect creates manual review.
- Pricing, ranking, competitor, security, privacy, guarantee, discount, and geo claims require high-risk handling.

## Auth Requirements

- Owner/admin APIs require custom owner-only authentication.
- Owner auth uses one owner login, strong password hash, secure HTTP-only signed session cookie, session expiry, and audit logging for admin actions.
- Hermes APIs require bearer token and should later include worker identity/audit metadata.
- Public tracking APIs use minimal first-party tracking only and should include abuse controls plus `Do Not Track` respect where practical.

## Step 2 Security Follow-Ups

- Token rotation process for Hermes.

## Explicit Non-Goals

- No public signup.
- No team management.
- No tenant isolation.
- No seat or subscription billing.
- No broad customer identity system.
