import { createHash, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { link, mkdir, open, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseApprovedUrls } from "../affiliate/approved-urls";
import { contentApprovalMatches, createContentApproval, type ApprovalFiles } from "./content-approval";
import { externalArticleImportSchema, type ExternalArticleImportV1, type FailureClass, type ImportFormat, type ImportStage, type ImportTransformationV1 } from "./contracts";
import { createImportPresentation, verifyImportPresentationEvidence } from "./presentation";

const ROOT = ".automation/article-imports";
const activeLease = new AsyncLocalStorage<ImportLease>();
const INSTRUCTION_LINE = /ignore\s+(all|any|the)\s+(previous|prior)|system\s+prompt|developer\s+message|reveal\s+your\s+instructions|jailbreak/i;
const RISK_PATTERNS = [
  ["price", /\$\s?\d|\b\d+\s?(?:\/month|per month|monthly)\b/i],
  ["discount", /\b(?:discount|sale|coupon|off)\b/i],
  ["ranking", /\b(?:best|#1|number one|top)\b/i],
  ["named_comparison", /\b(?:versus|vs\.?|alternative to|unlike)\b/i],
  ["first_person_experience", /\b(?:i tested|we tested|i used|our experience|we found)\b/i],
  ["unsupported_certainty", /\b(?:always|never|guaranteed|will\s+(?:solve|increase|reduce))\b/i],
] as const;
const STRATEGIES: Record<string, string[]> = {
  research: ["alternate-source", "narrow-claim", "remove-claim"],
  transform: ["field-repair", "reconstruct-schema", "reclassify"],
  validate: ["targeted-repair", "fresh-rewrite", "fresh-topic"],
  media: ["retry-generation", "simplify-asset", "brand-graphic"],
  release: ["retry-transient", "rollback", "fix-forward"],
};

export function fingerprint(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function now(): string { return new Date().toISOString(); }
function storeRoot(repositoryRoot: string): string { return path.join(path.resolve(repositoryRoot), ROOT); }
function recordPath(repositoryRoot: string, importId: string): string { return path.join(storeRoot(repositoryRoot), `${importId}.json`); }
function sourcePath(repositoryRoot: string, importId: string): string { return path.join(storeRoot(repositoryRoot), `${importId}.source.md`); }

function scalar(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  return trimmed;
}

function extractUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const markdownLink = trimmed.match(/^\[[^\]]*\]\((https:\/\/[^)\s]+)\)$/i);
  if (markdownLink?.[1]) return markdownLink[1];
  return trimmed.match(/https:\/\/[^)\s]+/i)?.[0] ?? trimmed;
}

export function parseExternalArticle(markdown: string): { title: string; primaryQuestion: string; affiliateName?: string; affiliateUrl?: string; body: string; promptInjectionDetected: boolean; unusableReason?: string; inferredFields: string[] } {
  const lines = markdown.replace(/^\uFEFF/, "").split(/\r?\n/);
  const metadata: Record<string, string> = {};
  let bodyStart = 0;
  let malformedFrontmatter = false;
  if (lines[0]?.trim() === "---") {
    const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
    if (end < 0) {
      malformedFrontmatter = true;
    } else {
      bodyStart = end + 1;
      for (const line of lines.slice(1, end)) {
        const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
        if (match) metadata[match[1]] = scalar(match[2]);
      }
    }
  }
  const bodyLines = lines.slice(bodyStart);
  const promptInjectionDetected = bodyLines.some((line) => INSTRUCTION_LINE.test(line)) || Object.values(metadata).some((value) => INSTRUCTION_LINE.test(value));
  for (const [key, value] of Object.entries(metadata)) {
    if (INSTRUCTION_LINE.test(value)) delete metadata[key];
  }
  const body = bodyLines.filter((line) => !INSTRUCTION_LINE.test(line)).join("\n").trim();
  const title = metadata.title?.trim() || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Imported article";
  const primaryQuestion = metadata.primary_question?.trim() || metadata.primaryQuestion?.trim() || title;
  const inferredFields = [
    ...(metadata.title ? [] : ["title"]),
    ...(metadata.primary_question || metadata.primaryQuestion ? [] : ["primaryQuestion"]),
    ...(malformedFrontmatter ? ["frontmatter"] : []),
  ];
  const unusableReason = body.length === 0 ? "The submission has no usable article body." : undefined;
  const link = extractUrl(metadata.affiliate_url);
  return { title, primaryQuestion, affiliateName: metadata.affiliate_name, affiliateUrl: link, body, promptInjectionDetected, unusableReason, inferredFields };
}

