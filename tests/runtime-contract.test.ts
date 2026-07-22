import assert from "node:assert/strict";
import test from "node:test";
import { validateRuntimeContract } from "../scripts/verify-runtime-contract.mjs";

test("rejects a mutable direct dependency range", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=11 <12" },
      dependencies: { next: "latest" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.2.7" } },
    },
    workflowText: "node-version: 24",
    nodeVersionFile: "24\n",
  });

  assert.deepEqual(result.errors, ["dependencies.next must be an exact version; received latest"]);
});

test("accepts the approved runtime contract", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=11 <12" },
      dependencies: { next: "16.2.7" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.2.7" } },
    },
    workflowText: "node-version: 24\nnode-version: 24",
    nodeVersionFile: "24\n",
  });

  assert.deepEqual(result.errors, []);
});

test("rejects a lockfile mismatch and wrong CI runtime", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=11 <12" },
      dependencies: { next: "16.2.7" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.2.6" } },
    },
    workflowText: "node-version: 22",
    nodeVersionFile: "22\n",
  });

  assert.deepEqual(result.errors, [
    "dependencies.next (16.2.7) does not match package-lock.json (16.2.6)",
    ".nvmrc must contain 24; received 22",
    ".github/workflows/preview-build.yml contains node-version values other than 24",
  ]);
});

test("rejects missing npm engine and incompatible lockfile format", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x" },
      dependencies: { next: "16.2.7" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 2,
      packages: { "node_modules/next": { version: "16.2.7" } },
    },
    workflowText: "node-version: 24",
    nodeVersionFile: "24\n",
  });

  assert.deepEqual(result.errors, [
    "package.json engines.npm must be >=11 <12; received missing",
    "package-lock.json must use lockfileVersion 3; received 2",
  ]);
});
