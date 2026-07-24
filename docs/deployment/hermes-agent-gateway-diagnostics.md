# Hermes Agent Gateway Diagnostics

This runbook covers the UI message:

```text
Hermes Agent Settings
Not available on this backend. Connect to a Hermes Agent gateway to unlock Hermes Agent Settings.

Configuration requires a Hermes gateway that exposes the extended APIs. Check that Hermes Agent is installed and running with `hermes gateway run`.
```

## Repository Finding

The repository worker at `hermes/worker.ts` is the project job runner. It claims and completes application jobs through `/api/hermes/*`; it is not the Hermes Agent gateway that exposes extended settings APIs.

Existing Oracle notes say the Oracle host has `hermes-gateway.service`, `hermes-dashboard.service`, and `hermes-workspace.service` present. The likely problem is therefore on the Oracle Hermes runtime side:

- `hermes-gateway.service` is stopped or unhealthy.
- The service is running a non-agent or old gateway command instead of `hermes gateway run`.
- The dashboard/workspace is pointed at the wrong backend URL.
- The gateway is listening on a different interface or port than the UI expects.
- The gateway is reachable only over Tailscale, but the UI is being opened through a non-gateway backend.

## Read-Only Checks

Run these only through the approved Oracle launcher. Do not print secrets, environment values, key paths, hostnames, or raw connection strings.

```bash
systemctl is-active hermes-gateway.service
systemctl is-enabled hermes-gateway.service
systemctl show hermes-gateway.service --property=LoadState,ActiveState,SubState,ExecMainStatus,ExecMainStartTimestamp
systemctl cat hermes-gateway.service
journalctl -u hermes-gateway.service -n 80 --no-pager
ss -ltnp
pgrep -af "hermes.*gateway|gateway.*hermes"
```

When sharing results, redact:

- token and secret values
- wallet paths
- SSH key paths
- hostnames and IP addresses unless the operator explicitly approves
- full environment variables

## Fix Boundary

Ask for explicit separate approval before:

- starting, stopping, or restarting `hermes-gateway.service`
- editing a systemd unit
- running `hermes gateway run` as a persistent service
- installing or upgrading Hermes Agent packages
- changing firewall, Tailscale, reverse proxy, Docker, or public exposure settings

## Expected Resolution Shape

The gateway service should run the Hermes Agent gateway command, remain managed by systemd, and be reachable only through the already-approved private access path. Do not expose a new public Oracle service for this settings UI.