function classify(input: ReturnType<typeof parseExternalArticle>): ImportFormat {
  const text = `${input.title}\n${input.primaryQuestion}\n${input.body}`.toLowerCase();
  if (input.affiliateName || input.affiliateUrl) return "direct-review";
  if (/decision hub|solution hub|decision scenario|three connected pages/.test(text)) return "decision-set";
  if (/^#{1,2}\s*(faq|frequently asked)/im.test(text) || /buyer question|topic cluster/.test(text)) return "blog";
  if (/guide|how to|checklist|workflow/.test(text)) return "visibility";
  return "agent_review_required";
}

function risks(body: string): ImportTransformationV1["claimRisks"] {
  return RISK_PATTERNS.filter(([, pattern]) => pattern.test(body)).map(([name]) => name);
}

function domainKey(host: string): string {
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  return labels.slice(-2).join(".");
}

function hostMatches(candidate: string, submitted: string | undefined, affiliateName?: string): boolean {
  try {
    const host = new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
    const submittedHost = submitted ? new URL(submitted).hostname.toLowerCase().replace(/^www\./, "") : "";
    if (!submittedHost || domainKey(host) !== domainKey(submittedHost)) return false;
    if (!affiliateName) return false;
    const compactName = affiliateName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const tokens = [compactName, ...affiliateName.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2).map((token) => token.replace(/[^a-z0-9]/g, ""))];
    const labels = host.split(".").map((label) => label.replace(/[^a-z0-9]/g, ""));
    return tokens.some((token) => labels.includes(token));
  } catch { return false; }
}

export function resolveAffiliateUrl(submitted: string | undefined, affiliateName: string | undefined, allowlistMarkdown: string): { mode: "approved" | "decommercialized" | "none"; submitted?: string; resolved?: string } {
  if (!submitted) return { mode: "none" };
  const manifest = parseApprovedUrls(allowlistMarkdown);
  const exact = manifest.entries.find((entry) => entry.exactUrl === submitted);
  if (exact) return { mode: "approved", submitted, resolved: exact.exactUrl };
  const matches = manifest.entries.filter((entry) => hostMatches(entry.exactUrl, submitted, affiliateName));
  if (matches.length === 1) return { mode: "approved", submitted, resolved: matches[0].exactUrl };
  return { mode: "decommercialized", submitted };
}

export function prepareTransformation(parsed: ReturnType<typeof parseExternalArticle>, allowlistMarkdown: string): ImportTransformationV1 {
  const resolved = resolveAffiliateUrl(parsed.affiliateUrl, parsed.affiliateName, allowlistMarkdown);
  const removals: string[] = [...risks(parsed.body)];
  if (resolved.mode === "decommercialized") removals.push("affiliate destination and commercial CTA");
  const format = resolved.mode === "approved" ? classify(parsed) : classify({ ...parsed, affiliateName: undefined, affiliateUrl: undefined });
  return {
    schemaVersion: "ImportTransformationV1", format, title: parsed.title,
    primaryQuestion: parsed.primaryQuestion, affiliateName: resolved.mode === "approved" ? parsed.affiliateName : undefined,
    submittedAffiliateUrl: resolved.submitted, resolvedAffiliateUrl: resolved.resolved,
    commercialMode: resolved.mode, removals, claimRisks: risks(parsed.body),
    sourceFingerprint: "0".repeat(64), inferredFields: parsed.inferredFields,
  };
}

