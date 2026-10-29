---
name: repo-discovery
description: Use when a task needs unfamiliar architecture, flow, dependency, convention, or blast-radius context.
---

# Repository discovery

1. Confirm the selected checkout and build its deterministic snapshot with `npm run intelligence:sync`.
2. When the snapshot has been applied to Neon, use `npm run intelligence:impact -- --snapshot <sha256> --node <id> --depth <0-8>` for a bounded relationship neighbourhood.
3. Inspect every returned source, configuration, symbol, and test directly. Database relationships are navigation evidence, not semantic authority.
4. Use `rg`, Git history, TypeScript imports, route inventories, and affected tests to check for relationships the snapshot parser does not model.
5. Record stack, conventions, reusable code, risks, test locations, snapshot identity, and deployment boundaries in `build-pack/04-existing-codebase-discovery.md`.
6. Run the simplicity audit only when existing-code bloat is relevant to the approved scope.

If Neon is unavailable, report that limitation and use the same deterministic snapshot plus direct repository evidence. Do not replace missing evidence with guesses.
