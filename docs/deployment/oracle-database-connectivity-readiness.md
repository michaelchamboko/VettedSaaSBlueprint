# Oracle Database Connectivity Readiness

Status: `PENDING_OPERATOR_INPUT`

This worksheet is the Step 2 `T02A` artifact for preparing Oracle Autonomous Database connectivity. It is intentionally redacted and must not contain secrets, wallet files, passwords, full connection strings, token values, or raw environment dumps.

## Current Verdict

- Oracle compute/Hermes host: `PARTIAL_READY`
- Oracle database connectivity: `NOT_READY`
- Schema application: `BLOCKED_PENDING_DB_CONNECTIVITY`

No schema migration may run until this worksheet reaches `READ_ONLY_QUERY_VERIFIED`.

## Required Operator Inputs

1. Confirm the exact Oracle Autonomous Database target and service alias.
2. Confirm the target remains Always Free or explicitly approve any non-free tier.
3. Approve the connection method.
   - Preferred: wallet-based TLS/mTLS.
   - Alternative: mTLS-less connection only if already configured and explicitly approved.
4. Approve a secure runtime-only wallet/secret storage path outside the repository.
5. Approve any minimum client/driver installation required for the chosen path.
6. Provide or approve the non-secret environment variable names needed by Vercel and Hermes.

## Repository Safety Rules

- Do not copy wallet files into this repository.
- Do not commit `.zip`, `.sso`, `.p12`, `.ora`, private key, password, token, or full connection-string material.
- Do not print wallet paths, raw env vars, passwords, or tokens in logs.
- Do not apply schema as part of connectivity verification.
- Do not change Oracle instance shape, networking, firewall, storage, packages, systemd services, or existing Hermes files without explicit separate approval.

## Proposed Runtime Env Names

These names are placeholders for runtime configuration only:

```text
DATABASE_URL
ORACLE_WALLET_LOCATION
HERMES_API_TOKEN
NEXT_PUBLIC_SITE_URL
```

If the selected Oracle driver requires a different convention, update this section before implementation.

## Verification Query

The only database action allowed in `T02A` is a read-only connectivity proof:

```sql
select 1 from dual;
```

Expected result:

```text
1
```

## Readiness Checklist

- [ ] Autonomous Database target confirmed without exposing secrets.
- [ ] Always Free posture confirmed or non-free tier explicitly approved.
- [ ] Connection method approved.
- [ ] Runtime-only wallet/secret storage path approved.
- [ ] Minimum client/driver installation approved, if needed.
- [ ] Read-only query executed successfully.
- [ ] Rollback/removal notes documented for any installed client tooling.

## Rollback Notes

Rollback notes are pending until the chosen client/driver path is approved. If no client tooling is installed, rollback is limited to removing uncommitted local notes and leaving Oracle unchanged.
