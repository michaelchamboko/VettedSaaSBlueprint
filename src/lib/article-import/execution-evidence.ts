import { createHash } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, realpath, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { normalizeOpenCodeVersion, openCodeExecutable, openCodeExportArgs, openCodeVersionSchema } from "./opencode-runtime";

export const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const evidenceRefSchema = z.object({ path: z.string().min(1), sha256: hashSchema }).strict();
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;
const MAX_EVIDENCE_BYTES = 16 * 1024 * 1024;
export const frozenFileSchema = z.object({ path: z.string().min(1), sha256: hashSchema, archiveRef: evidenceRefSchema }).strict();
export type FrozenFile = z.infer<typeof frozenFileSchema>;
const snapshotReads = new AsyncLocalStorage<ReadonlyMap<string, FrozenFile>>();
export const isEvidenceSnapshotActive = (): boolean => snapshotReads.getStore() !== undefined;
const terminalSnapshotReads = new AsyncLocalStorage<boolean>();
const isTerminalEvidenceSnapshotActive = (): boolean => terminalSnapshotReads.getStore() === true;
const normalized = (value: string) => value.replaceAll("\\", "/");

export function withEvidenceSnapshot<T>(files: FrozenFile[], work: () => Promise<T>): Promise<T> {
  const map = new Map<string, FrozenFile>();
  for (const raw of files) {
    const item = frozenFileSchema.parse(raw);
    if (item.sha256 !== item.archiveRef.sha256 || map.has(normalized(item.path))) throw new Error("SNAPSHOT_REFERENCE_INVALID");
    map.set(normalized(item.path), item);
  }
  return snapshotReads.run(map, work);
}
/** Historical terminal inspection context: snapshot is active AND missing replay may be tolerated. Nonrecursive; fail-closed after callback. */
export function withTerminalEvidenceSnapshot<T>(files: FrozenFile[], work: () => Promise<T>): Promise<T> {
  return withEvidenceSnapshot(files, () => terminalSnapshotReads.run(true, work));
}

