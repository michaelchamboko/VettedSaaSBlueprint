import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { isV2VisualManifest } from "../scripts/run-landing-visual";

const execFileAsync = promisify(execFile);
const summaryPath = path.join(process.cwd(), ".stage2", "landing-visual", "no-v2-pages", "summary.json");

test("zero-page visual CLI executes without Chromium or server startup and writes its no-op summary", async () => {
  const startedAt = Date.now();
  const { stdout, stderr } = await execFileAsync(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/run-landing-visual.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(process.cwd(), ".stage2", "missing-browser-binaries"), LANDING_VISUAL_FORBID_SERVER: "1", LANDING_VISUAL_FORBID_PLAYWRIGHT_IMPORT: "1" },
    timeout: 20_000,
  });
  assert.equal(stderr, "");
  assert.doesNotMatch(stdout, /next start|chromium/i);
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  assert.deepEqual({ page_count: summary.page_count, status: summary.status, skipped_server: summary.skipped_server }, { page_count: 0, status: "pass", skipped_server: true });
  assert.ok((await stat(summaryPath)).mtimeMs >= startedAt);
});

test("malformed V2 batch directories fail preflight instead of becoming a zero-page no-op", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "invalid-v2-preflight-"));
  const batchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  await mkdir(path.join(root, batchId));
  await writeFile(path.join(root, batchId, "manifest.json"), JSON.stringify({ schema_version: "CodexLandingBatchV2", batch_id: batchId, pages: [] }));
  await assert.rejects(
    execFileAsync(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/count-v2-visual-pages.ts", "--batch-root", root], { cwd: process.cwd(), timeout: 20_000 }),
    /manifest|V2|contract|validation/i,
  );
});

test("a manifest under a non-UUID directory fails preflight instead of becoming a zero-page no-op", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "invalid-batch-directory-"));
  const directory = path.join(root, "provisional-draft");
  await mkdir(directory);
  await writeFile(path.join(directory, "manifest.json"), JSON.stringify({ schema_version: "CodexLandingBatchV1", batch_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }));

  await assert.rejects(
    execFileAsync(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/count-v2-visual-pages.ts", "--batch-root", root], { cwd: process.cwd(), timeout: 20_000 }),
    /directory|UUID/i,
  );
});

test("a V1 or V2 manifest whose batch ID differs from its UUID directory fails preflight", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mismatched-batch-directory-"));
  const directoryBatchId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  await mkdir(path.join(root, directoryBatchId));
  await writeFile(path.join(root, directoryBatchId, "manifest.json"), JSON.stringify({ schema_version: "CodexLandingBatchV1", batch_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }));

  await assert.rejects(
    execFileAsync(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/count-v2-visual-pages.ts", "--batch-root", root], { cwd: process.cwd(), timeout: 20_000 }),
    /directory|batch ID|does not match/i,
  );
});

test("non-batch directories without manifest.json are ignored", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "non-batch-directory-"));
  await mkdir(path.join(root, "notes"));
  const { stdout } = await execFileAsync(process.execPath, [path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs"), "scripts/count-v2-visual-pages.ts", "--batch-root", root], { cwd: process.cwd(), timeout: 20_000 });
  assert.equal(stdout.trim(), "0");
});

test("identifies Batch V2 manifests for final visual verification", () => {
  assert.equal(isV2VisualManifest({ schema_version: "CodexLandingBatchV1" }), false);
  assert.equal(isV2VisualManifest({ schema_version: "CodexLandingBatchV2" }), true);
});