function initialRecord(input: { importId: string; sourceFile: string; sourceFingerprint: string; parsed: ReturnType<typeof parseExternalArticle>; transformation: ImportTransformationV1 }): ExternalArticleImportV1 {
  const at = now();
  return {
    schemaVersion: "ExternalArticleImportV1", importId: input.importId, sourceFingerprint: input.sourceFingerprint,
    sourceFile: input.sourceFile, stage: "INGESTING", createdAt: at, updatedAt: at,
    title: input.parsed.title, primaryQuestion: input.parsed.primaryQuestion, format: input.transformation.format,
    promptInjectionDetected: input.parsed.promptInjectionDetected, ...(input.parsed.unusableReason ? { unusableReason: input.parsed.unusableReason } : {}),
    transformation: { ...input.transformation, sourceFingerprint: input.sourceFingerprint }, stageReceipts: [{ stage: "INGESTING", status: "started", at, message: "Source captured and normalized." }],
    strategyAttempts: {}, nextAction: input.parsed.unusableReason ? "Quarantine unusable input." : "Supervising agent: gather evidence and produce the existing content schema.",
  };
}

export type AtomicReplace = (from: string, to: string) => Promise<void>;

const TRANSIENT_REPLACE_ERRORS = new Set(["EPERM", "EBUSY", "EACCES"]);

async function replaceWithRetry(replace: AtomicReplace, from: string, to: string): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await replace(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!TRANSIENT_REPLACE_ERRORS.has(code ?? "") || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 25));
    }
  }
}

export async function writeJsonAtomically(file: string, value: unknown, replace: AtomicReplace = rename): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const handle = await open(temp, "w");
  try {
    await handle.writeFile(serialized, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await replaceWithRetry(replace, temp, file);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    throw error;
  }
}

export async function saveImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<string> {
  const parsed = externalArticleImportSchema.parse(record);
  const file = recordPath(repositoryRoot, parsed.importId);
  const lease = activeLease.getStore();
  await lease?.assertOwned();
  await writeJsonAtomically(file, parsed, async (from, to) => {
    await lease?.assertOwned();
    await rename(from, to);
  });
  return file;
}

export async function loadImport(repositoryRoot: string, importId: string): Promise<ExternalArticleImportV1> {
  return externalArticleImportSchema.parse(JSON.parse(await readFile(recordPath(repositoryRoot, importId), "utf8")));
}

export async function listPendingImports(repositoryRoot: string): Promise<ExternalArticleImportV1[]> {
  return (await listAllImports(repositoryRoot)).filter((record) => !["LIVE", "QUARANTINED"].includes(record.stage));
}

type LeaseRecord = { generation: number; ownerToken: string; expiresAt: number };
export type ImportLease = { ownerToken: string; expiresAt: number; assertOwned: () => Promise<void>; release: () => Promise<void> };