export async function readEvidenceBytes(root: string, file: string): Promise<Buffer> {
  const base = await realpath(root);
  const snapshot = snapshotReads.getStore();
  const logicalPath = normalized(path.relative(base, path.resolve(base, file)));
  const frozen = snapshot?.get(logicalPath);
  // Historical checks must never silently fall back to a mutable current file.
  if (snapshot && !frozen) throw new Error(`SNAPSHOT_REFERENCE_MISSING:${logicalPath}`);
  const candidate = await realpath(path.resolve(base, frozen?.archiveRef.path ?? file));
  const relative = path.relative(base, candidate);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("EVIDENCE_PATH_ESCAPE");
  const metadata = await stat(candidate);
  if (!metadata.isFile() || metadata.size > MAX_EVIDENCE_BYTES) throw new Error("EVIDENCE_FILE_INVALID");
  const bytes = await readFile(candidate);
  if (bytes.length > MAX_EVIDENCE_BYTES) throw new Error("EVIDENCE_FILE_INVALID");
  if (frozen && sha256(bytes) !== frozen.sha256) throw new Error("SNAPSHOT_BYTES_CHANGED");
  return bytes;
}
export async function evidenceReference(root: string, file: string): Promise<EvidenceRef> {
  const bytes = await readEvidenceBytes(root, file);
  return { path: path.relative(await realpath(root), await realpath(path.resolve(root, file))).replaceAll("\\", "/"), sha256: sha256(bytes) };
}
export async function readEvidence(root: string, reference: EvidenceRef): Promise<unknown> {
  const bytes = await readVerifiedEvidenceBytes(root, reference);
  return JSON.parse(bytes.toString("utf8"));
}
export async function readVerifiedEvidenceBytes(root: string, reference: EvidenceRef): Promise<Buffer> {
  const ref = evidenceRefSchema.parse(reference);
  const bytes = await readEvidenceBytes(root, ref.path);
  if (sha256(bytes) !== ref.sha256) throw new Error("EVIDENCE_HASH_MISMATCH");
  return bytes;
}
export async function verifyEvidenceRef(root: string, reference: EvidenceRef): Promise<void> {
  await readVerifiedEvidenceBytes(root, reference);
}
/** Only the producer writes; evaluators never create directories or rewrite evidence. */
export async function storeEvidence(root: string, importId: string, value: unknown): Promise<EvidenceRef> {
  return storeEvidenceBytes(root, importId, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}
export async function storeEvidenceBytes(root: string, importId: string, bytes: Buffer, extension: "png" | "webp" | "json" = "json"): Promise<EvidenceRef> {
  if (!/^article-[0-9a-f-]{36}$/.test(importId)) throw new Error("EVIDENCE_IMPORT_ID_INVALID");
  if (bytes.length > MAX_EVIDENCE_BYTES) throw new Error("EVIDENCE_FILE_INVALID");
  const digest = sha256(bytes);
  const relative = `.automation/article-imports/evidence/${importId}/${digest}.${extension}`;
  await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
  const parent = await realpath(path.dirname(path.join(root, relative)));
  const base = await realpath(root);
  const rel = path.relative(base, parent);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error("EVIDENCE_PATH_ESCAPE");
  await writeFile(path.join(root, relative), bytes, { flag: "wx" }).catch(async (error: unknown) => {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    await verifyEvidenceRef(root, { path: relative, sha256: digest });
  });
  return { path: relative, sha256: digest };
}

/** Freeze exact referenced bytes; do not rewrite JSON or the recorded judgment text. */
export async function freezeEvidenceGraph(root: string, importId: string, refs: EvidenceRef[]): Promise<FrozenFile[]> {
  const files = new Map<string, FrozenFile>();
  const queue = [...refs, await evidenceReference(root, "config/article-workflow-capabilities.json")].map((ref) => ({ ref, opaque: false }));
  while (queue.length) {
    if (files.size > 4096) throw new Error("EVIDENCE_GRAPH_TOO_LARGE");
    const entry = queue.shift()!;
    const ref = evidenceRefSchema.parse(entry.ref);
    const key = normalized(path.relative(await realpath(root), path.resolve(root, ref.path)));
    const prior = files.get(key);
    if (prior) { if (prior.sha256 !== ref.sha256) throw new Error("EVIDENCE_GRAPH_CONFLICT"); continue; }
    const bytes = await readEvidenceBytes(root, ref.path);
    if (sha256(bytes) !== ref.sha256) throw new Error("EVIDENCE_HASH_MISMATCH");
    const archiveRef = await storeEvidenceBytes(root, importId, bytes);
    files.set(key, { path: key, sha256: ref.sha256, archiveRef });
    if (entry.opaque) continue;
    let value: unknown;
    try { value = JSON.parse(bytes.toString("utf8")); } catch { continue; }
    if (value && typeof value === "object" && "schemaVersion" in value && value.schemaVersion === "RenderingInputsV1") {
      // Renderer inventory is exhaustive. JSON files in it are application data,
      // whose {path, sha256} values may be catalogue-relative rather than evidence links.
      const inventory = z.object({ files: z.array(evidenceRefSchema) }).passthrough().parse(value);
      queue.push(...inventory.files.map((ref) => ({ ref, opaque: true })));
      continue;
    }
    const collect = (item: unknown): void => {
      if (!item || typeof item !== "object") return;
      const parsed = evidenceRefSchema.safeParse(item);
      if (parsed.success) { queue.push({ ref: parsed.data, opaque: false }); return; }
      for (const child of Object.values(item)) collect(child);
    };
    collect(value);
  }
  return [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
}

const base = {
  schemaVersion: z.literal("ExecutionEvidenceV1"), toolVersion: z.string().min(1),
  startedAt: z.string().datetime({ offset: true }), completedAt: z.string().datetime({ offset: true }),
  inputRefs: z.array(evidenceRefSchema), outputRefs: z.array(evidenceRefSchema),
};
const projection = z.record(z.string().min(1), z.string());
const capturedInstructionSchema = evidenceRefSchema.extend({ text: z.string() }).strict();
export const structuredExecutionExportSchema = z.object({
  schemaVersion: z.literal("StructuredExecutionExportV1"),
  exporterId: z.string().min(1),
  tool: z.object({ name: z.string().min(1), version: z.string().min(1) }).strict(),
  contextId: z.string().min(1), exchangeId: z.string().min(1),
  startedAt: z.string().datetime({ offset: true }), completedAt: z.string().datetime({ offset: true }),
  status: z.literal("succeeded"), providerId: z.string().min(1).optional(), modelId: z.string().min(1).optional(),
  packetId: hashSchema, pass: z.string().min(1), input: projection, output: projection,
  instructions: z.array(capturedInstructionSchema), inputRefs: z.array(evidenceRefSchema), outputRefs: z.array(evidenceRefSchema),
}).strict();
export const structuredCaptureSelectionSchema = z.object({
  exporterId: z.string().min(1), contextId: z.string().min(1), exchangeId: z.string().min(1),
}).strict();
export const executionEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("command"), executable: z.string().min(1), argv: z.array(z.string()), cwd: z.string().min(1), stdout: z.string(), stderr: z.string(), exitCode: z.number().int() }).strict(),
  z.object({ ...base, kind: z.literal("browser"), target: z.string().url(), routes: z.array(z.string().startsWith("/")).min(1), viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), reducedMotion: z.boolean() }).strict(), checks: z.record(z.string(), z.boolean()), screenshots: z.array(evidenceRefSchema).min(1) }).strict(),
  z.object({ ...base, kind: z.literal("opencode"), imageRefs: z.array(evidenceRefSchema).min(1).max(24).optional(), toolVersion: openCodeVersionSchema, sessionId: z.string().min(1), userMessageId: z.string().min(1), assistantMessageId: z.string().min(1), providerId: z.string().min(1), modelId: z.string().min(1), family: z.string().min(1), packetId: hashSchema, pass: z.string().min(1), input: projection, output: projection, inputDigest: hashSchema, outputDigest: hashSchema, instructions: z.array(capturedInstructionSchema), replay: z.object({ export: z.unknown(), inputRefs: z.array(evidenceRefSchema), outputRefs: z.array(evidenceRefSchema) }).strict().optional() }).strict(),
  z.object({ ...base, kind: z.literal("structured"), exporterId: z.string().min(1), exporterExecutable: z.string().min(1), exporterArgv: z.array(z.string()), toolName: z.string().min(1), contextId: z.string().min(1), exchangeId: z.string().min(1), providerId: z.string().min(1).optional(), modelId: z.string().min(1).optional(), packetId: hashSchema, pass: z.string().min(1), input: projection, output: projection, inputDigest: hashSchema, outputDigest: hashSchema, instructions: z.array(capturedInstructionSchema), sourceRef: evidenceRefSchema }).strict(),
]);
export type ExecutionEvidence = z.infer<typeof executionEvidenceSchema>;
export const proseProjectionDigest = (value: Record<string, string>): string => sha256(JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))));

