import { createHash, randomUUID } from "node:crypto";
import { access, copyFile, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseApprovedUrls } from "../affiliate/approved-urls";
import { externalArticleImportSchema, type ExternalArticleImportV1, type FailureClass, type ImportFormat, type ImportStage, type ImportTransformationV1 } from "./contracts";

const ROOT = ".automation/article-imports";
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
  const body = bodyLines.filter((line) => !INSTRUCTION_LINE.test(line)).join("\n").trim();
  const title = metadata.title?.trim() || body.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Imported article";
  const primaryQuestion = metadata.primary_question?.trim() || metadata.primaryQuestion?.trim() || title;
  const inferredFields = [
    ...(metadata.title ? [] : ["title"]),
    ...(metadata.primary_question || metadata.primaryQuestion ? [] : ["primaryQuestion"]),
    ...(malformedFrontmatter ? ["frontmatter"] : []),
  ];
  const unusableReason = body.length < 80 ? "The submission has no usable article body." : undefined;
  const link = metadata.affiliate_url?.match(/https:\/\/[^)\s]+/)?.[0] ?? metadata.affiliate_url?.trim();
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
  return {
    schemaVersion: "ImportTransformationV1", format: classify(parsed), title: parsed.title,
    primaryQuestion: parsed.primaryQuestion, affiliateName: parsed.affiliateName,
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

async function atomicWrite(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(temp, serialized, "utf8");
  try {
    await rename(temp, file);
  } catch (error) {
    // Windows sandboxed temporary folders can reject an atomic rename. Keep
    // the durable write deterministic and remove the staging file.
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    let destinationExists = true;
    try { await access(file); } catch (accessError) {
      if ((accessError as NodeJS.ErrnoException).code !== "ENOENT") throw accessError;
      destinationExists = false;
    }
    if (!destinationExists) {
      await writeFile(file, serialized, { encoding: "utf8", flag: "wx" });
      await unlink(temp).catch(() => undefined);
      return;
    }
    const backup = `${file}.${process.pid}.bak`;
    try {
      await rename(file, backup);
    } catch (backupError) {
      if ((backupError as NodeJS.ErrnoException).code !== "EPERM") throw backupError;
      await copyFile(file, backup);
    }
    try {
      try {
        await rename(temp, file);
      } catch (replaceError) {
        if ((replaceError as NodeJS.ErrnoException).code !== "EPERM") throw replaceError;
        await writeFile(file, serialized, { encoding: "utf8", flag: "w" });
        await unlink(temp).catch(() => undefined);
      }
      await unlink(backup).catch(() => undefined);
    } catch (replaceError) {
      await writeFile(file, await readFile(backup));
      await unlink(backup).catch(() => undefined);
      throw replaceError;
    }
  }
}

export async function saveImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<string> {
  const parsed = externalArticleImportSchema.parse(record);
  const file = recordPath(repositoryRoot, parsed.importId);
  await atomicWrite(file, parsed);
  return file;
}

export async function loadImport(repositoryRoot: string, importId: string): Promise<ExternalArticleImportV1> {
  return externalArticleImportSchema.parse(JSON.parse(await readFile(recordPath(repositoryRoot, importId), "utf8")));
}

export async function listPendingImports(repositoryRoot: string): Promise<ExternalArticleImportV1[]> {
  return (await listAllImports(repositoryRoot)).filter((record) => !["LIVE", "QUARANTINED"].includes(record.stage));
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
  await writeFile(sourcePath(repositoryRoot, importId), raw, "utf8");
  await saveImport(repositoryRoot, record);
  return record;
}

const nextStage: Partial<Record<ImportStage, ImportStage>> = { INGESTING: "RESEARCHING", RESEARCHING: "TRANSFORMING", TRANSFORMING: "REFINING", REFINING: "VALIDATING", VALIDATING: "RELEASING" };
export async function advanceImport(repositoryRoot: string, record: ExternalArticleImportV1, message: string): Promise<ExternalArticleImportV1> {
  const stage = nextStage[record.stage];
  if (!stage) throw new Error(`Stage ${record.stage} cannot advance automatically.`);
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, stage, updatedAt: at, stageReceipts: [...record.stageReceipts, { stage, status: "passed", at, message }], nextAction: `Complete ${stage.toLowerCase()} and record its receipt.` });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function recordImportRelease(repositoryRoot: string, record: ExternalArticleImportV1, releaseInput: unknown): Promise<ExternalArticleImportV1> {
  if (record.stage !== "RELEASING") throw new Error("A release receipt can only be recorded from RELEASING.");
  const release = externalArticleImportSchema.shape.release.unwrap().parse(releaseInput);
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, stage: "VERIFYING", release, updatedAt: at, stageReceipts: [...record.stageReceipts, { stage: "VERIFYING", status: "started", at, message: "Release receipt recorded; production verification is required." }], nextAction: "Verify every release check before marking LIVE." });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function verifyImportRelease(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  if (record.stage !== "VERIFYING" || !record.release) throw new Error("A validated release receipt is required before production verification.");
  const release = externalArticleImportSchema.shape.release.unwrap().parse(record.release);
  if (Object.values(release.checks).some((check) => check !== true)) throw new Error("Every required production check must pass before LIVE.");
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, stage: "LIVE", updatedAt: at, stageReceipts: [...record.stageReceipts, { stage: "LIVE", status: "passed", at, message: "All production checks passed." }], nextAction: "none" });
  return deleteRawSource(repositoryRoot, updated.importId, updated, at);
}

