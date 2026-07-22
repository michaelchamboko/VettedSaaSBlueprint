import previewRegistry from "@/generated/landing-page-batches/registry.json";
import type { LoadedCodexLandingBatch } from "@/lib/codex-batches/loader";
import type { PageBlueprint } from "@/lib/schemas/contracts";

export type CodexBatchBlueprintPreview = {
  kind: "blueprint";
  batch_id: string;
  page_blueprint_id: string;
  slug: string;
  affiliate_url: string;
  blueprint: PageBlueprint;
};

type CodexBatchPreviewRegistry = {
  schema_version: number;
  previews: unknown;
};

const UUID_V4_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRegistryPreview(value: unknown): asserts value is CodexBatchBlueprintPreview {
  if (!isRecord(value)
    || value.kind !== "blueprint"
    || typeof value.batch_id !== "string"
    || !UUID_V4_PATTERN.test(value.batch_id)
    || typeof value.page_blueprint_id !== "string"
    || !UUID_V4_PATTERN.test(value.page_blueprint_id)
    || typeof value.slug !== "string"
    || value.slug.length === 0
    || typeof value.affiliate_url !== "string"
    || value.affiliate_url.length === 0
    || !isRecord(value.blueprint)) {
    throw new Error("Codex preview registry contains an invalid preview entry.");
  }
}

export function buildCodexBatchPreviewCatalogue(batches: LoadedCodexLandingBatch[]) {
  const catalogue = new Map<string, CodexBatchBlueprintPreview>();
  for (const batch of batches) {
    for (const page of batch.pages) {
      const slug = page.manifestPage.slug;
      if (catalogue.has(slug)) {
        throw new Error(`Duplicate preview slug '${slug}' is ambiguous across Codex batches.`);
      }
      catalogue.set(slug, {
        kind: "blueprint",
        batch_id: batch.manifest.batch_id,
        page_blueprint_id: page.manifestPage.page_blueprint_id,
        slug,
        affiliate_url: batch.productPack.affiliate.original_url,
        blueprint: page.blueprint,
      });
    }
  }
  return catalogue;
}

export function buildCodexBatchPreviewRegistryCatalogue(registry: CodexBatchPreviewRegistry) {
  if (registry.schema_version !== 1 || !Array.isArray(registry.previews)) {
    throw new Error("Codex preview registry must use schema_version 1 with a previews array.");
  }

  const catalogue = new Map<string, CodexBatchBlueprintPreview>();
  for (const preview of registry.previews) {
    assertRegistryPreview(preview);
    if (catalogue.has(preview.slug)) {
      throw new Error(`Duplicate preview slug '${preview.slug}' is ambiguous in the Codex preview registry.`);
    }
    catalogue.set(preview.slug, preview);
  }
  return catalogue;
}

const defaultCatalogue = buildCodexBatchPreviewRegistryCatalogue(previewRegistry);

export function listCodexBatchPreviewRegistryBatchIds() {
  return [...new Set([...defaultCatalogue.values()].map((preview) => preview.batch_id))].sort();
}

export async function listCodexBatchPreviewSlugs() {
  return [...defaultCatalogue.keys()].sort();
}

export async function getCodexBatchPreview(slug: string) {
  return defaultCatalogue.get(slug) ?? null;
}