// Immutable generations make exclusive hard-link creation a filesystem compare-and-swap.
// An expired owner can never delete or overwrite a successor's lease.
export async function claimImportLease(repositoryRoot: string, importId: string, ttlMs = 30 * 60_000): Promise<ImportLease | undefined> {
  if (!/^article-[0-9a-f-]{36}$/.test(importId) || ttlMs <= 0) throw new Error("Invalid import lease request.");
  const directory = path.join(storeRoot(repositoryRoot), "leases", importId);
  await mkdir(directory, { recursive: true });
  const latest = async (): Promise<LeaseRecord | undefined> => {
    const generations = (await readdir(directory)).filter((name) => /^\d+\.json$/.test(name)).map((name) => Number(name.slice(0, -5)));
    if (!generations.length) return undefined;
    return JSON.parse(await readFile(path.join(directory, `${Math.max(...generations)}.json`), "utf8")) as LeaseRecord;
  };
  const append = async (record: LeaseRecord): Promise<boolean> => {
    const temporary = path.join(directory, `${randomUUID()}.tmp`);
    await writeJsonAtomically(temporary, record);
    try {
      await link(temporary, path.join(directory, `${record.generation}.json`));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw error;
    } finally { await unlink(temporary); }
  };
  const previous = await latest();
  if (previous && previous.expiresAt > Date.now()) return undefined;
  const record = { generation: (previous?.generation ?? 0) + 1, ownerToken: randomUUID(), expiresAt: Date.now() + ttlMs };
  if (!await append(record)) return undefined;
  const assertOwned = async () => {
    const current = await latest();
    if (current?.ownerToken !== record.ownerToken || current.expiresAt <= Date.now()) throw new Error("Import lease expired or changed owner.");
  };
  return { ownerToken: record.ownerToken, expiresAt: record.expiresAt, assertOwned, release: async () => {
    const current = await latest();
    if (current?.ownerToken === record.ownerToken) await append({ generation: current.generation + 1, ownerToken: record.ownerToken, expiresAt: 0 });
  } };
}

export type ImportExecutionContext = {
  record: ExternalArticleImportV1; stage: ImportStage; strategy: string; attempt: number;
  idempotencyKey: string; leaseToken: string; assertLease: () => Promise<void>;
};
export type ImportStageExecutor = (context: ImportExecutionContext) => Promise<ExternalArticleImportV1>;

function strategyGroup(stage: ImportStage): string {
  return ({ RESEARCHING: "research", TRANSFORMING: "transform", REFINING: "validate", VALIDATING: "validate", RELEASING: "release", VERIFYING: "release" } as Partial<Record<ImportStage, string>>)[stage] ?? "research";
}

export async function executePendingImport(repositoryRoot: string, importId: string, execute: ImportStageExecutor): Promise<ExternalArticleImportV1> {
  const lease = await claimImportLease(repositoryRoot, importId);
  if (!lease) return loadImport(repositoryRoot, importId);
  try {
    return await activeLease.run(lease, async () => {
      const current = await loadImport(repositoryRoot, importId);
      if (["LIVE", "QUARANTINED"].includes(current.stage)) return current;
      if (current.unusableReason) return quarantineUnusableImport(repositoryRoot, current);
      const record = await resumeImport(repositoryRoot, current);
      const group = strategyGroup(record.stage);
      const failures = record.strategyAttempts[group] ?? 0;
      const strategy = STRATEGIES[group][Math.min(Math.floor(failures / 3), STRATEGIES[group].length - 1)];
      const idempotencyKey = fingerprint(`${importId}:${record.sourceFingerprint}:${record.stage}:${strategy}`);
      await lease.assertOwned();
      let result: ExternalArticleImportV1;
      try {
        result = await execute({ record, stage: record.stage, strategy, attempt: failures % 3 + 1, idempotencyKey, leaseToken: lease.ownerToken, assertLease: lease.assertOwned });
      } catch (error) {
        await lease.assertOwned();
        return recordImportFailure(repositoryRoot, await loadImport(repositoryRoot, importId), { strategy: group, classification: "transient", message: error instanceof Error ? error.message : String(error) });
      }
      if (result.importId !== importId || result.sourceFingerprint !== record.sourceFingerprint) throw new Error("Stage executor changed import identity.");
      await lease.assertOwned();
      await saveImport(repositoryRoot, result);
      return result;
    });
  } finally { await lease.release(); }
}

export async function resumePendingImports(repositoryRoot: string, execute: ImportStageExecutor): Promise<ExternalArticleImportV1[]> {
  const results: ExternalArticleImportV1[] = [];
  for (const record of await listPendingImports(repositoryRoot)) results.push(await executePendingImport(repositoryRoot, record.importId, execute));
  return results;
}

