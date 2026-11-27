import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

import { ARTICLE_VISUAL_QUALITY_INSTRUCTIONS } from "../src/lib/article-import/article-visual-quality";
import { articleHeroHandoff } from "../src/lib/article-import/hero-image";
import { prepareWorkerInvocation } from "../src/lib/article-import/worker-runner";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const heroInstruction = ".agents/skills/external-article-import/references/hero-imagegen.md";
const importId = "article-11223344-abcd-abcd-abcd-0123456789ab";
const idempotencyKey = "a".repeat(64);
const sourceFingerprint = "b".repeat(64);

test("every runtime visual and hero instruction is uniquely pinned to its shipped bytes", async () => {
  const root = process.cwd();
  const manifest = JSON.parse(await readFile(path.join(root, "config/article-workflow-capabilities.json"), "utf8")) as {
    files: Array<{ path: string; sha256: string }>;
  };
  const handoff = articleHeroHandoff(root, {
    importId,
    sourceFingerprint,
    format: "direct-review",
    contentApproval: { artifactFingerprint: "c".repeat(64) },
  }, { slug: "fixture-review" }, samplePageBlueprint);
  assert.equal(handoff.evidenceInstruction, heroInstruction);

  const required = new Set([...ARTICLE_VISUAL_QUALITY_INSTRUCTIONS, handoff.evidenceInstruction]);
  for (const instructionPath of required) {
    const pins = manifest.files.filter((pin) => pin.path === instructionPath);
    assert.equal(pins.length, 1, `${instructionPath} must have exactly one manifest pin`);
    const bytes = await readFile(path.join(root, instructionPath));
    assert.equal(pins[0].sha256, createHash("sha256").update(bytes).digest("hex"), `${instructionPath} pin must match shipped bytes`);
  }

  for (const sourcePath of [
    "src/lib/article-import/hero-image.ts",
    "src/lib/article-import/worker-presentation.ts",
    "src/lib/article-import/workflow-evidence.ts",
  ]) {
    const source = await readFile(path.join(root, sourcePath), "utf8");
    const heroPaths = source.match(/\.agents\/skills\/external-article-import\/references\/hero-imagegen\.md/g) ?? [];
    assert.ok(heroPaths.length > 0, `${sourcePath} must retain the tracked hero instruction`);
    assert.ok(heroPaths.every((candidate) => candidate === heroInstruction));
  }
});

test("the active validation worker requests V3 and the current path-based receipt contract", async (t) => {
  const packet = {
    schemaVersion: "ImportSupervisedWorkV1",
    importId,
    idempotencyKey,
    sourceFingerprint,
    sourcePath: `.automation/article-imports/${importId}.source.md`,
    requirementRevision: "fixture",
    stage: "VALIDATING",
    record: {
      importId,
      format: "direct-review",
      evidenceRefs: {},
    },
  };
  const invocation = await prepareWorkerInvocation(process.cwd(), "fixture-validation.work.json", packet, {
    executable: "opencode",
    model: "fixture/model",
  }, "11111111-1111-1111-1111-111111111111");
  t.after(() => rm(invocation.cwd, { recursive: true, force: true }));

  const prompt = invocation.args.at(-1) ?? "";
  assert.match(prompt, /Return WorkflowEvidenceV3/);
  assert.match(prompt, /WorkflowEvidenceV1\/V2 are historical-only/);
  assert.match(prompt, /validation receipt/);

  const controller = await readFile(path.join(process.cwd(), "src/lib/article-import/supervised-executor.ts"), "utf8");
  assert.match(controller, /stage: z\.literal\("VALIDATING"\), validationGate: file, validationReceiptPath: file, presentationEvidencePath: file/);
  assert.match(controller, /schemaVersion !== "WorkflowEvidenceV3"\) throw new Error\("PRESENTATION_CURRENT_POLICY_REQUIRED"\)/);
});
