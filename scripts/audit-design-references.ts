import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

import { auditDesignReferenceRegistry, DesignReferenceAuditRunV1, refreshOldestReferences, type ReferenceAuditAdapter } from "../src/lib/design-references/audit";
import { DesignReferenceCatalogueV1, stableEntryDigest } from "../src/lib/design-references/contracts";
import { ingestDesignReferences, replaceDesignReference } from "../src/lib/design-references/ingestion";
import { createPlaywrightReferenceAuditAdapter } from "../src/lib/design-references/playwright-audit";
import { DesignReferenceSourceRegistryV1, referenceAuditFailureReasons, resetUnavailableSources, type ReferenceAuditFailureReason } from "../src/lib/design-references/source-registry";

function argument(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function atomicJsonWrite(target: string, value: unknown) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, target);
}

async function readCatalogue(catalogueDirectory: string) {
  return DesignReferenceCatalogueV1.parse(JSON.parse(await readFile(path.join(catalogueDirectory, "catalogue.json"), "utf8")));
}

function reconcileRegistry(registry: ReturnType<typeof DesignReferenceSourceRegistryV1.parse>, catalogue: ReturnType<typeof DesignReferenceCatalogueV1.parse>) {
  const references = new Map(catalogue.references.map((reference) => [reference.source_url, reference]));
  return DesignReferenceSourceRegistryV1.parse({
    ...registry,
    sources: registry.sources.map((source) => {
      const reference = references.get(source.source_url);
      if (!reference || source.audit.status !== "pending") return source;
      return {
        ...source,
        primary_product_category: reference.primary_product_category,
        category_tags: reference.category_tags,
        audit: { status: "active", audited_at: reference.captured_at, attempts: 1, resolved_url: reference.source_url, response_status: null, failure_reason: null },
      };
    }),
  });
}

export async function runReferenceAuditCli(input: {
  args?: string[];
  adapter?: ReferenceAuditAdapter;
  catalogueDirectory?: string;
  write?: (output: string) => void;
} = {}) {
  const args = input.args ?? process.argv.slice(2);
  const catalogueDirectory = path.resolve(input.catalogueDirectory ?? path.join(process.cwd(), "docs", "design-references", "landing-pages"));
  const sourcesPath = path.resolve(argument(args, "--sources") ?? path.join(catalogueDirectory, "sources.json"));
  const batchSize = Number.parseInt(argument(args, "--batch-size") ?? "10", 10);
  const concurrency = Number.parseInt(argument(args, "--concurrency") ?? "4", 10);
  const refreshOldest = Number.parseInt(argument(args, "--refresh-oldest") ?? "0", 10);
  const suppliedRegistry = DesignReferenceSourceRegistryV1.parse(JSON.parse(await readFile(sourcesPath, "utf8")));

  if (refreshOldest > 0) {
    const catalogue = await readCatalogue(catalogueDirectory);
    const adapter = input.adapter ?? createPlaywrightReferenceAuditAdapter(await chromium.launch({ headless: true }));
    const result = await refreshOldestReferences({
      registry: suppliedRegistry,
      catalogue: { references: catalogue.references },
      count: refreshOldest,
      adapter,
      batch_size: batchSize,
      concurrency,
      commit_refresh: async ({ active }) => {
        if (!active.length) return {};
        for (const item of active) {
          const ref = item.reference;
          await replaceDesignReference({
            catalogueDirectory,
            reference: ref as Parameters<typeof replaceDesignReference>[0]["reference"],
            desktopCapture: item.desktop_capture,
            mobileCapture: item.mobile_capture,
          });
        }
        return {};
      },
    });
    (input.write ?? ((output) => process.stdout.write(output)))(`${JSON.stringify(result)}\n`);
    return { refresh: result };
  }

  const requestedRetryReasons = (argument(args, "--retry-failures") ?? "").split(",").filter(Boolean);
  const invalidRetryReasons = requestedRetryReasons.filter((reason) => !referenceAuditFailureReasons.includes(reason as ReferenceAuditFailureReason));
  if (invalidRetryReasons.length) throw new Error(`Unsupported retry failure reason(s): ${invalidRetryReasons.join(", ")}.`);
  const retryRegistry = requestedRetryReasons.length ? resetUnavailableSources(suppliedRegistry, requestedRetryReasons as ReferenceAuditFailureReason[]) : suppliedRegistry;
  const existingCatalogue = await readCatalogue(catalogueDirectory);
  const registry = reconcileRegistry(retryRegistry, existingCatalogue);
  const adapter = input.adapter ?? createPlaywrightReferenceAuditAdapter(await chromium.launch({ headless: true }));
  const runDirectory = path.join(catalogueDirectory, "ingestion-runs");

  const result = await auditDesignReferenceRegistry({
    registry,
    adapter,
    batch_size: batchSize,
    concurrency,
    commit_wave: async ({ active }) => {
      if (!active.length) return;
      const byUrl = new Map(active.map((item) => [item.reference.source_url, item]));
      await ingestDesignReferences({
        manifest: { references: active.map((item) => item.reference) },
        catalogueDirectory,
        adapter: {
          capture: async (url, viewport) => {
            const audited = byUrl.get(url);
            if (!audited) throw new Error(`Missing cached audit capture for ${url}.`);
            return viewport.width === 1440 ? audited.desktop_capture : audited.mobile_capture;
          },
        },
      });
    },
    persist_progress: async ({ registry: nextRegistry, summary }) => {
      await atomicJsonWrite(sourcesPath, nextRegistry);
      await atomicJsonWrite(path.join(runDirectory, `${summary.run_id}.json`), summary);
    },
  });

  const catalogue = await readCatalogue(catalogueDirectory);
  const finalSummary = DesignReferenceAuditRunV1.parse({
    ...result.summary,
    active_count: result.registry.sources.filter((source) => source.audit.status === "active").length,
    unavailable_count: result.registry.sources.filter((source) => source.audit.status === "unavailable").length,
    pending_count: result.registry.sources.filter((source) => source.audit.status === "pending").length,
    aggregate_capture_bytes: catalogue.references.reduce((total, reference) => total + Object.values(reference.captures).reduce((sum, capture) => sum + (capture?.byte_size ?? 0), 0), 0),
    category_coverage: [...new Set(catalogue.references.map((reference) => reference.primary_product_category))].sort(),
    catalogue_sha256: stableEntryDigest(catalogue),
  });
  await atomicJsonWrite(sourcesPath, result.registry);
  await atomicJsonWrite(path.join(runDirectory, `${finalSummary.run_id}.json`), finalSummary);
  (input.write ?? ((output) => process.stdout.write(output)))(`${JSON.stringify(finalSummary)}\n`);
  return { registry: result.registry, summary: finalSummary };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void runReferenceAuditCli().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
