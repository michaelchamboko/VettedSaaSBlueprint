#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function gitBlobSha1(bytes) {
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

export function normaliseRepositoryUrl(value) {
  return value.trim().replace(/\\/g, "/").replace(/\.git\/?$/i, "").replace(/\/$/, "");
}

export function parseGitTree(output) {
  const files = {};
  for (const row of output.split("\0")) {
    if (!row) continue;
    const match = /^(\d{6}) (\w+) ([0-9a-f]{40})\t([\s\S]+)$/.exec(row);
    if (!match) throw new Error(`Cannot parse git tree row: ${JSON.stringify(row)}`);
    const [, mode, type, object, path] = match;
    if (type !== "blob") throw new Error(`Pinned upstream entry is not a blob: ${path} (${type})`);
    files[path] = { mode, gitBlobSha1: object };
  }
  return files;
}

function describeTreeDifference(expected, actual) {
  const expectedPaths = new Set(Object.keys(expected));
  const actualPaths = new Set(Object.keys(actual));
  const missing = [...expectedPaths].filter((path) => !actualPaths.has(path)).sort();
  const added = [...actualPaths].filter((path) => !expectedPaths.has(path)).sort();
  const changed = [...expectedPaths]
    .filter((path) => actualPaths.has(path))
    .filter((path) => expected[path].mode !== actual[path].mode || expected[path].gitBlobSha1 !== actual[path].gitBlobSha1)
    .sort();
  return { missing, added, changed };
}

export function assertTreesEqual(expected, actual) {
  const difference = describeTreeDifference(expected, actual);
  if (difference.missing.length || difference.added.length || difference.changed.length) {
    throw new Error(`Pinned upstream tree drift: ${JSON.stringify(difference)}`);
  }
}

export function verifyLocalPin(root = skillRoot) {
  const manifest = JSON.parse(readFileSync(resolve(root, "UPSTREAM.json"), "utf8"));
  const tree = JSON.parse(readFileSync(resolve(root, "UPSTREAM_TREE.json"), "utf8"));
  if (manifest.repository !== tree.repository || manifest.commit !== tree.commit) {
    throw new Error("UPSTREAM.json and UPSTREAM_TREE.json identify different upstream revisions");
  }

  const verified = [];
  for (const [path, record] of Object.entries(manifest.files ?? {})) {
    const upstreamRecord = tree.files?.[path];
    if (!upstreamRecord) throw new Error(`Vendored file is absent from the complete upstream tree: ${path}`);
    if (record.gitBlobSha1 !== upstreamRecord.gitBlobSha1) {
      throw new Error(`Manifest hash differs from the complete upstream tree: ${path}`);
    }
    const actual = gitBlobSha1(readFileSync(resolve(root, path)));
    if (actual !== record.gitBlobSha1) throw new Error(`Vendored file bytes drifted: ${path}`);
    verified.push(path);
  }
  if (verified.length === 0) throw new Error("UPSTREAM.json contains no vendored files");

  return { manifest, tree, verified };
}

function git(checkout, args, encoding = "utf8") {
  return execFileSync("git", ["-C", checkout, ...args], { encoding, stdio: ["ignore", "pipe", "pipe"] });
}

export function verifyPinnedCheckout(checkout, pin = verifyLocalPin()) {
  const resolvedCheckout = resolve(checkout);
  const head = git(resolvedCheckout, ["rev-parse", "HEAD"]).trim();
  if (head !== pin.manifest.commit) {
    throw new Error(`Upstream checkout HEAD is ${head}; expected ${pin.manifest.commit}`);
  }
  const origin = git(resolvedCheckout, ["config", "--get", "remote.origin.url"]).trim();
  if (normaliseRepositoryUrl(origin) !== normaliseRepositoryUrl(pin.manifest.repository)) {
    throw new Error(`Upstream checkout origin is ${origin}; expected ${pin.manifest.repository}`);
  }
  const status = git(resolvedCheckout, ["status", "--porcelain"]);
  if (status.trim()) throw new Error("Upstream checkout has uncommitted changes");
  const actualTree = parseGitTree(git(resolvedCheckout, ["ls-tree", "-rz", "--full-tree", "HEAD"], "utf8"));
  assertTreesEqual(pin.tree.files, actualTree);
  return { checkout: resolvedCheckout, head, origin, upstreamFiles: Object.keys(actualTree).length };
}

function parseArguments(argv) {
  if (argv.length === 0) return {};
  if (argv.length === 2 && argv[0] === "--upstream-checkout") return { upstreamCheckout: argv[1] };
  throw new Error("Usage: node verify-upstream.mjs [--upstream-checkout <trusted-pinned-checkout>]");
}

export function run(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const pin = verifyLocalPin();
  const result = {
    commit: pin.manifest.commit,
    vendoredFiles: pin.verified.length,
    recordedUpstreamFiles: Object.keys(pin.tree.files).length,
  };
  if (options.upstreamCheckout) result.checkout = verifyPinnedCheckout(options.upstreamCheckout, pin);
  return result;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(run(), null, 2));
  } catch (error) {
    console.error(`verify-upstream: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
