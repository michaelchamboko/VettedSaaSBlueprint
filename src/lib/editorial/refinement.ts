import { createHash } from "node:crypto";
import { z } from "zod";

import { blogPostSchema } from "../blog/contracts";
import { decisionSetV2Schema } from "../decision-journey/sets";
import { pageBlueprintSchema } from "../schemas/contracts";
import { visibilityPageSchema } from "../visibility-pages/contracts";

export const EDITORIAL_REVISION = "slopmonster-full-rewrite-v2:8bf609edfaeed844f1d03bb6b69f80dc21728c8b";
const formats = {
  decision: {
    schema: decisionSetV2Schema,
    prose: [
      "pages.*.headline", "pages.*.decisionContext",
      "pages.*.blocks.*.title", "pages.*.blocks.*.summary",
    ],
  },
  landing: {
    schema: pageBlueprintSchema,
    prose: [
      "hero.headline", "hero.subheadline", "hero.answer_snippet",
      "hero.primary_cta_label", "cta_blocks.*.label", "cta_blocks.*.supporting_text",
      "problem_solution.problem", "problem_solution.agitation", "problem_solution.solution",
      "benefits.*.benefit_title", "benefits.*.benefit_description",
      "how_it_works.*.title", "how_it_works.*.description",
      "objection_handling.*.response", "faq.*.answer",
    ],
  },
  blog: {
    schema: blogPostSchema,
    prose: ["title", "description", "answerSummary", "sections.*.heading", "sections.*.paragraphs.*", "sections.*.bullets.*", "faqs.*.question", "faqs.*.answer"],
  },
  visibility: {
    schema: visibilityPageSchema,
    prose: ["hero.headline", "hero.summary", "blocks.*.heading", "blocks.*.paragraphs.*", "blocks.*.steps.*.description"],
  },
} as const;
export type EditorialFormat = keyof typeof formats;

function getFormat(format: string) {
  if (!Object.hasOwn(formats, format)) throw new Error(`Unsupported editorial format: ${format}`);
  return formats[format as EditorialFormat];
}

export function fingerprintEditorialArtifact(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function allowed(format: string, path: string[]) {
  return getFormat(format).prose.some((pattern) => {
    const parts = pattern.split(".");
    return parts.length === path.length && parts.every((part, index) => part === "*" || part === path[index]);
  });
}

export function compareEditorialArtifacts(format: string, before: unknown, after: unknown): string[] {
  const contract = getFormat(format);
  // Compare raw inputs, not parsed output: Zod defaults/stripping must never hide a mutation.
  contract.schema.parse(before);
  contract.schema.parse(after);
  const changed: string[] = [];
  const visit = (oldValue: unknown, newValue: unknown, path: string[]) => {
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      if (oldValue.length !== newValue.length) throw new Error(`Array structure changed: ${path.join(".")}`);
      oldValue.forEach((item, index) => {
        const movedFrom = oldValue.findIndex((other) => JSON.stringify(other) === JSON.stringify(newValue[index]));
        if (movedFrom !== -1 && movedFrom !== index && JSON.stringify(item) !== JSON.stringify(newValue[index])) {
          throw new Error(`Array order changed: ${path.join(".")}`);
        }
        visit(item, newValue[index], [...path, String(index)]);
      });
      return;
    }
    if (oldValue && newValue && typeof oldValue === "object" && typeof newValue === "object" && !Array.isArray(oldValue) && !Array.isArray(newValue)) {
      const oldRecord = oldValue as Record<string, unknown>;
      const newRecord = newValue as Record<string, unknown>;
      if (Object.keys(oldRecord).sort().join("\0") !== Object.keys(newRecord).sort().join("\0")) {
        throw new Error(`Object structure changed: ${path.join(".")}`);
      }
      Object.keys(oldRecord).forEach((key) => visit(oldRecord[key], newRecord[key], [...path, key]));
      return;
    }
    if (typeof oldValue !== "string" || typeof newValue !== "string" || !allowed(format, path)) {
      throw new Error(`Protected field changed: ${path.join(".")}`);
    }
    changed.push(path.join("."));
  };
  visit(before, after, []);
  return changed;
}

