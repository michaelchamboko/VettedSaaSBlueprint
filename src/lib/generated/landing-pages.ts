import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

import { parseApprovedUrls } from "@/lib/landing-automation/approved-urls";
import {
  pageBlueprintSchema,
  type PageBlueprint,
} from "@/lib/schemas/contracts";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const gitCommitSchema = z.string().regex(/^[a-f0-9]{40}$/);
const pageSlugSchema = z.string().regex(/^[a-z0-9-]+$/);
const publicPathSchema = z
  .string()
  .regex(/^\/landing-page-builders\/[a-z0-9-]+$/);
const safeRelativeJsonPathSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._/-]*\.json$/)
  .refine(
    (value) =>
      !value.includes("\\") &&
      !value.split("/").some((segment) => !segment || segment === ".."),
    "Expected a safe relative JSON path.",
  );

const baseManifestPageSchema = z.object({
  slug: pageSlugSchema,
  title: z.string().min(1),
  artifact: safeRelativeJsonPathSchema,
  path: publicPathSchema,
  status: z.literal("published"),
  published_at: z.string().datetime(),
  current_version_id: z.string().min(1),
});

const oracleManifestPageSchema = baseManifestPageSchema.extend({
  publication_source: z.literal("oracle_dynamic_pages"),
  owner_publish_audit_id: z.string().min(1),
});

const agentManifestPageSchema = baseManifestPageSchema.extend({
  publication_source: z.literal("agent_verified_release"),
  release_receipt: safeRelativeJsonPathSchema,
});

const manifestPageSchema = z.discriminatedUnion("publication_source", [
  oracleManifestPageSchema,
  agentManifestPageSchema,
]);

const landingPageManifestSchema = z.object({
  generated_at: z.string().optional(),
  pages: z.array(manifestPageSchema),
});

const artifactFingerprintSchema = z
  .object({
    path: safeRelativeJsonPathSchema,
    sha256: sha256Schema,
  })
  .strict();

const landingReleaseReceiptSchema = z
  .object({
    schema_version: z.literal("LandingReleaseReceiptV1"),
    slug: pageSlugSchema,
    path: publicPathSchema,
    exact_affiliate_url: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
    url_fingerprint: sha256Schema,
    authorization: z
      .object({
        source: z.literal("approved-urls.md"),
        exact_url: z.string().url(),
        url_fingerprint: sha256Schema,
      })
      .strict(),
    artifacts: z
      .object({
        page: artifactFingerprintSchema,
        product_evidence: artifactFingerprintSchema,
        visual_review: artifactFingerprintSchema,
        uniqueness_review: artifactFingerprintSchema,
        compliance_review: artifactFingerprintSchema,
        conversion_review: artifactFingerprintSchema,
        quality_receipt: artifactFingerprintSchema,
      })
      .strict(),
    checks: z
      .object({
        product_evidence: z.literal(true),
        visual: z.literal(true),
        uniqueness: z.literal(true),
        compliance: z.literal(true),
        conversion: z.literal(true),
        quality: z.literal(true),
        exact_cta: z.literal(true),
        disclosure: z.literal(true),
        preview: z.literal(true),
        clean_build: z.literal(true),
      })
      .strict(),
    release: z
      .object({
        reviewed_commit: gitCommitSchema,
        preview_url: z.string().url(),
        verified_at: z.string().datetime(),
      })
      .strict(),
    claims_removed_or_softened: z.array(z.string()),
    oracle_sync: z.enum(["complete", "pending", "not_configured"]),
  })
  .strict();

type ManifestPage = z.infer<typeof manifestPageSchema>;
type LandingReleaseReceiptV1 = z.infer<typeof landingReleaseReceiptSchema>;

export type PublicReviewSummary = {
  slug: string;
  path: `/landing-page-builders/${string}`;
  title: string;
  description: string;
  categorySlug: string;
  decisionCue: string;
  limitationCue: string;
  publishedAt: string;
};

