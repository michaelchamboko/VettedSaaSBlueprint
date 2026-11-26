import { readFile } from "node:fs/promises";
import { z } from "zod";
import { captureCommandExecution, captureOpenCodeExecution, captureStructuredExecution, evidenceRefSchema, storeEvidence, structuredCaptureSelectionSchema, validateExecutionEvidence } from "../src/lib/article-import/execution-evidence";
import { assertPrimaryArticleCheckout } from "../src/lib/article-import/preflight";
import { runCliMain } from "./lib/run-cli-main";

const text = z.string().min(1);
const selectionSchema = z.object({
  sessionId: text, userMessageId: text, assistantMessageId: text,
  packetId: z.string().regex(/^[a-f0-9]{64}$/), pass: text,
  input: z.record(text, z.string()), output: z.record(text, z.string()),
  inputRefs: z.array(evidenceRefSchema), outputRefs: z.array(evidenceRefSchema),
  instructionRefs: z.array(evidenceRefSchema).optional(),
}).strict();
const commandSchema = z.object({ executable: text, argv: z.array(z.string()), toolVersion: text, inputRefs: z.array(evidenceRefSchema), outputRefs: z.array(evidenceRefSchema) }).strict();

async function main() {
  const [kind, importId, selectionPath] = process.argv.slice(2);
  if (!["opencode", "command", "structured"].includes(kind) || !/^article-[0-9a-f-]{36}$/.test(importId ?? "") || !selectionPath) throw new Error("Use capture-article-execution.ts <opencode|command|structured> <import-id> <selection.json>");
  const root = process.cwd();
  await assertPrimaryArticleCheckout(root);
  const input: unknown = JSON.parse(await readFile(selectionPath, "utf8"));
  // The production path exports an existing session itself; it accepts no caller-supplied raw export.
  const execution = kind === "opencode"
    ? await captureOpenCodeExecution(root, selectionSchema.parse(input))
    : kind === "structured"
      ? await captureStructuredExecution(root, importId, structuredCaptureSelectionSchema.parse(input))
      : await captureCommandExecution(root, commandSchema.parse(input));
  const ref = await storeEvidence(root, importId, execution);
  await validateExecutionEvidence(root, ref);
  process.stdout.write(`${JSON.stringify(ref)}\n`);
}

runCliMain(main);
