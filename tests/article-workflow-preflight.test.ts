import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertPrimaryArticleCheckout, inspectArticlePreflight, withArticleExecution } from "../src/lib/article-import/preflight";
import { prepareCommandCheckout } from "./fixtures/article-command";

test("preflight is read-only, checks pinned bytes and requires the exact Beam model family", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-preflight-"));
  const files = [];
  for (const skill of ["impeccable", "design-taste-frontend", "eleanor-editorial"]) {
    const file = `.agents/skills/${skill}/SKILL.md`;
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), "fixture instructions");
    files.push({ path: file, sha256: createHash("sha256").update("fixture instructions").digest("hex") });
  }
  await mkdir(path.join(root, "config"));
  const manifestPath = path.join(root, "config/article-workflow-capabilities.json");
  const manifest = { schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "1.19.4", modelFamilies: {}, files };
  await writeFile(manifestPath, JSON.stringify(manifest));
  const before = await readdir(root, { recursive: true });
  const probe = async (tool: string) => tool === "opencode" ? "1.19.4" : "Python 3.13.0";
  assert.equal((await inspectArticlePreflight(root, probe)).diagnostics[0].code, "MODEL_FAMILIES_UNCONFIGURED");
  assert.deepEqual(await readdir(root, { recursive: true }), before);
  assert.equal(await readFile(manifestPath, "utf8"), JSON.stringify(manifest));
  await writeFile(manifestPath, JSON.stringify({ ...manifest, modelFamilies: { "fixture/a": "a", "fixture/b": "b" } }));
  assert.equal((await inspectArticlePreflight(root, probe)).diagnostics.some(d => d.code === "MODEL_FAMILIES_UNCONFIGURED"), true);
  await writeFile(manifestPath, JSON.stringify({ ...manifest, modelFamilies: { "opencode-go/beam-free": "reflection-beam" } }));
  assert.equal((await inspectArticlePreflight(root, probe)).ok, true);
  await writeFile(manifestPath, JSON.stringify({ ...manifest, openCodeVersion: "2.2.5", modelFamilies: { "opencode-go/beam-free": "reflection-beam" } }));
  assert.equal((await inspectArticlePreflight(root, async tool => tool === "opencode" ? "opencode v2.2.5" : "Python 3.13.0")).ok, true);
  assert.equal((await inspectArticlePreflight(root, probe)).ok, false);
  assert.equal((await inspectArticlePreflight(root, async tool => tool === "opencode" ? "opencode v2.2.6" : "Python 3.13.0")).ok, false);
  await writeFile(manifestPath, JSON.stringify({ ...manifest, openCodeVersion: "2.3.0", modelFamilies: { "opencode-go/beam-free": "reflection-beam" } }));
  assert.equal((await inspectArticlePreflight(root, async tool => tool === "opencode" ? "opencode v2.3.0" : "Python 3.13.0")).ok, true);
  assert.equal((await inspectArticlePreflight(root, async tool => tool === "opencode" ? "opencode v2.3.1" : "Python 3.13.0")).ok, false);
  await writeFile(path.join(root, files[0].path), "changed");
  assert.equal((await inspectArticlePreflight(root, probe)).ok, false);
});

test("secondary checkout cannot run a production mutation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-worktree-"));
  await writeFile(path.join(root, ".git"), "gitdir: /fixture/worktrees/other");
  await assert.rejects(assertPrimaryArticleCheckout(root), /PRIMARY_CHECKOUT_REQUIRED/);
  assert.deepEqual(await readdir(root), [".git"]);
});

test("Refining preflight accepts a verified neutral exporter without OpenCode or model registration", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-refining-preflight-"));
  const files = [];
  for (const skill of ["impeccable", "design-taste-frontend", "eleanor-editorial"]) {
    const file = `.agents/skills/${skill}/SKILL.md`;
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), "fixture instructions");
    files.push({ path: file, sha256: createHash("sha256").update("fixture instructions").digest("hex") });
  }
  await mkdir(path.join(root, "config"));
  await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({
    schemaVersion: "ArticleWorkflowCapabilitiesV1", designEvidenceVersion: 2, modelFamilies: {}, files,
    executionExporters: { neutral: { executable: "neutral-exporter", versionArgs: ["--version"], toolName: "neutral", toolVersion: "neutral 1", exportArgs: ["export", "{contextId}", "{exchangeId}"] } },
  }));
  const calls: string[] = [];
  const result = await inspectArticlePreflight(root, async (tool) => {
    calls.push(tool);
    if (tool === "python") return "Python 3.13.0";
    if (tool === "neutral-exporter") return "neutral 1";
    throw new Error("OpenCode must not be probed for scoped Refining preflight");
  }, "REFINING");
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["neutral-exporter", "python"]);
  assert.equal((await inspectArticlePreflight(root, async (tool) => tool === "python" ? "Python 3.13.0" : tool === "neutral-exporter" ? "neutral 1" : Promise.reject(new Error("missing")))).ok, false);
});

test("Refining OpenCode fallback accepts a registered alternative model without Beam", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-refining-opencode-"));
  const files = [];
  for (const skill of ["impeccable", "design-taste-frontend", "eleanor-editorial"]) {
    const file = `.agents/skills/${skill}/SKILL.md`;
    await mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await writeFile(path.join(root, file), "fixture instructions");
    files.push({ path: file, sha256: createHash("sha256").update("fixture instructions").digest("hex") });
  }
  await mkdir(path.join(root, "config"));
  await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({
    schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "2.2.6", modelFamilies: { "openai/gpt-test": "gpt-test" }, files,
  }));
  const calls: string[] = [];
  const result = await inspectArticlePreflight(root, async (tool) => {
    calls.push(tool);
    return tool === "opencode" ? "opencode v2.2.6" : "Python 3.13.0";
  }, "REFINING");
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["opencode", "python"]);
});

test("nested execution rechecks capabilities when the productive stage changes", async () => {
  await mkdir(path.join(process.cwd(), ".scratch"), { recursive: true });
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", "article-stage-preflight-"));
  try {
    await prepareCommandCheckout(root);
    const manifestPath = path.join(root, "config/article-workflow-capabilities.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    await writeFile(manifestPath, JSON.stringify({
      ...manifest,
      executionExporters: { neutral: { executable: "neutral-exporter", versionArgs: ["--version"], toolName: "neutral", toolVersion: "neutral 1", exportArgs: ["export", "{contextId}", "{exchangeId}"] } },
    }));
    const calls: string[] = [];
    const probe = async (tool: string) => {
      calls.push(tool);
      if (tool === "neutral-exporter") return "neutral 1";
      if (tool === "opencode") return manifest.openCodeVersion;
      return "Python 3.13.0";
    };
    await withArticleExecution(root, async () => {
      await withArticleExecution(root, async () => undefined);
      await withArticleExecution(root, async () => undefined, probe, "VALIDATING");
    }, probe, "REFINING");
    assert.deepEqual(calls, ["neutral-exporter", "python", "opencode", "python"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
