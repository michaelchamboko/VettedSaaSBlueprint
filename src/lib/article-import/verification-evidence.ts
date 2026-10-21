import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { importArtifactTarget } from "./format-validation";

const targetSchema = z.object({ format: z.enum(["direct-review", "blog", "visibility", "decision-set"]), slug: z.string().min(1), artifactFingerprint: z.string().regex(/^[a-f0-9]{64}$/), renderedRoutes: z.array(z.string().startsWith("/")).min(1) }).strict();
const evidenceSchema = z.object({ schemaVersion: z.literal("ImportVerifierEvidenceV1"), target: targetSchema, result: z.record(z.string(), z.unknown()) }).strict();
export type VerificationTarget = z.infer<typeof targetSchema>;

export function verificationContext(input: { mode?: string; origin: string; canonicalOrigin?: string; expectedCommit?: string }) {
  const verificationMode = z.enum(["candidate", "production"]).parse(input.mode ?? "production");
  const origin = new URL(input.origin);
  if (verificationMode === "candidate") {
    if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) || !["http:", "https:"].includes(origin.protocol)) throw new Error("CANDIDATE_REQUIRES_LOOPBACK_ORIGIN");
    if (input.expectedCommit) throw new Error("CANDIDATE_CANNOT_CLAIM_DEPLOYED_COMMIT");
  } else if (origin.protocol !== "https:") throw new Error("PRODUCTION_REQUIRES_HTTPS");
  const canonicalOrigin = new URL(input.canonicalOrigin ?? origin.origin);
  if (canonicalOrigin.protocol !== "https:") throw new Error("CANONICAL_ORIGIN_REQUIRES_HTTPS");
  return { verificationMode, origin: origin.origin, canonicalOrigin: canonicalOrigin.origin };
}

export function requireVerificationMode(value: unknown, expected: "candidate" | "production") {
  const result = z.object({ verificationMode: z.literal(expected), origin: z.string().url(), canonicalOrigin: z.string().url() }).passthrough().parse(value);
  verificationContext({ mode: expected, origin: result.origin, canonicalOrigin: result.canonicalOrigin, expectedCommit: typeof result.expected_commit === "string" ? result.expected_commit : undefined });
  if (expected === "candidate" && ("deployment" in result || "expected_commit" in result)) throw new Error("CANDIDATE_CANNOT_CLAIM_DEPLOYMENT");
}

export function assertVerifierResult(target: ReturnType<typeof importArtifactTarget>, value: unknown): void {
  const result = z.record(z.string(), z.unknown()).parse(value);
  if (target.format === "direct-review") {
    const snapshot = z.object({ httpOk: z.literal(true), disclosureOk: z.literal(true), allCtasExact: z.literal(true), allRevealSectionsVisible: z.literal(true), browserErrors: z.array(z.string()).length(0) }).passthrough();
    const parsed = z.object({ status: z.literal("pass"), robots_ok: z.literal(true), sitemap_ok: z.literal(true), pages: z.array(z.object({ path: z.string(), desktop: snapshot, mobile: snapshot }).passthrough()).min(1) }).passthrough().parse(result);
    if (JSON.stringify(parsed.pages.map((page) => page.path)) !== JSON.stringify(target.renderedRoutes)) throw new Error("VERIFIER_ROUTES_MISMATCH");
  } else if (target.format === "decision-set") {
    z.object({ passed: z.literal(true), browser_errors_ok: z.literal(true), robots_ok: z.literal(true), sitemap_ok: z.literal(true), checks: z.array(z.object({ passed: z.literal(true) }).passthrough()).min(1), screenshots: z.array(z.object({ route: z.string(), mode: z.string() }).passthrough()).min(2) }).passthrough().parse(result);
    const shots = result.screenshots as Array<{ route: string; mode: string }>;
    if (target.renderedRoutes.some((route) => !shots.some((shot) => shot.route === route && shot.mode.startsWith("desktop")) || !shots.some((shot) => shot.route === route && shot.mode.startsWith("mobile")))) throw new Error("VERIFIER_ROUTES_MISMATCH");
  } else {
    z.object({ ok: z.literal(true), verifiedRoutes: z.array(z.string()).min(1), viewportChecks: z.number().int().min(target.renderedRoutes.length * 2) }).passthrough().parse(result);
    if (JSON.stringify(result.verifiedRoutes) !== JSON.stringify(target.renderedRoutes)) throw new Error("VERIFIER_ROUTES_MISMATCH");
  }
}

export async function writeImportVerifierEvidence(file: string | undefined, target: ReturnType<typeof importArtifactTarget> | undefined, result: unknown) {
  if (!file) return;
  if (!target) throw new Error("VERIFIER_ARTIFACT_REQUIRED");
  const mode = z.object({ verificationMode: z.enum(["candidate", "production"]) }).passthrough().parse(result).verificationMode;
  requireVerificationMode(result, mode);
  assertVerifierResult(target, result);
  const absolute = path.resolve(file);
  if (path.relative(process.cwd(), absolute).startsWith("..")) throw new Error("VERIFIER_RECEIPT_OUTSIDE_REPOSITORY");
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, JSON.stringify(evidenceSchema.parse({ schemaVersion: "ImportVerifierEvidenceV1", target, result }), null, 2));
}

export async function readImportVerifierEvidence(root: string, file: string, expected: { format: string; artifactFingerprint: string; renderedRoutes: string[] }) {
  const repository = await realpath(root);
  const absolute = await realpath(path.resolve(repository, file));
  const relative = path.relative(repository, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("VERIFIER_RECEIPT_OUTSIDE_REPOSITORY");
  const bytes = await readFile(absolute);
  const evidence = evidenceSchema.parse(JSON.parse(bytes.toString("utf8")));
  requireVerificationMode(evidence.result, "candidate");
  if (evidence.target.format !== expected.format || evidence.target.artifactFingerprint !== expected.artifactFingerprint || JSON.stringify(evidence.target.renderedRoutes) !== JSON.stringify(expected.renderedRoutes)) throw new Error("VERIFIER_TARGET_MISMATCH");
  assertVerifierResult(evidence.target, evidence.result);
  return { path: relative.replaceAll("\\", "/"), sha256: createHash("sha256").update(bytes).digest("hex") };
}
