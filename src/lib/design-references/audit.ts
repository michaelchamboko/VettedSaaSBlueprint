import { z } from "zod";

import { classifyDesignReferenceSnapshot, type DesignReferenceViewportSnapshot } from "./classifier";
import type { ReferenceIngestionReference } from "./ingestion";
import {
  DesignReferenceSourceRegistryV1,
  type DesignReferenceSourceRegistryV1 as SourceRegistry,
  type DesignReferenceSourceV1,
  type ReferenceAuditFailureReason,
} from "./source-registry";

export type AuditedReferenceCapture = {
  desktop: DesignReferenceViewportSnapshot;
  mobile: DesignReferenceViewportSnapshot;
  reduced_motion: { animation_count: number; visible_text_length: number };
  desktop_capture: Buffer;
  mobile_capture: Buffer;
};

export type ReferenceAuditAdapter = {
  audit(source: DesignReferenceSourceV1, attempt: number): Promise<AuditedReferenceCapture>;
  close?(): Promise<void>;
};

export type ActiveReferenceAudit = {
  source: DesignReferenceSourceV1;
  reference: ReferenceIngestionReference;
  desktop_capture: Buffer;
  mobile_capture: Buffer;
};

export class ReferenceAuditFailure extends Error {
  constructor(
    public readonly reason: ReferenceAuditFailureReason,
    message: string,
    public readonly resolved_url: string | null = null,
    public readonly response_status: number | null = null,
  ) { super(message); }
}

const waveSchema = z.object({
  wave: z.number().int().positive(),
  source_ids: z.array(z.string().regex(/^lp-ref-\d{4}$/)),
  active_ids: z.array(z.string().regex(/^lp-ref-\d{4}$/)),
  unavailable_ids: z.array(z.string().regex(/^lp-ref-\d{4}$/)),
  status: z.literal("committed"),
}).strict();

export const DesignReferenceAuditRunV1 = z.object({
  schema_version: z.literal("DesignReferenceAuditRunV1"),
  run_id: z.string().regex(/^reference-audit-[a-z0-9-]+$/),
  started_at: z.string().datetime({ offset: true }),
  completed_at: z.string().datetime({ offset: true }),
  batch_size: z.number().int().positive(),
  concurrency: z.number().int().positive(),
  total_sources: z.number().int().nonnegative(),
  processed_sources: z.number().int().nonnegative(),
  active_count: z.number().int().nonnegative(),
  unavailable_count: z.number().int().nonnegative(),
  pending_count: z.number().int().nonnegative(),
  aggregate_capture_bytes: z.number().int().nonnegative(),
  category_coverage: z.array(z.string()),
  catalogue_sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  waves: z.array(waveSchema),
}).strict();

type AuditOutcome =
  | { status: "active"; active: ActiveReferenceAudit; attempts: number; resolved_url: string; response_status: number }
  | { status: "unavailable"; reason: ReferenceAuditFailureReason; attempts: number; resolved_url: string | null; response_status: number | null };

async function boundedMap<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const run = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function failureFrom(error: unknown): ReferenceAuditFailure {
  if (error instanceof ReferenceAuditFailure) return error;
  const message = error instanceof Error ? error.message : String(error);
  const timeout = error instanceof Error && (error.name === "TimeoutError" || /timeout|timed out/i.test(error.message));
  return new ReferenceAuditFailure(timeout ? "network_timeout" : "capture_invalid", message);
}

async function auditOne(source: DesignReferenceSourceV1, adapter: ReferenceAuditAdapter, capturedAt: string): Promise<AuditOutcome> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const capture = await adapter.audit(source, attempt);
      const classification = classifyDesignReferenceSnapshot({ source, captured_at: capturedAt, ...capture });
      if (classification.status === "unavailable") {
        return { status: "unavailable", reason: classification.failure_reason, attempts: attempt, resolved_url: classification.resolved_url, response_status: classification.response_status };
      }
      return {
        status: "active",
        active: { source, reference: classification.reference, desktop_capture: capture.desktop_capture, mobile_capture: capture.mobile_capture },
        attempts: attempt,
        resolved_url: capture.desktop.resolved_url,
        response_status: capture.desktop.response_status,
      };
    } catch (error) {
      const failure = failureFrom(error);
      if (failure.reason === "network_timeout" && attempt === 1) continue;
      return { status: "unavailable", reason: failure.reason, attempts: attempt, resolved_url: failure.resolved_url, response_status: failure.response_status };
    }
  }
  return { status: "unavailable", reason: "network_timeout", attempts: 2, resolved_url: null, response_status: null };
}