function walkEditorial(format: string, value: unknown, onString: (entry: string, path: string[]) => void): void {
  const visit = (entry: unknown, path: string[]) => {
    if (typeof entry === "string") {
      if (allowed(format, path)) onString(entry, path);
    } else if (Array.isArray(entry)) {
      entry.forEach((item, index) => visit(item, [...path, String(index)]));
    } else if (entry && typeof entry === "object") {
      Object.entries(entry).forEach(([key, item]) => visit(item, [...path, key]));
    }
  };
  visit(value, []);
}

export function editorialProse(format: string, value: unknown): string {
  getFormat(format).schema.parse(value);
  const prose: string[] = [];
  walkEditorial(format, value, (entry) => prose.push(entry));
  return prose.join("\n\n");
}

export function editorialProsePaths(format: string, value: unknown): string[] {
  getFormat(format).schema.parse(value);
  const paths: string[] = [];
  walkEditorial(format, value, (_entry, path) => paths.push(path.join(".")));
  return paths;
}

/**
 * Deterministic guardrails for the full-article rewrite. A CLEAN score is a
 * necessary wording check, not proof that a rewrite is usable. These checks
 * catch the two failure modes that previously reached publication: a repeated
 * stock sentence injected into many fields and internal drafting language.
 */
export function assertEditorialVoiceSignals(format: string, value: unknown): void {
  const prose = editorialProse(format, value);
  const sentences = prose
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim().replace(/\s+/g, " ").toLocaleLowerCase())
    .filter((sentence) => sentence.length >= 10);
  const counts = new Map<string, number>();
  for (const sentence of sentences) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
  const repeated = [...counts.entries()].filter(([, count]) => count >= 3).map(([sentence]) => sentence);
  if (repeated.length > 0) {
    throw new Error(`Editorial voice guard rejected repeated prose sentence(s): ${repeated.slice(0, 3).join(" | ")}`);
  }
  if (/\b(?:review\s+the\s+details\s+before\s+acting|supplied\s+draft|draft['’]s|as\s+an\s+ai|generated\s+copy|placeholder\s+text)\b/i.test(prose)) {
    throw new Error("Editorial voice guard rejected internal drafting or model language in editable prose.");
  }
}

const rewritePassesSchema = z.object({
  purposeAndStructure: z.literal(true),
  meaningAndEvidence: z.literal(true),
  wordingAndRhythm: z.literal(true),
  rivalFamilyCleanse: z.literal(true).optional(),
  beamReview: z.literal(true).optional(),
  finalFidelityReview: z.literal(true),
}).strict().superRefine((passes, context) => {
  const rival = passes.rivalFamilyCleanse === true;
  const beam = passes.beamReview === true;
  if (rival === beam) {
    context.addIssue({ code: "custom", path: ["rivalFamilyCleanse"], message: "Exactly one of rivalFamilyCleanse or beamReview must be true." });
  }
});
const editorialSharedFields = {
  semanticNotes: z.string().trim().min(20),
  exceptions: z.array(z.string().trim().min(10)),
  meaningPreserved: z.literal(true),
  arrayOrderPreserved: z.literal(true),
  rewriteMode: z.literal("full_article"),
  writerModelFamily: z.string().trim().min(1),
  cleanseModelFamily: z.string().trim().min(1),
  passes: rewritePassesSchema,
};

const notesSchema = z.object(editorialSharedFields).strict().superRefine((notes, context) => {
  const usesBeamReview = notes.passes.beamReview === true;
  if (usesBeamReview) {
    if (notes.writerModelFamily.toLocaleLowerCase() !== notes.cleanseModelFamily.toLocaleLowerCase()) {
      context.addIssue({ code: "custom", path: ["cleanseModelFamily"], message: "Beam review must use the same model family as the writer; a distinct OpenCode session establishes independence." });
    }
  } else if (notes.writerModelFamily.toLocaleLowerCase() === notes.cleanseModelFamily.toLocaleLowerCase()) {
    context.addIssue({ code: "custom", path: ["cleanseModelFamily"], message: "The cleanse must use a different model family from the writer." });
  }
});

const checkerSchema = z.object({
  before: z.string().trim().min(1),
  after: z.string().trim().regex(/score\s+5\/5\s+CLEAN/i, "The final SlopMonster check must report score 5/5 CLEAN."),
}).strict();

export const editorialEvidenceSchema = z.object({
  schemaVersion: z.literal("EditorialEvidenceV2"),
  format: z.enum(["decision", "landing", "blog", "visibility"]),
  revision: z.literal(EDITORIAL_REVISION),
  beforeFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  afterFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  eligibleProsePaths: z.array(z.string().min(1)).min(1),
  changedPaths: z.array(z.string().min(1)).min(1),
  checker: checkerSchema,
  ...editorialSharedFields,
}).strict().superRefine((evidence, context) => {
  const usesBeamReview = evidence.passes.beamReview === true;
  if (usesBeamReview) {
    if (evidence.writerModelFamily.toLocaleLowerCase() !== evidence.cleanseModelFamily.toLocaleLowerCase()) {
      context.addIssue({ code: "custom", path: ["cleanseModelFamily"], message: "Beam review must use the same model family as the writer; a distinct OpenCode session establishes independence." });
    }
  } else if (evidence.writerModelFamily.toLocaleLowerCase() === evidence.cleanseModelFamily.toLocaleLowerCase()) {
    context.addIssue({ code: "custom", path: ["cleanseModelFamily"], message: "The cleanse must use a different model family from the writer." });
  }
  if (evidence.eligibleProsePaths.length !== evidence.changedPaths.length ||
    evidence.eligibleProsePaths.some((path, index) => path !== evidence.changedPaths[index])) {
    context.addIssue({ code: "custom", path: ["changedPaths"], message: "Every eligible prose path must be rewritten." });
  }
});

export function createEditorialEvidence(
  format: string, before: unknown, after: unknown,
  notes: unknown, checker: { before: string; after: string },
) {
  const changedPaths = compareEditorialArtifacts(format, before, after);
  assertEditorialVoiceSignals(format, after);
  const review = notesSchema.parse(notes);
  const eligibleProsePaths = editorialProsePaths(format, before);
  const unchangedPaths = eligibleProsePaths.filter((path) => !changedPaths.includes(path));
  if (unchangedPaths.length > 0) {
    throw new Error(`Full-article rewrite left editable prose unchanged: ${unchangedPaths.join(", ")}`);
  }
  return editorialEvidenceSchema.parse({
    schemaVersion: "EditorialEvidenceV2",
    format,
    revision: EDITORIAL_REVISION,
    beforeFingerprint: fingerprintEditorialArtifact(before),
    afterFingerprint: fingerprintEditorialArtifact(after),
    eligibleProsePaths,
    changedPaths,
    checker: checkerSchema.parse(checker),
    ...review,
  });
}

export function canReuseEditorialEvidence(evidence: unknown, format: string, artifact: unknown): boolean {
  const parsed = editorialEvidenceSchema.safeParse(evidence);
  if (!parsed.success || parsed.data.format !== format) return false;
  getFormat(format).schema.parse(artifact);
  const artifactProsePaths = editorialProsePaths(format, artifact);
  const coversArtifact = artifactProsePaths.length === parsed.data.eligibleProsePaths.length &&
    artifactProsePaths.every((path, index) => path === parsed.data.eligibleProsePaths[index]);
  return coversArtifact && parsed.data.afterFingerprint === fingerprintEditorialArtifact(artifact);
}
