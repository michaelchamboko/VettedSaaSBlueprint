# T02A Operator Handoff

This handoff is for `T02A - Oracle Database Connectivity Readiness`. It is intentionally non-secret. Do not paste passwords, wallet paths, wallet filenames, connection strings, tokens, raw environment variables, or key material into this file, chat, build logs, or GitHub.

## Current State

- Vercel/GitHub hosted app build is passing on `codex/step-2-build`.
- Oracle host SSH metadata access is reachable through the operator-provided launcher workflow.
- Oracle read-only database verification passed with `select 1 from dual`.
- Oracle schema migration is unblocked for the next `T02` task, but no schema has been applied yet.
- Wallet material and runtime values remain outside the repository.
- No Oracle schema, users, packages, wallet files, firewall settings, services, or Hermes runtime files have been changed.

## Operator Decisions Needed

Answer these without secrets:

1. Autonomous Database target is approved for this project: `yes/no`.
2. Target remains Always Free, or non-free tier is separately approved: `Always Free / separately approved`.
3. Connection method: `wallet-based TLS/mTLS / walletless TLS`.
4. App database user strategy: `existing least-privilege user / create least-privilege user after approval / other`.
5. Vercel app database path: `direct Oracle connection / Oracle-side API layer / undecided`.
6. Hermes database path: `Python oracledb in Hermes venv / separate worker container / undecided`.
7. Migration runner path: `SQLcl / Python migration script / other reviewed runner`.
8. Runtime-only wallet/secret storage location approved: `yes/no`.
9. Minimum client/driver installation approved: `yes/no/not needed`.

## Connection Material Handling

Preferred handling:

1. Keep wallet ZIP and extracted wallet files outside the repository.
2. Use a locked-down runtime path on the Oracle host after explicit approval.
3. Confirm only that the material has been staged or is available; do not paste the location into chat.
4. Let the agent run a redacted metadata check that reports counts and readiness only.

The repository must never contain:

- `Wallet_*.zip`
- `tnsnames.ora`
- `sqlnet.ora`
- `cwallet.sso`
- `ewallet.p12`
- `ojdbc.properties`
- Passwords, tokens, private keys, or full connection strings

## T02A Verification Scope

Only this read-only query is allowed in T02A:

```sql
select 1 from dual;
```

Passing T02A means:

- The approved connection path can execute the read-only query.
- No schema has been applied.
- Any installed client/driver notes and rollback/removal notes are documented.
- Wallet/secret material remains outside the repo and outside public web roots.

## Stop Conditions

Stop before execution if any of these are true:

- The target database, service alias, connection method, or runtime path is unclear.
- Any requested action would change Oracle instance shape, Always Free posture, networking, firewall, storage, packages, systemd services, or the existing Hermes runtime without separate explicit approval.
- Any secret would be printed or committed.
- The next action would apply schema before `select 1 from dual` passes.
