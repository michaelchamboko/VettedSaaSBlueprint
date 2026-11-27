import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  captureStructuredExecution,
  extractStructuredExecution,
  readEvidence,
  storeEvidence,
  structuredCaptureSelectionSchema,
  validateExecutionEvidence,
} from "../src/lib/article-import/execution-evidence";

const importId = "article-00000000-0000-4000-8000-000000000001";

test("configured exporter capture validates and caller-authored projections are rejected", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "structured-capture-"));
  try {
    await mkdir(path.join(root, "config"), { recursive: true });
    const exporter = path.resolve("tests/fixtures/structured-execution-exporter.mjs");
    const configured = {
      executable: process.execPath,
      versionArgs: [exporter, "--version"],
      toolName: "fixture-neutral",
      toolVersion: "fixture-exporter 1",
      exportArgs: [exporter, "export", "{contextId}", "{exchangeId}"],
    };
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({
      schemaVersion: "ArticleWorkflowCapabilitiesV1",
      modelFamilies: {},
      executionExporters: { fixture: configured },
    }));
    const selection = { exporterId: "fixture", contextId: "context-independent", exchangeId: "exchange-1" };
    const captured = await captureStructuredExecution(root, importId, selection);
    if (captured.kind !== "structured") throw new Error("Expected structured execution");
    const ref = await storeEvidence(root, importId, captured);
    assert.equal((await validateExecutionEvidence(root, ref)).kind, "structured");
    assert.throws(() => structuredCaptureSelectionSchema.parse({ exportPath: "caller-authored.json" }));

    const { sourceRef: _missing, ...withoutSource } = captured;
    void _missing;
    await assert.rejects(validateExecutionEvidence(root, await storeEvidence(root, importId, withoutSource)));

    const source = await readEvidence(root, captured.sourceRef) as Record<string, unknown>;
    const spoofedSource = { ...source, output: { judgment: "caller-authored approval" } };
    const spoofedRef = await storeEvidence(root, importId, spoofedSource);
    const spoofed = extractStructuredExecution(spoofedSource, spoofedRef, {
      executable: configured.executable,
      argv: [exporter, "export", selection.contextId, selection.exchangeId],
    });
    await assert.rejects(
      validateExecutionEvidence(root, await storeEvidence(root, importId, spoofed)),
      /EXECUTION_REPLAY_MISMATCH/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