export async function resumeImport(repositoryRoot: string, record: ExternalArticleImportV1): Promise<ExternalArticleImportV1> {
  if (record.stage !== "WAITING_EXTERNAL") throw new Error("Only WAITING_EXTERNAL imports can be explicitly resumed.");
  const prior = [...record.stageReceipts].reverse().find((receipt) => receipt.stage !== "WAITING_EXTERNAL" && receipt.status !== "waiting");
  const stage = prior?.stage && nextStage[prior.stage] ? prior.stage : "RESEARCHING";
  const at = now();
  const updated = externalArticleImportSchema.parse({ ...record, stage, updatedAt: at, stageReceipts: [...record.stageReceipts, { stage, status: "started", at, message: "External dependency recovered; resumed explicitly." }], nextAction: `Retry ${stage.toLowerCase()} using the next recorded strategy.` });
  await saveImport(repositoryRoot, updated);
  return updated;
}

export async function recordImportFailure(repositoryRoot: string, record: ExternalArticleImportV1, input: { strategy: string; classification: FailureClass; message: string }): Promise<ExternalArticleImportV1> {
  const attemptKey = input.classification === "transient" ? `transient:${input.strategy}` : input.strategy;
  const attempt = (record.strategyAttempts[attemptKey] ?? 0) + 1;
  const attempts = { ...record.strategyAttempts, [attemptKey]: attempt };
  const strategies = STRATEGIES[input.strategy] ?? ["retry", "alternate", "quarantine"];
  const next = strategies[attempt] ?? "quarantine";
  const at = now();
  const exhausted = next === "quarantine";
  const stage: ImportStage = input.classification === "transient" && !exhausted ? "WAITING_EXTERNAL" : next === "quarantine" ? "QUARANTINED" : "REPAIRING";
  const updated = externalArticleImportSchema.parse({ ...record, stage, updatedAt: at, strategyAttempts: attempts, stageReceipts: [...record.stageReceipts, { stage, status: stage === "WAITING_EXTERNAL" ? "waiting" : stage === "QUARANTINED" ? "quarantined" : "failed", at, message: input.message }], nextAction: stage === "WAITING_EXTERNAL" ? "Heartbeat: retry after external dependency recovers." : stage === "QUARANTINED" ? "none" : `Apply strategy ${next}.` });
  await saveImport(repositoryRoot, updated);
  if (stage === "QUARANTINED") return deleteRawSource(repositoryRoot, updated.importId, updated, at);
  return updated;
}

async function deleteRawSource(repositoryRoot: string, importId: string, record: ExternalArticleImportV1, at: string): Promise<ExternalArticleImportV1> {
  try { await unlink(sourcePath(repositoryRoot, importId)); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const updated = externalArticleImportSchema.parse({ ...record, sourceDeletedAt: at });
  await atomicWrite(recordPath(repositoryRoot, importId), updated);
  return updated;
}