async function listAllImports(repositoryRoot: string): Promise<ExternalArticleImportV1[]> {
  let names: string[];
  try { names = await readdir(storeRoot(repositoryRoot)); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const records: ExternalArticleImportV1[] = [];
  for (const name of names.filter((entry) => entry.endsWith(".json"))) {
    const record = externalArticleImportSchema.parse(JSON.parse(await readFile(path.join(storeRoot(repositoryRoot), name), "utf8")));
    records.push(record);
  }
  return records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createArticleImport(repositoryRoot: string, sourceFile: string, allowlistFile = "approved-urls.md"): Promise<ExternalArticleImportV1> {
  const absoluteSource = path.resolve(repositoryRoot, sourceFile);
  const raw = await readFile(absoluteSource, "utf8");
  const parsed = parseExternalArticle(raw);
  const sourceFingerprint = fingerprint(raw);
  const existing = (await listAllImports(repositoryRoot)).find((record) => record.sourceFingerprint === sourceFingerprint);
  if (existing?.stage === "LIVE") {
    const at = now();
    const reused = externalArticleImportSchema.parse({
      ...existing,
      importId: `article-${randomUUID()}`,
      sourceFile: absoluteSource,
      createdAt: at,
      updatedAt: at,
      duplicateOf: existing.importId,
      sourceDeletedAt: at,
      stageReceipts: [...existing.stageReceipts, { stage: "LIVE", status: "passed", at, message: `Reused live result ${existing.importId}.` }],
      nextAction: `Reused live result ${existing.importId}.`,
    });
    await saveImport(repositoryRoot, reused);
    return reused;
  }
  if (existing) return existing;
  const allowlist = await readFile(path.resolve(repositoryRoot, allowlistFile), "utf8");
  const transformation = prepareTransformation(parsed, allowlist);
  const importId = `article-${randomUUID()}`;
  const record = initialRecord({ importId, sourceFile: absoluteSource, sourceFingerprint, parsed, transformation });
  await mkdir(storeRoot(repositoryRoot), { recursive: true });
  await writeFile(sourcePath(repositoryRoot, importId), parsed.body, "utf8");
  if (record.unusableReason) return quarantineUnusableImport(repositoryRoot, record);
  await saveImport(repositoryRoot, record);
  return record;
}

const nextStage: Partial<Record<ImportStage, ImportStage>> = { INGESTING: "RESEARCHING", RESEARCHING: "TRANSFORMING", TRANSFORMING: "REFINING", REFINING: "VALIDATING", VALIDATING: "RELEASING" };
export async function approveImportContent(repositoryRoot: string, record: ExternalArticleImportV1, files: ApprovalFiles): Promise<ExternalArticleImportV1> {
  if (record.stage !== "REFINING") throw new Error("Content approval requires REFINING.");
  const contentApproval = await createContentApproval(repositoryRoot, { ...files, format: record.format, sourceFingerprint: record.sourceFingerprint });
  const updated = externalArticleImportSchema.parse({ ...record, contentApproval, presentation: undefined, pendingRelease: undefined, release: undefined, updatedAt: now() });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function ensureImportContentApproval(repositoryRoot: string, record: ExternalArticleImportV1, artifactPath?: string): Promise<ExternalArticleImportV1> {
  if (await contentApprovalMatches(repositoryRoot, record.contentApproval, record.format, record.sourceFingerprint, artifactPath)) return record;
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, contentApproval: undefined, presentation: undefined, pendingRelease: undefined, release: undefined, resumeStage: undefined, stage: "REFINING", updatedAt: at,
    stageReceipts: [...record.stageReceipts, { stage: "REFINING", status: "failed", at, message: "Content approval is missing or no longer matches the artifact and evidence." }],
    nextAction: "Refine the current artifact and record fresh editorial and format quality approval.",
  });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function ensureImportPresentation(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  try {
    await verifyImportPresentationEvidence(repositoryRoot, record);
    return record;
  } catch {
    const at = now();
    const updated = externalArticleImportSchema.parse({ ...record, presentation: undefined, pendingRelease: undefined, release: undefined, resumeStage: undefined, stage: "VALIDATING", updatedAt: at,
      stageReceipts: [...record.stageReceipts, { stage: "VALIDATING", status: "failed", at, message: "Presentation evidence is missing or no longer matches the approved content." }],
      nextAction: "Render the approved content without changing its words and record fresh presentation evidence.",
    });
    await saveImport(repositoryRoot, updated);
    return updated;
  }
}

export async function recordImportPresentation(repositoryRoot: string, record: ExternalArticleImportV1, input: { validationGate: string; validationReceipt: unknown }): Promise<ExternalArticleImportV1> {
  if (record.stage !== "VALIDATING") throw new Error("Presentation evidence can only be recorded from VALIDATING.");
  const checked = await ensureImportContentApproval(repositoryRoot, record);
  if (!checked.contentApproval) return checked;
  const presentation = await createImportPresentation(repositoryRoot, checked, input);
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...checked, presentation, pendingRelease: undefined, release: undefined, updatedAt: at,
    stageReceipts: [...checked.stageReceipts, { stage: "VALIDATING", status: "passed", at, message: "Presentation evidence recorded for the approved content fingerprint." }],
    nextAction: "Advance to release without changing the approved words.",
  });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function advanceImport(repositoryRoot: string, record: ExternalArticleImportV1, message: string): Promise<ExternalArticleImportV1> {
  if (record.unusableReason) return quarantineUnusableImport(repositoryRoot, record);
  const stage = nextStage[record.stage];
  if (!stage) throw new Error("Stage " + record.stage + " cannot advance automatically.");
  if (["VALIDATING", "RELEASING"].includes(stage)) {
    const checked = await ensureImportContentApproval(repositoryRoot, record);
    if (!checked.contentApproval) return checked;
    record = checked;
  }
  if (stage === "RELEASING") {
    const checked = await ensureImportPresentation(repositoryRoot, record);
    if (!checked.presentation) return checked;
    record = checked;
  }
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, stage, updatedAt: at, stageReceipts: [...record.stageReceipts, { stage, status: "passed", at, message }], nextAction: "Complete " + stage.toLowerCase() + " and record its receipt." });
  await saveImport(repositoryRoot, updated);
  return updated;
}