export async function refreshOldestReferences(input: {
  registry: SourceRegistry;
  catalogue: { references: Array<{ id: string; source_url: string; captured_at: string; captures: { desktop?: { path: string; sha256: string; byte_size: number }; mobile?: { path: string; sha256: string; byte_size: number } } }> };
  count: number;
  adapter: ReferenceAuditAdapter;
  commit_refresh: (input: { active: ActiveReferenceAudit[] }) => Promise<{ rollback?: () => Promise<void> }>;
  batch_size?: number;
  concurrency?: number;
  now?: () => Date;
}) {
  const batchSize = input.batch_size ?? 10;
  const concurrency = input.concurrency ?? 4;
  const now = input.now ?? (() => new Date());
  const capturedAt = now().toISOString();
  const activeSourcesMap = new Map(input.registry.sources.filter((s) => s.audit.status === "active").map((s) => [s.id, s]));
  const catalogueMap = new Map(input.catalogue.references.map((r) => [r.id, r]));
  const activesWithDates = [...activeSourcesMap.values()]
    .map((s) => ({ source: s, captured_at: catalogueMap.get(s.id)?.captured_at ?? "1970-01-01T00:00:00.000Z" }))
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at) || a.source.id.localeCompare(b.source.id))
    .slice(0, input.count);
  const toRefresh = activesWithDates.map((a) => a.source);
  if (toRefresh.length === 0) return { refreshed_ids: [], failed_ids: [], summary: { refreshed_count: 0, failed_count: 0 } };

  const batches: Array<typeof toRefresh> = [];
  for (let offset = 0; offset < toRefresh.length; offset += batchSize) {
    batches.push(toRefresh.slice(offset, offset + batchSize));
  }

  let refreshedCount = 0;
  let failedCount = 0;
  const refreshedIds: string[] = [];
  const failedIds: string[] = [];

  for (const batch of batches) {
    const outcomes = await boundedMap(batch, concurrency, (source) => auditOne(source, input.adapter, capturedAt));
    const activeOutcomes: Array<{ source: DesignReferenceSourceV1; reference: ReferenceIngestionReference; desktop_capture: Buffer; mobile_capture: Buffer }> = [];
    const unavailableIds: string[] = [];

    for (let index = 0; index < batch.length; index++) {
      const outcome = outcomes[index];
      const source = batch[index];
      if (outcome.status === "active") {
        activeOutcomes.push({ source: outcome.active.source, reference: outcome.active.reference, desktop_capture: outcome.active.desktop_capture, mobile_capture: outcome.active.mobile_capture });
      } else {
        unavailableIds.push(source.id);
      }
    }

    for (const id of unavailableIds) failedIds.push(id);

    if (activeOutcomes.length > 0) {
      try {
        await input.commit_refresh({ active: activeOutcomes });
        refreshedCount += activeOutcomes.length;
        for (const a of activeOutcomes) refreshedIds.push(a.source.id);
      } catch {
        for (const a of activeOutcomes) failedIds.push(a.source.id);
        for (let index = 0; index < outcomes.length; index++) {
          const o = outcomes[index];
          if (o.status === "unavailable") {
            const s = batch[index];
            if (s && !failedIds.includes(s.id)) failedIds.push(s.id);
          }
        }
      }
    }

    failedCount += unavailableIds.length;
  }

  return {
    refreshed_ids: refreshedIds,
    failed_ids: [...new Set(failedIds)],
    summary: { refreshed_count: refreshedCount, failed_count: failedCount },
  };
}