export type PublishedLandingPage = {
  blueprint: PageBlueprint;
  exactAffiliateUrl: string | null;
  publicationSource: ManifestPage["publication_source"];
  releaseReceipt: LandingReleaseReceiptV1 | null;
};

type Catalogue = {
  manifest: ManifestPage[];
  pages: Map<string, PublishedLandingPage>;
  summaries: PublicReviewSummary[];
};

const generatedLandingPagesDirectory = path.resolve(
  process.cwd(),
  "src/generated/landing-pages",
);

function parseJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function resolveArtifactPath(directory: string, artifactNameOrPath: string) {
  const safeName = artifactNameOrPath.trim();
  const candidate = path.resolve(
    directory,
    safeName.endsWith(".json") ? safeName : `${safeName}.json`,
  );
  const relative = path.relative(directory, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe artifact path "${safeName}"`);
  }
  return candidate;
}

function verifyFingerprint(
  directory: string,
  label: string,
  reference: { path: string; sha256: string },
): void {
  const artifactPath = resolveArtifactPath(directory, reference.path);
  if (!existsSync(artifactPath)) {
    throw new Error(`Missing ${label} release evidence "${reference.path}".`);
  }
  const actual = sha256(readFileSync(artifactPath));
  if (actual !== reference.sha256) {
    throw new Error(
      `Release fingerprint mismatch for ${label}: expected ${reference.sha256}, received ${actual}.`,
    );
  }
}

function loadApprovedUrlSet(): Set<string> {
  const allowlistPath = path.resolve(process.cwd(), "approved-urls.md");
  if (!existsSync(allowlistPath)) {
    throw new Error("Agent release validation requires approved-urls.md.");
  }
  const manifest = parseApprovedUrls(readFileSync(allowlistPath, "utf8"));
  return new Set(manifest.entries.map((entry) => entry.exactUrl));
}

function verifyAgentRelease(
  directory: string,
  entry: z.infer<typeof agentManifestPageSchema>,
): {
  blueprint: PageBlueprint;
  receipt: LandingReleaseReceiptV1;
} {
  const receiptPath = resolveArtifactPath(directory, entry.release_receipt);
  if (!existsSync(receiptPath)) {
    throw new Error(`Missing agent release receipt "${entry.release_receipt}".`);
  }
  const receipt = landingReleaseReceiptSchema.parse(
    parseJsonFile<unknown>(receiptPath),
  );
  if (receipt.slug !== entry.slug || receipt.path !== entry.path) {
    throw new Error(`Release receipt identity mismatch for "${entry.slug}".`);
  }
  if (
    receipt.authorization.exact_url !== receipt.exact_affiliate_url ||
    receipt.authorization.url_fingerprint !== receipt.url_fingerprint ||
    sha256(receipt.exact_affiliate_url) !== receipt.url_fingerprint
  ) {
    throw new Error(
      `Release receipt URL authorization mismatch for "${entry.slug}".`,
    );
  }
  if (!loadApprovedUrlSet().has(receipt.exact_affiliate_url)) {
    throw new Error(
      `The exact affiliate URL for "${entry.slug}" is not authorized in approved-urls.md.`,
    );
  }
  if (receipt.artifacts.page.path !== entry.artifact) {
    throw new Error(
      `Release receipt page path does not match the manifest for "${entry.slug}".`,
    );
  }

  for (const [label, reference] of Object.entries(receipt.artifacts)) {
    verifyFingerprint(directory, label, reference);
  }

  const blueprint = pageBlueprintSchema.parse(
    parseJsonFile<unknown>(
      resolveArtifactPath(directory, receipt.artifacts.page.path),
    ),
  );
  if (
    blueprint.metadata.url_slug !== entry.slug ||
    entry.path !== `/landing-page-builders/${entry.slug}`
  ) {
    throw new Error(`Manifest and artifact identity mismatch for "${entry.slug}".`);
  }
  if (
    blueprint.cta_blocks.some(
      (cta) =>
        cta.affiliate_link_id !== blueprint.hero.primary_cta_link_id,
    )
  ) {
    throw new Error(
      `Release receipt cannot authorize mismatched CTA ids for "${entry.slug}".`,
    );
  }
  return { blueprint, receipt };
}

function loadCatalogue(directory: string): Catalogue {
  const manifestPath = path.join(directory, "index.json");
  if (!existsSync(manifestPath)) {
    return { manifest: [], pages: new Map(), summaries: [] };
  }
  const manifest = landingPageManifestSchema.parse(
    parseJsonFile(manifestPath),
  ).pages;
  const pages = new Map<string, PublishedLandingPage>();
  const summaries: PublicReviewSummary[] = [];

  for (const entry of manifest) {
    let published: PublishedLandingPage;
    if (entry.publication_source === "agent_verified_release") {
      const { blueprint, receipt } = verifyAgentRelease(directory, entry);
      published = {
        blueprint,
        exactAffiliateUrl: receipt.exact_affiliate_url,
        publicationSource: entry.publication_source,
        releaseReceipt: receipt,
      };
    } else {
      const artifactPath = resolveArtifactPath(directory, entry.artifact);
      if (!existsSync(artifactPath)) {
        throw new Error(
          `Missing generated landing artifact "${entry.artifact}".`,
        );
      }
      const blueprint = pageBlueprintSchema.parse(
        parseJsonFile<unknown>(artifactPath),
      );
      if (
        blueprint.metadata.url_slug !== entry.slug ||
        entry.path !== `/landing-page-builders/${entry.slug}`
      ) {
        throw new Error(
          `Manifest and artifact identity mismatch for "${entry.slug}".`,
        );
      }
      published = {
        blueprint,
        exactAffiliateUrl: null,
        publicationSource: entry.publication_source,
        releaseReceipt: null,
      };
    }

    pages.set(entry.slug, published);
    summaries.push({
      slug: entry.slug,
      path: `/landing-page-builders/${entry.slug}`,
      title: published.blueprint.metadata.title_tag,
      description: published.blueprint.metadata.meta_description,
      categorySlug: published.blueprint.metadata.category_slug,
      decisionCue: published.blueprint.hero.subheadline,
      limitationCue: published.blueprint.limitations[0].limitation,
      publishedAt: entry.published_at,
    });
  }
  return { manifest, pages, summaries };
}

export function loadPublishedLandingPageSummariesFromDirectory(
  directory: string,
): PublicReviewSummary[] {
  return loadCatalogue(path.resolve(directory)).summaries;
}

export function loadPublishedLandingPageFromDirectory(
  directory: string,
  slug: string,
): PublishedLandingPage | null {
  if (!pageSlugSchema.safeParse(slug).success) return null;
  return loadCatalogue(path.resolve(directory)).pages.get(slug) ?? null;
}

let catalogue: Catalogue;
try {
  catalogue = loadCatalogue(generatedLandingPagesDirectory);
} catch {
  // Candidate, stale, or altered artifacts never become public.
  catalogue = { manifest: [], pages: new Map(), summaries: [] };
}

export function listPublishedLandingPageSlugs() {
  return [...catalogue.pages.keys()];
}

export function listPublishedLandingPageParams(): Array<{ slug: string }> {
  return listPublishedLandingPageSlugs().map((slug) => ({ slug }));
}

export function getPublishedLandingPageRecord(
  slug: string,
): PublishedLandingPage | null {
  if (!pageSlugSchema.safeParse(slug).success) return null;
  return catalogue.pages.get(slug) ?? null;
}

export function getPublishedLandingPage(slug: string): PageBlueprint | null {
  return getPublishedLandingPageRecord(slug)?.blueprint ?? null;
}

export function getLandingPageManifest(): ManifestPage[] {
  return [...catalogue.manifest];
}

export function listPublishedLandingPageSummaries(): PublicReviewSummary[] {
  return [...catalogue.summaries];
}