async function quarantineUnusableImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, stage: "QUARANTINED", updatedAt: at,
    stageReceipts: [...record.stageReceipts, { stage: "QUARANTINED", status: "quarantined", at, message: record.unusableReason }], nextAction: "none",
  });
  await saveImport(repositoryRoot, updated);
  return deleteRawSource(repositoryRoot, updated.importId, updated, at);
}

export async function recordImportRelease(repositoryRoot: string, record: ExternalArticleImportV1, releaseInput: unknown): Promise<ExternalArticleImportV1> {
  if (record.stage !== "RELEASING") throw new Error("A release receipt can only be recorded from RELEASING.");
  const checked = await ensureImportContentApproval(repositoryRoot, record);
  if (!checked.contentApproval) return checked;
  const release = externalArticleImportSchema.shape.release.unwrap().parse(releaseInput);
  const presented = await ensureImportPresentation(repositoryRoot, { ...checked, release });
  if (!presented.presentation) return presented;
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...presented, stage: "VERIFYING", release, updatedAt: at, stageReceipts: [...presented.stageReceipts, { stage: "VERIFYING", status: "started", at, message: "Release receipt recorded; production verification is required." }], nextAction: "Verify every release check before marking LIVE." });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function verifyImportRelease(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  if (record.stage !== "VERIFYING" || !record.release) throw new Error("A validated release receipt is required before production verification.");
  const release = externalArticleImportSchema.shape.release.unwrap().parse(record.release);
  const presented = await ensureImportPresentation(repositoryRoot, { ...record, release });
  if (!presented.presentation) return presented;
  if (Object.values(release.checks).some((check) => check !== true)) throw new Error("Every required production check must pass before LIVE.");
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...presented, stage: "LIVE", updatedAt: at, stageReceipts: [...presented.stageReceipts, { stage: "LIVE", status: "passed", at, message: "All production checks passed." }], nextAction: "none" });
  return deleteRawSource(repositoryRoot, updated.importId, updated, at);
}