export async function auditDesignReferenceRegistry(input: {
  registry: SourceRegistry;
  adapter: ReferenceAuditAdapter;
  commit_wave: (input: { wave: number; active: ActiveReferenceAudit[] }) => Promise<void>;
  persist_progress?: (input: { registry: SourceRegistry; summary: z.infer<typeof DesignReferenceAuditRunV1> }) => Promise<void>;
  batch_size?: number;
  concurrency?: number;
  now?: () => Date;
}) {
  const batchSize = input.batch_size ?? 10;
  const concurrency = input.concurrency ?? 4;
  if (batchSize !== 10) throw new Error("Reference audits require ten-site transactional waves.");
  if (concurrency < 1 || concurrency > 4) throw new Error("Reference audit concurrency must be between one and four.");
  const now = input.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const runId = `reference-audit-${startedAt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  let registry = DesignReferenceSourceRegistryV1.parse(structuredClone(input.registry));
  const pending = registry.sources.filter((source) => source.audit.status === "pending");
  const waves: z.infer<typeof waveSchema>[] = [];
  let aggregateCaptureBytes = 0;

  try {
    for (let offset = 0; offset < pending.length; offset += batchSize) {
      const waveNumber = Math.floor(offset / batchSize) + 1;
      const waveSources = pending.slice(offset, offset + batchSize);
      const capturedAt = now().toISOString();
      const outcomes = await boundedMap(waveSources, concurrency, (source) => auditOne(source, input.adapter, capturedAt));
      const active = outcomes.flatMap((outcome) => outcome.status === "active" ? [outcome.active] : []);
      await input.commit_wave({ wave: waveNumber, active });
      const byId = new Map(waveSources.map((source, index) => [source.id, outcomes[index]]));
      registry = DesignReferenceSourceRegistryV1.parse({
        ...registry,
        updated_at: now().toISOString(),
        sources: registry.sources.map((source) => {
          const outcome = byId.get(source.id);
          if (!outcome) return source;
          if (outcome.status === "active") {
            aggregateCaptureBytes += outcome.active.desktop_capture.byteLength + outcome.active.mobile_capture.byteLength;
            return {
              ...source,
              primary_product_category: outcome.active.reference.primary_product_category,
              category_tags: outcome.active.reference.category_tags,
              audit: { status: "active", audited_at: capturedAt, attempts: outcome.attempts, resolved_url: outcome.resolved_url, response_status: outcome.response_status, failure_reason: null },
            };
          }
          return {
            ...source,
            audit: { status: "unavailable", audited_at: capturedAt, attempts: outcome.attempts, resolved_url: outcome.resolved_url, response_status: outcome.response_status, failure_reason: outcome.reason },
          };
        }),
      });
      waves.push({
        wave: waveNumber,
        source_ids: waveSources.map((source) => source.id),
        active_ids: active.map((item) => item.source.id),
        unavailable_ids: waveSources.filter((source) => byId.get(source.id)?.status === "unavailable").map((source) => source.id),
        status: "committed",
      });
      const interim = DesignReferenceAuditRunV1.parse({
        schema_version: "DesignReferenceAuditRunV1",
        run_id: runId,
        started_at: startedAt,
        completed_at: now().toISOString(),
        batch_size: batchSize,
        concurrency,
        total_sources: registry.sources.length,
        processed_sources: registry.sources.filter((source) => source.audit.status !== "pending").length,
        active_count: registry.sources.filter((source) => source.audit.status === "active").length,
        unavailable_count: registry.sources.filter((source) => source.audit.status === "unavailable").length,
        pending_count: registry.sources.filter((source) => source.audit.status === "pending").length,
        aggregate_capture_bytes: aggregateCaptureBytes,
        category_coverage: [...new Set(registry.sources.filter((source) => source.audit.status === "active").map((source) => source.primary_product_category))].sort(),
        catalogue_sha256: null,
        waves,
      });
      await input.persist_progress?.({ registry, summary: interim });
    }
  } finally {
    await input.adapter.close?.();
  }

  const summary = DesignReferenceAuditRunV1.parse({
    schema_version: "DesignReferenceAuditRunV1",
    run_id: runId,
    started_at: startedAt,
    completed_at: now().toISOString(),
    batch_size: batchSize,
    concurrency,
    total_sources: registry.sources.length,
    processed_sources: registry.sources.filter((source) => source.audit.status !== "pending").length,
    active_count: registry.sources.filter((source) => source.audit.status === "active").length,
    unavailable_count: registry.sources.filter((source) => source.audit.status === "unavailable").length,
    pending_count: registry.sources.filter((source) => source.audit.status === "pending").length,
    aggregate_capture_bytes: aggregateCaptureBytes,
    category_coverage: [...new Set(registry.sources.filter((source) => source.audit.status === "active").map((source) => source.primary_product_category))].sort(),
    catalogue_sha256: null,
    waves,
  });
  return { registry, summary };
}
