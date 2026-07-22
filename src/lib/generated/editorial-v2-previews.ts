import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const previewSchema = z.object({
  design_profile: z.literal("editorial_v2"),
  robots: z.literal("noindex,nofollow"),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  product_name: z.string().min(1),
  category: z.string().min(1),
  affiliate_url: z.string().url(),
  title_tag: z.string().min(1),
  meta_description: z.string().min(1),
  headline: z.string().min(1),
  answer_snippet: z.string().min(1),
  subheadline: z.string().min(1),
  short_disclosure: z.string().min(1),
  full_disclosure: z.string().min(1),
  risk_reversal: z.string().min(1),
  fit_panel: z.object({
    problem: z.string().min(1),
    solution: z.string().min(1),
  }),
  benefits: z.array(z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  })).min(2),
  workflow: z.array(z.object({
    number: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().min(1),
  })).min(3).max(3),
  limitations: z.array(z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  })).min(1),
  faq: z.array(z.object({
    question: z.string().min(1),
    answer: z.string().min(1),
  })).min(4).max(7),
  evidence_notes: z.array(z.object({
    label: z.string().min(1),
    url: z.string().url(),
    note: z.string().min(1),
  })).min(1),
});

export type EditorialV2Preview = z.infer<typeof previewSchema>;

const previewDirectory = path.resolve(process.cwd(), "src/generated/landing-page-previews/next-50");

function loadPreviews(): Map<string, EditorialV2Preview> {
  if (!existsSync(previewDirectory)) return new Map();
  const previews = new Map<string, EditorialV2Preview>();
  for (const file of readdirSync(previewDirectory).filter((name) => name.endsWith(".json") && name !== "index.json").sort()) {
    const parsed = previewSchema.parse(JSON.parse(readFileSync(path.join(previewDirectory, file), "utf8")));
    previews.set(parsed.slug, parsed);
  }
  return previews;
}

const previewCatalogue = loadPreviews();

export function listEditorialV2PreviewSlugs() {
  return [...previewCatalogue.keys()];
}

export function getEditorialV2Preview(slug: string): EditorialV2Preview | null {
  return previewCatalogue.get(slug) ?? null;
}
