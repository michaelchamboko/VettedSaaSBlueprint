import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { assertPrimaryArticleCheckout, inspectArticlePreflight } from "../src/lib/article-import/preflight";

test("preflight is read-only, checks pinned bytes and requires two known model families", async () => {
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
  assert.equal((await inspectArticlePreflight(root, probe)).ok, true);
  await writeFile(path.join(root, files[0].path), "changed");
  assert.equal((await inspectArticlePreflight(root, probe)).ok, false);
});

test("secondary checkout cannot run a production mutation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "article-worktree-"));
  await writeFile(path.join(root, ".git"), "gitdir: /fixture/worktrees/other");
  await assert.rejects(assertPrimaryArticleCheckout(root), /PRIMARY_CHECKOUT_REQUIRED/);
  assert.deepEqual(await readdir(root), [".git"]);
});