export function extractStructuredExecution(source: unknown, sourceRef: EvidenceRef, provenance: { executable: string; argv: string[] }): ExecutionEvidence {
  const selected = structuredExecutionExportSchema.parse(source);
  if (Date.parse(selected.completedAt) < Date.parse(selected.startedAt)) throw new Error("EXECUTION_INCOMPLETE");
  return executionEvidenceSchema.parse({
    schemaVersion: "ExecutionEvidenceV1", kind: "structured", exporterId: selected.exporterId, exporterExecutable: provenance.executable, exporterArgv: provenance.argv, toolName: selected.tool.name, toolVersion: selected.tool.version,
    contextId: selected.contextId, exchangeId: selected.exchangeId, startedAt: selected.startedAt, completedAt: selected.completedAt,
    ...(selected.providerId && { providerId: selected.providerId }), ...(selected.modelId && { modelId: selected.modelId }),
    packetId: selected.packetId, pass: selected.pass, input: selected.input, output: selected.output,
    inputDigest: proseProjectionDigest(selected.input), outputDigest: proseProjectionDigest(selected.output),
    instructions: selected.instructions, inputRefs: selected.inputRefs, outputRefs: selected.outputRefs, sourceRef,
  });
}

type ExportSelection = { imageRefs?: EvidenceRef[]; version: string; sessionId: string; userMessageId: string; assistantMessageId: string; packetId: string; pass: string; input: Record<string, string>; output: Record<string, string>; families: Readonly<Record<string, string>>; inputRefs?: EvidenceRef[]; outputRefs?: EvidenceRef[]; instructions?: z.infer<typeof capturedInstructionSchema>[] };

const attachmentPolicy = {
  "hero-image-inspection": { mime: "image/webp", extension: ".webp" },
  "design:critique": { mime: "image/png", extension: ".png" },
  "design:audit": { mime: "image/png", extension: ".png" },
  "design:polish": { mime: "image/png", extension: ".png" },
  "design:visual-quality": { mime: "image/png", extension: ".png" },
} as const;

