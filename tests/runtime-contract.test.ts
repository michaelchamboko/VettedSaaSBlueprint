import assert from "node:assert/strict";
import test from "node:test";
import { validateRuntimeContract } from "../scripts/verify-runtime-contract.mjs";

test("rejects a mutable direct dependency range", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=12 <13" },
      packageManager: "npm@12.0.2",
      dependencies: { next: "latest" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.2.7" } },
    },
    nodeVersionFile: "24\n",
    vercelJson: { installCommand: "npx --yes npm@12.0.2 ci" },
  });

  assert.deepEqual(result.errors, ["dependencies.next must be an exact version; received latest"]);
});

test("accepts the approved runtime contract", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=12 <13" },
      packageManager: "npm@12.0.2",
      dependencies: { next: "16.2.7" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.2.7" } },
    },
    nodeVersionFile: "24\n",
    vercelJson: { installCommand: "npx --yes npm@12.0.2 ci" },
  });

  assert.deepEqual(result.errors, []);
});

test("rejects a lockfile mismatch and wrong Node policy", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=12 <13" },
      packageManager: "npm@12.0.2",
      dependencies: { next: "16.2.7" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.2.6" } },
    },
    nodeVersionFile: "22\n",
    vercelJson: { installCommand: "npx --yes npm@12.0.2 ci" },
  });

  assert.deepEqual(result.errors, [
    "dependencies.next (16.2.7) does not match package-lock.json (16.2.6)",
    ".nvmrc must contain 24; received 22",
  ]);
});

test("rejects missing npm engine and incompatible lockfile format", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x" },
      packageManager: "npm@12.0.2",
      dependencies: { next: "16.2.7" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 2,
      packages: { "node_modules/next": { version: "16.2.7" } },
    },
    nodeVersionFile: "24\n",
    vercelJson: { installCommand: "npx --yes npm@12.0.2 ci" },
  });

  assert.deepEqual(
    [...result.errors].sort(),
    [
      "package.json engines.npm must be >=12 <13; received missing",
      "package-lock.json must use lockfileVersion 3; received 2",
    ].sort(),
  );
});

test("rejects an unapproved package manager", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=12 <13" },
      packageManager: "npm@12.0.1",
      dependencies: { next: "16.3.4" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.3.4" } },
    },
    nodeVersionFile: "24\n",
    vercelJson: { installCommand: "npx --yes npm@12.0.2 ci" },
  });

  assert.deepEqual(result.errors, [
    "package.json packageManager must be npm@12.0.2; received npm@12.0.1",
  ]);
});

test("rejects an unapproved Vercel install command", () => {
  const result = validateRuntimeContract({
    packageJson: {
      engines: { node: "24.x", npm: ">=12 <13" },
      packageManager: "npm@12.0.2",
      dependencies: { next: "16.3.4" },
      devDependencies: {},
    },
    packageLock: {
      lockfileVersion: 3,
      packages: { "node_modules/next": { version: "16.3.4" } },
    },
    nodeVersionFile: "24\n",
    vercelJson: { installCommand: "npm ci" },
  });

  assert.deepEqual(result.errors, [
    "vercel.json installCommand must be npx --yes npm@12.0.2 ci; received npm ci",
  ]);
});
