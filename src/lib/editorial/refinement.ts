import { createHash } from "node:crypto";
import { z } from "zod";

import { blogPostSchema } from "../blog/contracts";
import { decisionSetV2Schema } from "../decision-journey/sets";
import { pageBlueprintSchema } from "../schemas/contracts";
import { visibilityPageSchema } from "../visibility-pages/contracts";

export const EDITORIAL_REVISION = "eleanor-v1:8e111f95a558f454aff6f6c0bfd7bb77dcd7e8a1";
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

export function editorialProse(format: string, value: unknown): string {
  getFormat(format).schema.parse(value);
  const prose: string[] = [];
  const visit = (entry: unknown, path: string[]) => {
    if (typeof entry === "string" && allowed(format, path)) prose.push(entry);
    else if (Array.isArray(entry)) entry.forEach((item, index) => visit(item, [...path, String(index)]));
    else if (entry && typeof entry === "object") Object.entries(entry).forEach(([key, item]) => visit(item, [...path, key]));
  };
  visit(value, []);
  return prose.join("\n\n");
}

const notesSchema = z.object({
  semanticNotes: z.string().trim().min(20),
  exceptions: z.array(z.string().trim().min(10)),
  meaningPreserved: z.literal(true),
  arrayOrderPreserved: z.literal(true),
}).strict();

export function createEditorialEvidence(
  format: string, before: unknown, after: unknown,
  notes: unknown, checker: { before: string; after: string },
) {
  const changedPaths = compareEditorialArtifacts(format, before, after);
  const review = notesSchema.parse(notes);
  if (!checker.before.trim() || !checker.after.trim()) throw new Error("Checker findings are required for both drafts.");
  return {
    schemaVersion: "EditorialEvidenceV1",
    format,
    revision: EDITORIAL_REVISION,
    beforeFingerprint: fingerprintEditorialArtifact(before),
    afterFingerprint: fingerprintEditorialArtifact(after),
    changedPaths,
    checker,
    ...review,
  };
}

export function canReuseEditorialEvidence(evidence: ReturnType<typeof createEditorialEvidence>, format: string, artifact: unknown): boolean {
  getFormat(format).schema.parse(artifact);
  return evidence.revision === EDITORIAL_REVISION && evidence.format === format &&
    evidence.afterFingerprint === fingerprintEditorialArtifact(artifact);
}
