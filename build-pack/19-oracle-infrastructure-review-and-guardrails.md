# 19 — Oracle Infrastructure Review and Guardrails

**Review Date**: 2026-06-10  
**Review Mode**: Read-only SSH inspection  
**Operator Rule Priority**: Highest for any Oracle-related task

## Golden Rules

1. **Never change Oracle instance settings from the current Always Free posture.**
   - Do not resize the instance.
   - Do not change shape, OCPU, RAM, boot volume, block volume, tenancy, region, networking, or paid-tier settings.
   - Do not enable paid Oracle features.
   - Do not modify OCI security lists, route tables, VCN, subnet, reserved IPs, or billing-affecting settings without explicit separate operator approval.

2. **Preserve security first.**
   - The operator has prior compromise history, so Step 2 must assume hostile internet scanning and credential-stuffing attempts.
   - Prefer read-only review before any infrastructure action.
   - Do not expose new public ports.
   - Do not print secrets, keys, tokens, wallet paths, or raw environment variables in logs or chat.

3. **Preserve the existing Hermes block-volume installation.**
   - Hermes is installed under the attached block volume mounted at `/michael-core`.
   - `/home/ubuntu/.hermes` is a symlink to `/michael-core/hermes`.
   - Step 2 must integrate with existing Hermes rather than reinstalling or overwriting it.

## Observed Instance Posture

Read-only SSH review observed:

- Host: Ubuntu 24.04 LTS on Oracle ARM shape `VM.Standard.A1.Flex`.
- Boot filesystem has healthy free space.
- Attached block volume `/michael-core` has healthy free space and contains Hermes.
- Hermes services are active:
  - `hermes-gateway.service`
  - `hermes-dashboard.service`
  - `hermes-workspace.service`
- Tailscale is active.
- Docker is active.
- Fail2ban is active for SSH.
- UFW is active with default deny incoming.

## Positive Security Signals

- SSH password authentication is disabled.
- SSH root login is disabled.
- Public key authentication is enabled.
- Fail2ban is active and banning SSH attackers.
- UFW default incoming policy is deny.
- Ollama appears bound to localhost and Docker-scoped access rather than public access.
- Hermes dashboard/workspace surfaces appear intended for Tailscale-bound access.

## Security Concerns To Review Before Step 2 Writes

These are not permission to change settings. They are review items only.

1. **SSH is allowed from anywhere at the firewall level.**
   - This is common but high-risk given prior compromise history.
   - Recommended future improvement: restrict SSH to trusted IP/VPN/Tailscale/OCI Bastion only, but only with explicit operator approval.

2. **Internet-facing HTTP is allowed.**
   - Ports 80 and 443 are allowed by UFW.
   - Port 80 is currently served by Apache.
   - Step 2 should avoid adding public Oracle-hosted web surfaces unless explicitly approved, because public landing pages belong on Vercel.

3. **Some services bind broadly but are partly protected by UFW/Tailscale rules.**
   - CUPS listens broadly but is not allowed by UFW.
   - A Node service listens broadly on a high port, while UFW allows that port only on `tailscale0`.
   - A Hermes process listens on a high port; public exposure should be verified before depending on it.

4. **Cloudflared Paperclip service is repeatedly failing.**
   - This may not affect this project, but recurring failed services create operational noise.
   - Do not fix or modify it unless the operator asks.

5. **Several packages are upgradable.**
   - Security-sensitive packages include AppArmor, Docker, Tailscale, cloud-init, and cloudflared.
   - Do not run upgrades without explicit operator approval because upgrades can affect running Hermes services.

6. **The `ubuntu` user is highly privileged.**
   - The account is in sudo/docker/lxd-style privileged groups.
   - Protect the SSH key and avoid placing additional secrets on disk unnecessarily.

## Step 2 Oracle Change Boundary

Allowed without additional Oracle-specific approval:

- Read-only inspection commands.
- Writing project-owned application files only when operator approves Step 2.
- Creating documentation and local build-pack artifacts.
- Planning Oracle-compatible schema changes without applying them.

Requires explicit separate approval before execution:

- Applying Oracle database schema changes.
- Creating Oracle DB users, wallets, network ACLs, or credentials.
- Uploading files to Oracle storage.
- Changing systemd services.
- Starting/stopping/restarting Hermes services.
- Installing packages.
- Running package upgrades.
- Changing firewall rules.
- Changing SSH configuration.
- Changing Docker daemon/container networking.
- Modifying `/michael-core/hermes` or existing Hermes runtime files.
- Any OCI console/CLI operation that changes instance, network, storage, or billing posture.

Strictly prohibited unless the operator explicitly overrides in a separate instruction:

- Changing the instance away from its Always Free configuration.
- Enabling paid Oracle features.
- Replacing the original Hermes installation.
- Exposing new Oracle-hosted public admin surfaces.
- Storing secrets in the repository.

## Implementation Implication

Step 2 must treat Oracle as a protected production-like environment. The default path should be:

1. Build and test contracts locally/in Vercel first.
2. Prepare Oracle DDL and Hermes integration scripts as reviewable artifacts.
3. Ask for explicit approval before applying anything to Oracle.
4. Use the existing Hermes install and block volume as an integration target, not a disposable sandbox.