export async function resumeImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  if (["VALIDATING", "RELEASING", "VERIFYING"].includes(record.resumeStage ?? record.stage)) {
    const checked = await ensureImportContentApproval(repositoryRoot, record);
    if (!checked.contentApproval) return checked;
    record = checked;
  }
  if (["RELEASING", "VERIFYING"].includes(record.resumeStage ?? record.stage)) {
    const checked = await ensureImportPresentation(repositoryRoot, record);
    if (!checked.presentation) return checked;
    record = checked;
  }
  if (!["WAITING_EXTERNAL", "REPAIRING", "ROLLED_BACK"].includes(record.stage)) return record;
  const stage = record.resumeStage;
  if (!stage || ["REPAIRING", "WAITING_EXTERNAL", "ROLLED_BACK", "LIVE", "QUARANTINED"].includes(stage)) {
    throw new Error("Recovery receipt does not identify a productive resume stage.");
  }
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, stage, updatedAt: at, stageReceipts: [...record.stageReceipts, { stage, status: "started", at, message: "Resumed from " + record.stage + " using the recorded productive stage." }], nextAction: "Retry " + stage.toLowerCase() + " using the next recorded strategy." });
  await saveImport(repositoryRoot, updated);
  return updated;
}
export async function recordImportFailure(repositoryRoot: string, record: ExternalArticleImportV1, input: { strategy: string; classification: FailureClass; message: string }): Promise<ExternalArticleImportV1> {
  const attemptKey = input.classification === "transient" ? `transient:${input.strategy}` : input.strategy;
  const attempt = (record.strategyAttempts[attemptKey] ?? 0) + 1;
  const attempts = { ...record.strategyAttempts, [attemptKey]: attempt };
  const strategies = STRATEGIES[input.strategy] ?? ["retry", "alternate", "quarantine"];
  const next = strategies[Math.floor(attempt / 3)] ?? "quarantine";
  const at = now();
  const exhausted = next === "quarantine";
  const stage: ImportStage = input.classification === "transient" ? "WAITING_EXTERNAL" : exhausted ? "QUARANTINED" : "REPAIRING";
  const resumeStage = stage === "REPAIRING" || stage === "WAITING_EXTERNAL" ? (record.stage === "REPAIRING" || record.stage === "WAITING_EXTERNAL" ? record.resumeStage : record.stage) : record.resumeStage;
  const updated = externalArticleImportSchema.parse({ ...record, stage, ...(resumeStage ? { resumeStage } : {}), updatedAt: at, strategyAttempts: attempts, stageReceipts: [...record.stageReceipts, { stage, status: stage === "WAITING_EXTERNAL" ? "waiting" : stage === "QUARANTINED" ? "quarantined" : "failed", at, message: input.message }], nextAction: stage === "WAITING_EXTERNAL" ? "Heartbeat: retry after external dependency recovers." : stage === "QUARANTINED" ? "none" : `Apply strategy ${next}.` });
  await saveImport(repositoryRoot, updated);
  if (stage === "QUARANTINED") return deleteRawSource(repositoryRoot, updated.importId, updated, at);
  return updated;
}

async function deleteRawSource(repositoryRoot: string, importId: string, record: ExternalArticleImportV1, at: string): Promise<ExternalArticleImportV1> {
  try { await unlink(sourcePath(repositoryRoot, importId)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const updated = externalArticleImportSchema.parse({ ...record, sourceDeletedAt: at });
  await saveImport(repositoryRoot, updated);
  return updated;
}