function hasMediaSignature(bytes: Buffer, mime: "image/png" | "image/webp"): boolean {
  if (mime === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP" && bytes.readUInt32LE(4) === bytes.length - 8;
}
/** V2 has no parentID. Only a dedicated, completed session establishes association. */
function dedicatedV2Exchange(raw: unknown, selected: ExportSelection) {
  const object = z.record(z.string(), z.unknown()).parse(raw);
  const payload = "data" in object ? z.object({ data: z.unknown() }).strict().parse(object).data : object;
  const model = z.object({ providerID: z.string().min(1), id: z.string().min(1), variant: z.string().optional() }).strict();
  const time = z.object({ created: z.number().nonnegative() }).strict();
  const envelope = z.object({
    info: z.object({ id: z.string(), model, outcome: z.literal("succeeded"), parentID: z.never().optional(), fork: z.never().optional(), revert: z.never().optional() }).passthrough(),
    messages: z.tuple([
      z.object({ id: z.string(), type: z.literal("user"), text: z.string(), time, files: z.array(z.object({ data: z.string(), mime: z.enum(["image/png", "image/webp"]), name: z.string(), source: z.object({type:z.literal("inline")}).strict() }).strict()).max(24).optional() }).strict(),
      z.object({ id: z.string(), type: z.literal("assistant"), model,
        time: z.object({ created: z.number().nonnegative(), streamed: z.number().nonnegative(), completed: z.number().nonnegative() }).strict(),
        finish: z.literal("stop"), rawFinish: z.literal("stop").optional(), agent: z.string().optional(),
        cost: z.number().optional(), tokens: z.record(z.string(), z.unknown()).optional(),
        snapshot: z.unknown().optional(),
        content: z.array(z.union([
          z.object({ type: z.literal("text"), text: z.string() }).strict(),
          z.object({ type: z.literal("reasoning"), text: z.string(), native: z.record(z.string(), z.unknown()).optional(), time: z.object({ created: z.number(), completed: z.number() }).strict().optional() }).strict(),
        ])),
      }).strict(),
      z.object({ id: z.string(), type: z.literal("idle"), outcome: z.literal("succeeded"), time }).strict(),
    ]),
  }).strict().parse(payload);
  const [user, assistant, idle] = envelope.messages;
  const images = selected.imageRefs ?? [];
  const files = user.files ?? [];
  const policy = attachmentPolicy[selected.pass as keyof typeof attachmentPolicy];
  if (files.length !== images.length || (files.length && !policy)) throw new Error("EXECUTION_IMAGE_BINDING");
  for (const [index, image] of images.entries()) {
    const file = files[index];
    const bytes = Buffer.from(file.data, "base64");
    if (!policy || bytes.length > MAX_EVIDENCE_BYTES || bytes.toString("base64") !== file.data || file.mime !== policy.mime ||
        path.extname(image.path).toLowerCase() !== policy.extension || path.extname(file.name).toLowerCase() !== policy.extension || !hasMediaSignature(bytes, policy.mime) ||
        file.name !== path.basename(image.path) || sha256(bytes) !== image.sha256 ||
        !selected.inputRefs?.some(ref => ref.path === image.path && ref.sha256 === image.sha256)) throw new Error("EXECUTION_IMAGE_BINDING");
  }
  if (envelope.info.id !== selected.sessionId) throw new Error("EXECUTION_SESSION_MISMATCH");
  if (user.id !== selected.userMessageId || assistant.id !== selected.assistantMessageId || new Set([user.id, assistant.id, idle.id]).size !== 3 || JSON.stringify(envelope.info.model) !== JSON.stringify(assistant.model)) throw new Error("EXECUTION_MESSAGE_MISMATCH");
  if (user.time.created > assistant.time.created || assistant.time.created > assistant.time.streamed || assistant.time.streamed > assistant.time.completed || assistant.time.completed > idle.time.created) throw new Error("EXECUTION_INCOMPLETE");
  return { info: { id: envelope.info.id }, messages: [
    { info: { id: user.id, role: "user", sessionID: envelope.info.id }, parts: [{ type: "text", text: user.text }] },
    { info: { id: assistant.id, role: "assistant", sessionID: envelope.info.id, providerID: assistant.model.providerID, modelID: assistant.model.id, time: assistant.time, finish: assistant.finish }, parts: assistant.content },
  ] };
}
/** Build a minimal selected source export for v2 (identity/timing/linkage/completion only, no reasoning/unrelated). */
function minimalV2Export(raw: unknown): unknown {
  const object = z.record(z.string(), z.unknown()).parse(raw);
  const payload = "data" in object ? z.object({ data: z.unknown() }).strict().parse(object).data : object;
  const info = z.record(z.string(), z.unknown()).parse((payload as { info?: unknown }).info);
  const msgSource = z.array(z.record(z.string(), z.unknown())).parse((payload as { messages?: unknown }).messages);
  const [rawUser, rawAssistant, rawIdle] = msgSource as [Record<string, unknown>, Record<string, unknown>, Record<string, unknown>];
  const minimalInfo = { id: info.id, model: info.model, outcome: info.outcome };
  const minimalUser = { id: rawUser.id, type: rawUser.type, text: rawUser.text, time: rawUser.time, ...(Array.isArray(rawUser.files) ? { files: rawUser.files } : {}) };
  const rawContent = Array.isArray(rawAssistant.content) ? rawAssistant.content as Array<Record<string, unknown>> : [];
  const minimalAssistant = { id: rawAssistant.id, type: rawAssistant.type, model: rawAssistant.model, time: rawAssistant.time, finish: rawAssistant.finish, ...(rawAssistant.rawFinish !== undefined ? { rawFinish: rawAssistant.rawFinish } : {}), content: rawContent.filter((item) => item.type !== "reasoning").map((item) => ({ type: item.type, text: item.text })) };
  const minimalIdle = { id: rawIdle.id, type: rawIdle.type, outcome: rawIdle.outcome, time: rawIdle.time };
  return { info: minimalInfo, messages: [minimalUser, minimalAssistant, minimalIdle] };
}
/** Build a minimal selected source export for v1 (selected info + text parts only). */
function minimalV1Export(raw: unknown, selected: ExportSelection): unknown {
  const envelope = z.object({ info: z.object({ id: z.string() }).passthrough(), messages: z.array(z.object({ info: z.record(z.string(), z.unknown()), parts: z.array(z.record(z.string(), z.unknown())) }).passthrough()) }).passthrough().parse(raw);
  const user = envelope.messages.find((m) => m.info.id === selected.userMessageId)!;
  const assistant = envelope.messages.find((m) => m.info.id === selected.assistantMessageId)!;
  const textParts = (parts: Array<Record<string, unknown>>) => parts.filter((part) => part.type === "text").map((part) => ({ type: "text", text: part.text }));
  const userTime = user.info.time as { created?: number } | undefined;
  const assistantTime = assistant.info.time as { created?: number; completed?: number } | undefined;
  return {
    info: { id: envelope.info.id },
    messages: [
      { info: { id: String(user.info.id), role: String(user.info.role), sessionID: String(user.info.sessionID), ...(userTime ? { time: { created: Number(userTime.created ?? 0) } } : {}) }, parts: textParts(user.parts) },
      { info: { id: String(assistant.info.id), role: String(assistant.info.role), sessionID: String(assistant.info.sessionID), parentID: assistant.info.parentID, providerID: assistant.info.providerID, modelID: assistant.info.modelID, time: { created: Number(assistantTime?.created ?? 0), completed: Number(assistantTime?.completed ?? 0) }, finish: assistant.info.finish }, parts: textParts(assistant.parts) },
    ],
  };
}
/** Core extraction without replay; public wrapper adds replay. */
function extractOpenCodeExecutionCore(raw: unknown, selected: ExportSelection): ExecutionEvidence {
  if (!openCodeVersionSchema.safeParse(selected.version).success) throw new Error("EVIDENCE_UNSUPPORTED");
  if (selected.version === "2.2.5" || selected.version === "2.2.6") raw = dedicatedV2Exchange(raw, selected);
  const envelope = z.object({ info: z.object({ id: z.string() }).passthrough(), messages: z.array(z.object({ info: z.record(z.string(), z.unknown()), parts: z.array(z.record(z.string(), z.unknown())) }).passthrough()) }).passthrough().parse(raw);
  if (envelope.info.id !== selected.sessionId) throw new Error("EXECUTION_SESSION_MISMATCH");
  const users = envelope.messages.filter((m) => m.info.id === selected.userMessageId);
  const assistants = envelope.messages.filter((m) => m.info.id === selected.assistantMessageId);
  if (users.length !== 1 || assistants.length !== 1) throw new Error("EVIDENCE_UNSUPPORTED");
  const user = users[0], assistant = assistants[0];
  if (user.info.role !== "user" || assistant.info.role !== "assistant" || user.info.sessionID !== selected.sessionId || assistant.info.sessionID !== selected.sessionId || (selected.version === "1.19.4" && assistant.info.parentID !== selected.userMessageId) || assistant.info.error) throw new Error("EXECUTION_MESSAGE_MISMATCH");
  const time = z.object({ created: z.number().nonnegative(), completed: z.number().nonnegative() }).parse(assistant.info.time);
  if (time.completed < time.created || assistant.info.finish !== "stop") throw new Error("EXECUTION_INCOMPLETE");
  const text = (parts: typeof user.parts): string => {
    // A dedicated exchange must not depend on hidden attachments or compaction.
    if (parts.some((part) => ["file", "compaction", "subtask"].includes(String(part.type)))) throw new Error("EVIDENCE_UNSUPPORTED");
    const texts = parts.filter((part) => part.type === "text");
    if (texts.length !== 1 || texts[0].synthetic || texts[0].ignored || typeof texts[0].text !== "string") throw new Error("EVIDENCE_UNSUPPORTED");
    return texts[0].text;
  };
  const input = projection.parse(selected.input), output = projection.parse(selected.output);
  const instruction = z.object({ packetId: hashSchema, pass: z.string(), prose: projection, digest: hashSchema, instructions: z.array(capturedInstructionSchema).default([]) }).strict().parse(JSON.parse(text(user.parts)));
  const answer = projection.parse(JSON.parse(text(assistant.parts)));
  if (instruction.packetId !== selected.packetId || instruction.pass !== selected.pass || instruction.digest !== proseProjectionDigest(input) || proseProjectionDigest(instruction.prose) !== proseProjectionDigest(input) || proseProjectionDigest(answer) !== proseProjectionDigest(output)) throw new Error("EXECUTION_PROSE_MISMATCH");
  if (JSON.stringify(instruction.instructions) !== JSON.stringify(selected.instructions ?? []) || instruction.instructions.some((item) => sha256(item.text) !== item.sha256)) throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
  const providerId = z.string().min(1).parse(assistant.info.providerID), modelId = z.string().min(1).parse(assistant.info.modelID);
  const family = selected.families[`${providerId}/${modelId}`];
  if (!family) throw new Error("CAPABILITY_UNAVAILABLE");
  return executionEvidenceSchema.parse({ schemaVersion: "ExecutionEvidenceV1", kind: "opencode", ...(selected.imageRefs?.length && {imageRefs:selected.imageRefs}), toolVersion: selected.version, startedAt: new Date(time.created).toISOString(), completedAt: new Date(time.completed).toISOString(), inputRefs: [...(selected.inputRefs ?? []), ...instruction.instructions.map(({ path, sha256 }) => ({ path, sha256 }))], outputRefs: selected.outputRefs ?? [], sessionId: selected.sessionId, userMessageId: selected.userMessageId, assistantMessageId: selected.assistantMessageId, providerId, modelId, family, packetId: selected.packetId, pass: selected.pass, input, output, inputDigest: proseProjectionDigest(input), outputDigest: proseProjectionDigest(output), instructions: instruction.instructions });
}
/** Extract only the selected text exchange; reasoning, tools and unrelated messages never survive. Adds replay. */
export function extractOpenCodeExecution(raw: unknown, selected: ExportSelection): ExecutionEvidence {
  if (!openCodeVersionSchema.safeParse(selected.version).success) throw new Error("EVIDENCE_UNSUPPORTED");
  if (selected.imageRefs?.length && selected.version === "1.19.4") throw new Error("EXECUTION_IMAGE_BINDING");
  const isV2 = selected.version === "2.2.5" || selected.version === "2.2.6";
  // Validate the full source export before projection (v2 dedicated exchange).
  const evidence = extractOpenCodeExecutionCore(raw, selected);
  const minimalExport = isV2 ? minimalV2Export(raw) : minimalV1Export(raw, selected);
  const replay = { export: minimalExport, inputRefs: [...(selected.inputRefs ?? [])], outputRefs: [...(selected.outputRefs ?? [])] };
  return executionEvidenceSchema.parse({ ...evidence, replay });
}

export async function validateExecutionEvidence(root: string, ref: EvidenceRef): Promise<ExecutionEvidence> {
  const result = executionEvidenceSchema.parse(await readEvidence(root, ref));
  if (Date.parse(result.completedAt) < Date.parse(result.startedAt)) throw new Error("EXECUTION_INCOMPLETE");
  for (const item of [...result.inputRefs, ...result.outputRefs, ...(result.kind === "browser" ? result.screenshots : [])]) await verifyEvidenceRef(root, item);
  if (result.kind === "command" && result.exitCode !== 0) throw new Error("EXECUTION_FAILED");
  if (result.kind === "browser" && Object.values(result.checks).some((value) => !value)) throw new Error("EXECUTION_FAILED");
  if ((result.kind === "opencode" || result.kind === "structured") && (result.inputDigest !== proseProjectionDigest(result.input) || result.outputDigest !== proseProjectionDigest(result.output))) throw new Error("EXECUTION_PROSE_MISMATCH");
  if (result.kind === "opencode") {
    if (result.imageRefs?.length && result.toolVersion === "1.19.4") throw new Error("EXECUTION_IMAGE_BINDING");
    const capabilities = await readModelCapabilities(root);
    if (result.toolVersion !== capabilities.openCodeVersion || capabilities.modelFamilies[`${result.providerId}/${result.modelId}`] !== result.family) throw new Error("CAPABILITY_UNAVAILABLE");
    if ((result.pass === "beamReview" || result.pass === "beamReview-judgment") && (result.providerId !== "opencode-go" || result.modelId !== "beam-free")) throw new Error("CAPABILITY_UNAVAILABLE");    for (const instruction of result.instructions) {
      if (sha256(instruction.text) !== instruction.sha256) throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
      await verifyEvidenceRef(root, { path: instruction.path, sha256: instruction.sha256 });
    }
    if (!result.replay) {
      if (!isTerminalEvidenceSnapshotActive()) throw new Error("EXECUTION_REPLAY_MISSING");
    } else {
      const replay = result.replay;
      // verify replay refs
      for (const item of [...replay.inputRefs, ...replay.outputRefs]) await verifyEvidenceRef(root, item);
      const selected = {
        imageRefs: result.imageRefs,
        version: result.toolVersion,
        sessionId: result.sessionId,
        userMessageId: result.userMessageId,
        assistantMessageId: result.assistantMessageId,
        packetId: result.packetId,
        pass: result.pass,
        input: result.input,
        output: result.output,
        families: capabilities.modelFamilies,
        inputRefs: replay.inputRefs,
        outputRefs: replay.outputRefs,
        instructions: result.instructions,
      };
      let replayed: ExecutionEvidence;
      try {
        replayed = extractOpenCodeExecutionCore(replay.export, selected);
      } catch (error) {
        throw error instanceof Error ? error : new Error("EXECUTION_REPLAY_FAILED");
      }
      const { replay: _ignoredReplay, ...withoutReplay } = result; void _ignoredReplay;
      if (JSON.stringify(replayed) !== JSON.stringify(withoutReplay)) throw new Error("EXECUTION_REPLAY_MISMATCH");
    }
  }
  if (result.kind === "structured") {
    await verifyEvidenceRef(root, result.sourceRef);
    for (const instruction of result.instructions) {
      if (sha256(instruction.text) !== instruction.sha256) throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
      await verifyEvidenceRef(root, { path: instruction.path, sha256: instruction.sha256 });
    }
    const capabilities = await readStructuredExporterCapabilities(root);
    const configured = capabilities.executionExporters[result.exporterId];
    if (!configured || configured.executable !== result.exporterExecutable || configured.toolName !== result.toolName || configured.toolVersion !== result.toolVersion || JSON.stringify(expandExporterArgs(configured.exportArgs, result)) !== JSON.stringify(result.exporterArgv)) throw new Error("CAPABILITY_UNAVAILABLE");
    const storedSource = await readEvidence(root, result.sourceRef);
    if (!isTerminalEvidenceSnapshotActive()) {
      const current = await exportStructuredExchange(root, result.exporterId, result);
      if (JSON.stringify(current.source) !== JSON.stringify(storedSource)) throw new Error("EXECUTION_REPLAY_MISMATCH");
    }
    const replayed = extractStructuredExecution(storedSource, result.sourceRef, { executable: result.exporterExecutable, argv: result.exporterArgv });
    if (JSON.stringify(replayed) !== JSON.stringify(result)) throw new Error("EXECUTION_REPLAY_MISMATCH");
  }
  return result;
}

async function readModelCapabilities(root: string) {
  return z.object({ schemaVersion: z.literal("ArticleWorkflowCapabilitiesV1"), openCodeVersion: openCodeVersionSchema, modelFamilies: z.record(z.string(), z.string().min(1)) }).passthrough().parse(JSON.parse((await readEvidenceBytes(root, "config/article-workflow-capabilities.json")).toString("utf8")));
}
const exporterSchema = z.object({ executable: z.string().min(1), exportArgs: z.array(z.string()), versionArgs: z.array(z.string()), toolName: z.string().min(1), toolVersion: z.string().min(1) }).strict();
async function readStructuredExporterCapabilities(root: string) {
  return z.object({ executionExporters: z.record(z.string(), exporterSchema).default({}) }).passthrough().parse(JSON.parse((await readEvidenceBytes(root, "config/article-workflow-capabilities.json")).toString("utf8")));
}
function expandExporterArgs(args: string[], selected: { contextId: string; exchangeId: string }): string[] {
  return args.map((arg) => arg.replaceAll("{contextId}", selected.contextId).replaceAll("{exchangeId}", selected.exchangeId));
}
async function exportStructuredExchange(root: string, exporterId: string, selected: { contextId: string; exchangeId: string }) {
  const capabilities = await readStructuredExporterCapabilities(root);
  const configured = capabilities.executionExporters[exporterId];
  if (!configured) throw new Error("CAPABILITY_UNAVAILABLE");
  const options = { cwd: root, encoding: "utf8" as const, timeout: 30_000, maxBuffer: MAX_EVIDENCE_BYTES, windowsHide: true };
  const version = (await runFile(configured.executable, configured.versionArgs, options)).stdout.trim();
  if (version !== configured.toolVersion) throw new Error("EVIDENCE_UNSUPPORTED");
  const argv = expandExporterArgs(configured.exportArgs, selected);
  const exported = await runFile(configured.executable, argv, options);
  const source = structuredExecutionExportSchema.parse(JSON.parse(exported.stdout));
  if (source.exporterId !== exporterId || source.contextId !== selected.contextId || source.exchangeId !== selected.exchangeId || source.tool.name !== configured.toolName || source.tool.version !== configured.toolVersion) throw new Error("EXECUTION_SELECTION_MISMATCH");
  return { configured, argv, source };
}
const runFile = promisify(execFile);
/** Uses argv without shell expansion and bounded output/time. Call only for an authorized tool. */
export async function captureCommandExecution(root: string, input: { executable: string; argv: string[]; toolVersion: string; inputRefs: EvidenceRef[]; outputRefs?: EvidenceRef[] }): Promise<ExecutionEvidence> {
  for (const ref of input.inputRefs) await verifyEvidenceRef(root, ref);
  const startedAt = new Date().toISOString();
  const output = await runFile(input.executable, input.argv, { cwd: root, encoding: "utf8", timeout: 120_000, maxBuffer: MAX_EVIDENCE_BYTES, windowsHide: true });
  for (const ref of input.outputRefs ?? []) await verifyEvidenceRef(root, ref);
  return executionEvidenceSchema.parse({ schemaVersion: "ExecutionEvidenceV1", kind: "command", toolVersion: input.toolVersion, executable: input.executable, argv: input.argv, cwd: await realpath(root), inputRefs: input.inputRefs, outputRefs: input.outputRefs ?? [], startedAt, completedAt: new Date().toISOString(), stdout: output.stdout, stderr: output.stderr, exitCode: 0 });
}
/** Export existing scoped execution only; this never starts a model run. Full export is not persisted. */
export async function captureOpenCodeExecution(root: string, selected: Omit<ExportSelection, "families" | "version" | "instructions"> & { instructionRefs?: EvidenceRef[] }): Promise<ExecutionEvidence> {
  const capabilities = await readModelCapabilities(root);
  const options = { cwd: root, encoding: "utf8" as const, timeout: 30_000, maxBuffer: MAX_EVIDENCE_BYTES, windowsHide: true };
  const executable = openCodeExecutable();
  const version = normalizeOpenCodeVersion((await runFile(executable, ["--version"], options)).stdout);
  if (version !== capabilities.openCodeVersion) throw new Error("EVIDENCE_UNSUPPORTED");
  const exported = await runFile(executable, openCodeExportArgs(version, selected.sessionId), options);
  const instructions = [];
  for (const ref of selected.instructionRefs ?? []) {
    await verifyEvidenceRef(root, ref);
    instructions.push({ ...ref, text: (await readEvidenceBytes(root, ref.path)).toString("utf8") });
  }
  return extractOpenCodeExecution(JSON.parse(exported.stdout), { ...selected, instructions, version, families: capabilities.modelFamilies });
}

/** Invoke a configured exporter for one completed exchange; caller-authored projections are never accepted. */
export async function captureStructuredExecution(root: string, importId: string, rawSelection: unknown): Promise<ExecutionEvidence> {
  const selected = structuredCaptureSelectionSchema.parse(rawSelection);
  const { configured, argv, source } = await exportStructuredExchange(root, selected.exporterId, selected);
  const sourceRef = await storeEvidence(root, importId, source);
  const execution = extractStructuredExecution(source, sourceRef, { executable: configured.executable, argv });
  for (const ref of [...execution.inputRefs, ...execution.outputRefs]) await verifyEvidenceRef(root, ref);
  if (execution.kind !== "structured") throw new Error("EVIDENCE_UNSUPPORTED");
  for (const instruction of execution.instructions) {
    if (sha256(instruction.text) !== instruction.sha256) throw new Error("EXECUTION_INSTRUCTION_MISMATCH");
    await verifyEvidenceRef(root, { path: instruction.path, sha256: instruction.sha256 });
  }
  return execution;
}
