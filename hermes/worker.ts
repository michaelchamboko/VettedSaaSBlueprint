import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { chmod, unlink, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

import { closePool, sql } from "@/lib/db";
import { isHighRiskClaimLevel, type PublishReadinessRequirements } from "@/lib/compliance/gate";
import { generateDailyRecommendations, type TrackingSnapshot } from "@/lib/optimization/recommendations";
import { canPublishPage } from "@/lib/pages/workflow";
import { parseStoredPageBlueprint } from "@/lib/pages/stored-blueprint";
import { fetchPublishedLandingArtifactsFromDb, writeLandingArtifactsToDirectory, type WrittenLandingArtifactsResult } from "@/lib/publication/landing-artifacts";
import { validateScraplingPolicy, type ScraplingCrawlPolicy } from "@/lib/research/scrapling";

type DbRow = Record<string, unknown>;
type HermesJob = {
  id: string;
  job_type: string;
  input_payload: Record<string, unknown>;
  product_id: string | null;
  page_id: string | null;
  locked_by: string | null;
};
type HermesBudget = { spent: number; limit: number };
type RedirectHealth = { ok: boolean; statusCode: number | null; finalUrl: string; redirectChain: string[]; error?: string };

const execFileAsync = promisify(execFile);
const apiBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const token = process.env.HERMES_API_TOKEN;
const workerId = process.env.HERMES_WORKER_ID ?? "vetted-saas-hermes-worker";

function rowValue(row: DbRow | null | undefined, key: string) {
  if (!row) return undefined;
  return row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
}

function asString(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function toJob(raw: DbRow | null | undefined): HermesJob | null {
  const id = asString(rowValue(raw, "id"));
  const jobType = asString(rowValue(raw, "job_type"));
  if (!id || !jobType) return null;
  return {
    id,
    job_type: jobType,
    input_payload: parseJsonObject(rowValue(raw, "input_payload")),
    product_id: asString(rowValue(raw, "product_id")),
    page_id: asString(rowValue(raw, "page_id")),
    locked_by: asString(rowValue(raw, "locked_by")),
  };
}

function getBudgetFromPayload(job: HermesJob): HermesBudget {
  return { spent: asNumber(job.input_payload.spent, 0), limit: asNumber(job.input_payload.limit, 0) };
}

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function utcMetricDate(raw: unknown) {
  const value = asString(raw);
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date().toISOString().slice(0, 10);
}

function dateRangeForMetricDate(metricDate: string) {
  const start = new Date(`${metricDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168 ||
    a === 100 && b >= 64 && b <= 127 ||
    a === 198 && (b === 18 || b === 19) ||
    a >= 224
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80") || normalized.startsWith("::ffff:");
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!normalized) return true;
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized === "metadata.google.internal") return true;
  if (normalized === "169.254.169.254") return true;
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) === 6) return isPrivateIpv6(normalized);
  return false;
}

export async function assertSafeOutboundUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Outbound fetch URL must use http or https.");
  if (parsed.username || parsed.password) throw new Error("Outbound fetch URL credentials are not allowed.");
  if (isBlockedHostname(parsed.hostname)) throw new Error("Outbound fetch URL targets a blocked host.");
  const records = await lookup(parsed.hostname, { all: true, verbatim: false }).catch(() => []);
  if (records.some((record) => isBlockedHostname(record.address))) throw new Error("Outbound fetch URL resolves to a blocked address.");
  return parsed.toString();
}

async function hermesFetch(pathname: string, init: RequestInit = {}, claimId?: string) {
  if (!token) throw new Error("HERMES_API_TOKEN is required");
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    "x-hermes-worker": workerId,
    ...(claimId ? { "x-hermes-claim": claimId } : {}),
    ...(init.headers ?? {}),
  };
  return fetch(`${apiBase}${pathname}`, { ...init, headers });
}

async function claimJob(): Promise<HermesJob | null> {
  const response = await hermesFetch("/api/hermes/jobs/claim", { method: "POST" });
  if (!response.ok) throw new Error(`Claim failed: ${response.status}`);
  const data = await response.json() as { job?: DbRow | null };
  return toJob(data.job ?? null);
}

async function completeJob(job: HermesJob, output_payload: Record<string, unknown>) {
  const response = await hermesFetch(
    `/api/hermes/jobs/${job.id}/complete`,
    { method: "POST", body: JSON.stringify({ locked_by: job.locked_by, output_payload }) },
    job.locked_by ?? undefined,
  );
  if (!response.ok) throw new Error(`Complete failed for ${job.id}: ${response.status}`);
}

async function failJob(job: HermesJob, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const response = await hermesFetch(
    `/api/hermes/jobs/${job.id}/fail`,
    { method: "POST", body: JSON.stringify({ locked_by: job.locked_by, error_message: message.slice(0, 1500) }) },
    job.locked_by ?? undefined,
  );
  if (!response.ok) throw new Error(`Fail failed for ${job.id}: ${response.status}`);
}

async function heartbeatJob(job: HermesJob) {
  const response = await hermesFetch(
    `/api/hermes/jobs/${job.id}/heartbeat`,
    { method: "POST", body: JSON.stringify({ locked_by: job.locked_by }) },
    job.locked_by ?? undefined,
  );
  if (!response.ok) throw new Error(`Heartbeat failed for ${job.id}: ${response.status}`);
}

async function ensureManualReviewTask(input: {
  productId?: string | null;
  pageId?: string | null;
  entityType: string;
  entityId?: string | null;
  reviewType: string;
  riskLevel: string;
  reason: string;
  supportingContext?: Record<string, unknown>;
}) {
  const { rows } = await sql`
    select id from manual_review_tasks
    where entity_type = ${input.entityType}
      and entity_id = ${input.entityId ?? null}
      and review_type = ${input.reviewType}
      and status = 'open'
    limit 1`;
  if (rows[0]) return { created: false, id: asString(rowValue(rows[0], "id")) };
  const id = randomUUID();
  await sql`
    insert into manual_review_tasks (
      id, product_id, page_id, entity_type, entity_id, review_type, risk_level,
      reason, supporting_context, status
    ) values (
      ${id}, ${input.productId ?? null}, ${input.pageId ?? null}, ${input.entityType},
      ${input.entityId ?? null}, ${input.reviewType}, ${input.riskLevel}, ${input.reason},
      ${JSON.stringify(input.supportingContext ?? {})}, 'open'
    )`;
  return { created: true, id };
}

async function fetchRedirectHealth(startUrl: string): Promise<RedirectHealth> {
  const safeStartUrl = await assertSafeOutboundUrl(startUrl);
  const redirectChain = [safeStartUrl];
  let current = safeStartUrl;
  let statusCode: number | null = null;

  try {
    for (let hop = 0; hop < 6; hop += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12_000);
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "VettedSaaSBlueprint-Hermes-LinkCheck/1.0" },
      });
      clearTimeout(timeout);
      statusCode = response.status;
      const location = response.headers.get("location");
      if (statusCode >= 300 && statusCode < 400 && location) {
        current = await assertSafeOutboundUrl(new URL(location, current).toString());
        redirectChain.push(current);
        continue;
      }
      return { ok: statusCode < 500, statusCode, finalUrl: current, redirectChain };
    }
    return { ok: false, statusCode, finalUrl: current, redirectChain, error: "redirect_hop_limit_exceeded" };
  } catch (error) {
    return { ok: false, statusCode, finalUrl: current, redirectChain, error: error instanceof Error ? error.message : String(error) };
  }
}

async function runAffiliateLinkCheck(job: HermesJob) {
  const budget = getBudgetFromPayload(job);
  if (budget.limit > 0 && budget.spent >= budget.limit) return { action: "budget_paused", budget };

  const linkId = asString(job.input_payload.affiliate_link_id) ?? asString(job.input_payload.link_id);
  const productId = asString(job.input_payload.product_id) ?? job.product_id;
  let rows: DbRow[] = [];

  if (linkId) {
    rows = (await sql`select * from affiliate_links where id = ${linkId} limit 1`).rows;
  } else if (productId) {
    rows = (await sql`select * from affiliate_links where product_id = ${productId} and status <> 'disabled' order by updated_at desc fetch first 25 rows only`).rows;
  } else {
    rows = (await sql`select * from affiliate_links where status = 'active' order by updated_at asc fetch first 25 rows only`).rows;
  }

  const checked = [];
  for (const row of rows) {
    const id = asString(rowValue(row, "id"));
    const rowProductId = asString(rowValue(row, "product_id"));
    const partnerstackUrl = asString(rowValue(row, "partnerstack_url"));
    if (!id || !partnerstackUrl) {
      checked.push({ id, action: "skipped", reason: "missing_url" });
      continue;
    }
    const health = await fetchRedirectHealth(partnerstackUrl);
    await sql`update affiliate_links set last_checked_at = now(), last_status_code = ${health.statusCode}, updated_at = now() where id = ${id}`;
    if (!health.ok) {
      await ensureManualReviewTask({
        productId: rowProductId,
        entityType: "affiliate_link",
        entityId: id,
        reviewType: "AFFILIATE_LINK_HEALTH",
        riskLevel: "MEDIUM_RISK",
        reason: "Affiliate link health check failed or reached an unsafe redirect state.",
        supportingContext: { status_code: health.statusCode, error: health.error, redirect_chain: health.redirectChain },
      });
    }
    checked.push({ id, status_code: health.statusCode, ok: health.ok, final_url: health.finalUrl, redirect_hops: health.redirectChain.length });
  }

  return { action: "affiliate_link_check_completed", checked_count: checked.length, checked };
}

async function getProduct(productId: string | null) {
  if (!productId) return null;
  const { rows } = await sql`select * from products where id = ${productId} limit 1`;
  return rows[0] ?? null;
}

async function fetchResearchMetadata(targetUrl: string) {
  const safeTargetUrl = await assertSafeOutboundUrl(targetUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const response = await fetch(safeTargetUrl, {
    method: "GET",
    redirect: "follow",
    signal: controller.signal,
    headers: { "user-agent": "VettedSaaSBlueprint-Hermes-Research/1.0" },
  });
  clearTimeout(timeout);
  const text = (await response.text()).slice(0, 40_000);
  const title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const summary = text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 750);
  return { statusCode: response.status, title, summary, hash: hashText(text || `${safeTargetUrl}:${response.status}`) };
}

async function runResearchRefreshCycle(job: HermesJob) {
  const budget = getBudgetFromPayload(job);
  if (budget.limit > 0 && budget.spent >= budget.limit) return { action: "budget_paused", budget };

  const productId = asString(job.input_payload.product_id) ?? job.product_id;
  const product = await getProduct(productId);
  const targetUrl = asString(job.input_payload.target_url) ?? asString(rowValue(product, "website_url"));
  if (!targetUrl) return { action: "research_refresh_blocked", reason: "missing_target_url" };

  const policy: ScraplingCrawlPolicy = {
    robots: job.input_payload.robots !== false,
    rate_limit_per_minute: Math.max(1, asNumber(job.input_payload.rate_limit_per_minute, 10)),
    depth: Math.max(1, asNumber(job.input_payload.depth, 1)),
    mode: job.input_payload.mode === "browser" ? "browser" : "static",
  };
  const policyResult = validateScraplingPolicy(policy);
  const crawlId = randomUUID();
  const sourceType = asString(job.input_payload.source_type) ?? "product_site";

  await sql`
    insert into scrapling_crawl_runs (
      id, job_id, product_id, target_url, source_type, fetcher_mode, robots_obey,
      rate_limit_config, crawl_depth, extraction_strategy, status
    ) values (
      ${crawlId}, ${job.id}, ${productId}, ${targetUrl}, ${sourceType}, ${policy.mode}, ${policy.robots ? 1 : 0},
      ${JSON.stringify({ rate_limit_per_minute: policy.rate_limit_per_minute })}, ${policy.depth},
      ${JSON.stringify({ mode: policy.mode, no_proxy_or_stealth_bypass: true })}, 'running'
    )`;

  if (!policyResult.valid) {
    await sql`update scrapling_crawl_runs set status = 'failed', error_message = ${policyResult.failures.join("; ")}, completed_at = now() where id = ${crawlId}`;
    return { action: "research_refresh_blocked", crawl_run_id: crawlId, failures: policyResult.failures };
  }

  const metadata = await fetchResearchMetadata(targetUrl).catch((error) => ({ statusCode: 0, title: null, summary: "", hash: hashText(String(error)) }));
  const usageAllowed = metadata.statusCode >= 200 && metadata.statusCode < 400;
  const sourceId = randomUUID();
  await sql`
    insert into research_sources (
      id, product_id, source_type, source_url, source_title, source_hash,
      usage_allowed, robots_policy, summary, confidence_score, notes
    ) values (
      ${sourceId}, ${productId}, ${sourceType}, ${targetUrl}, ${metadata.title}, ${metadata.hash},
      ${usageAllowed ? 1 : 0}, 'obeyed', ${metadata.summary || null}, ${usageAllowed ? 0.74 : 0.25},
      ${JSON.stringify({ status_code: metadata.statusCode, fetcher_mode: policy.mode, no_proxy_or_stealth_bypass: true })}
    )`;

  const claimId = randomUUID();
  await sql`
    insert into evidence_claims (
      id, product_id, page_id, source_id, claim_text, claim_type, risk_level,
      extracted_quote, source_summary, confidence_score, usage_allowed
    ) values (
      ${claimId}, ${productId}, ${job.page_id}, ${sourceId},
      ${`Source ${targetUrl} was fetched under the approved crawl policy for owner review.`},
      'source_observation', 'LOW_RISK', ${metadata.summary || null}, ${metadata.summary || null},
      ${usageAllowed ? 0.74 : 0.25}, ${usageAllowed ? 1 : 0}
    )`;

  await sql`
    update scrapling_crawl_runs
    set source_id = ${sourceId}, status = 'completed', pages_seen = 1, pages_changed = 1, completed_at = now()
    where id = ${crawlId}`;

  return {
    action: "research_refresh_completed",
    crawl_run_id: crawlId,
    source_id: sourceId,
    evidence_claim_id: claimId,
    target_url: targetUrl,
    robots_obeyed: true,
    fetcher_mode: policy.mode,
  };
}

async function getPublishReadiness(blueprintId: string, productId: string, ctaLinkId: string): Promise<PublishReadinessRequirements> {
  const { rows: destinationRows } = await sql`
    select r.owner_override, r.reviewed_by_owner
    from offer_purchase_destination_reviews r
    join offer_folders f on f.id = r.offer_folder_id
    where r.affiliate_link_id = ${ctaLinkId}
      and f.product_id = ${productId}
    order by r.created_at desc
    limit 1`;
  const latestReview = destinationRows[0] ?? null;

  const { rows: affiliateRows } = await sql`select status from affiliate_links where id = ${ctaLinkId} and product_id = ${productId} limit 1`;
  const affiliateStatus = asString(rowValue(affiliateRows[0], "status"))?.toLowerCase() ?? "";

  const { rows: complianceRows } = await sql`select status from compliance_profiles where product_id = ${productId} order by updated_at desc limit 1`;
  const complianceStatus = asString(rowValue(complianceRows[0], "status"))?.toLowerCase() ?? "";

  const { rows: programRuleRows } = await sql`
    select 1 as has_rules from partnerstack_program_rules
    where product_id = ${productId} and last_reviewed_at is not null
    limit 1`;

  const { rows: evidenceRows } = await sql`
    select risk_level, usage_allowed from evidence_claims
    where product_id = ${productId} and page_id = ${blueprintId}`;

  const { rows: manualRows } = await sql`
    select id from manual_review_tasks
    where status = 'open'
      and (
        product_id = ${productId}
        or page_id = ${blueprintId}
        or entity_id = ${blueprintId}
        or entity_id = ${ctaLinkId}
      )
    fetch first 1 rows only`;

  return {
    hasCurrentDestinationReview: Boolean(latestReview),
    ownerOverride: asBoolean(rowValue(latestReview, "owner_override")) || asBoolean(rowValue(latestReview, "reviewed_by_owner")),
    affiliateLinkActive: affiliateStatus === "active",
    complianceProfileComplete: ["approved", "reviewed", "complete", "active"].includes(complianceStatus),
    programRulesReviewed: Boolean(programRuleRows[0]),
    highRiskClaimsApproved: !evidenceRows.some((row) => isHighRiskClaimLevel(rowValue(row, "risk_level")) && !asBoolean(rowValue(row, "usage_allowed"))),
    blockingManualReviewTasksClear: manualRows.length === 0,
  };
}

async function loadBlueprintForJob(job: HermesJob) {
  const requestedBlueprintId = asString(job.input_payload.blueprint_id) ?? asString(job.input_payload.page_blueprint_id) ?? job.page_id;
  if (requestedBlueprintId) {
    const direct = await sql`select * from page_blueprints where id = ${requestedBlueprintId} limit 1`;
    if (direct.rows[0]) return direct.rows[0];
    const viaPage = await sql`
      select pb.* from dynamic_pages dp
      join page_blueprints pb on pb.id = dp.blueprint_id
      where dp.id = ${requestedBlueprintId}
      limit 1`;
    if (viaPage.rows[0]) return viaPage.rows[0];
  }
  const productId = asString(job.input_payload.product_id) ?? job.product_id;
  if (!productId) return null;
  const latest = await sql`select * from page_blueprints where product_id = ${productId} order by updated_at desc limit 1`;
  return latest.rows[0] ?? null;
}

async function runQualityComplianceScore(job: HermesJob) {
  const budget = getBudgetFromPayload(job);
  if (budget.limit > 0 && budget.spent >= budget.limit) return { action: "budget_paused", budget };

  const blueprintRow = await loadBlueprintForJob(job);
  const blueprintId = asString(rowValue(blueprintRow, "id"));
  if (!blueprintRow || !blueprintId) return { action: "quality_compliance_blocked", reason: "missing_page_blueprint" };

  const blueprint = parseStoredPageBlueprint(rowValue(blueprintRow, "structural_json"));
  const productId = blueprint.metadata.product_id;
  const ctaLinkId = blueprint.hero.primary_cta_link_id;
  const readiness = await getPublishReadiness(blueprintId, productId, ctaLinkId);
  const approved = asString(rowValue(blueprintRow, "status"))?.toLowerCase() === "approved";
  const gate = canPublishPage(blueprint, { ...readiness, approved });
  const complianceScore = gate.publishable ? 95 : Math.max(0, 100 - gate.failures.length * 12);
  const evidenceScore = Math.max(0, Math.min(100, blueprint.quality_scores.evidence_score));

  if (!gate.publishable) {
    await ensureManualReviewTask({
      productId,
      pageId: blueprintId,
      entityType: "page_blueprint",
      entityId: blueprintId,
      reviewType: "QUALITY_COMPLIANCE_SCORE",
      riskLevel: "HIGH_RISK",
      reason: gate.failures.join(" "),
      supportingContext: { readiness, approved },
    });
  }

  return {
    action: "quality_compliance_scored",
    blueprint_id: blueprintId,
    product_id: productId,
    publishable: gate.publishable,
    failures: gate.failures,
    scores: { compliance_score: complianceScore, evidence_score: evidenceScore },
  };
}

async function aggregateDailyMetrics(job: HermesJob) {
  const metricDate = utcMetricDate(job.input_payload.metric_date);
  const { start, end } = dateRangeForMetricDate(metricDate);
  const { rows } = await sql`
    select page_id, product_id, event_type, count(*) as event_count
    from conversion_events
    where created_at >= ${start}
      and created_at < ${end}
      and page_id is not null
    group by page_id, product_id, event_type`;

  const byPage = new Map<string, { productId: string | null; snapshot: TrackingSnapshot }>();
  for (const row of rows) {
    const pageId = asString(rowValue(row, "page_id"));
    if (!pageId) continue;
    const current = byPage.get(pageId) ?? {
      productId: asString(rowValue(row, "product_id")),
      snapshot: { page_views: 0, cta_clicks: 0, affiliate_clicks: 0, link_errors: 0, faq_expands: 0 },
    };
    const count = asNumber(rowValue(row, "event_count"), 0);
    switch (asString(rowValue(row, "event_type"))) {
      case "page_view":
        current.snapshot.page_views += count;
        break;
      case "cta_click":
        current.snapshot.cta_clicks += count;
        break;
      case "affiliate_click":
        current.snapshot.affiliate_clicks += count;
        break;
      case "link_error":
        current.snapshot.link_errors += count;
        break;
      case "faq_expand":
        current.snapshot.faq_expands += count;
        break;
    }
    byPage.set(pageId, current);
  }

  let metricsUpserted = 0;
  let recommendationsCreated = 0;
  for (const [pageId, item] of byPage) {
    const productLookup = item.productId
      ? null
      : await sql`select pb.product_id from dynamic_pages dp join page_blueprints pb on pb.id = dp.blueprint_id where dp.id = ${pageId} limit 1`;
    const productId = item.productId ?? asString(rowValue(productLookup?.rows[0], "product_id"));
    const metricId = randomUUID();
    await sql`
      merge into page_daily_metrics target
      using (
        select ${pageId} as page_id, ${metricDate} as metric_date_text,
          ${item.snapshot.page_views} as page_views,
          ${item.snapshot.cta_clicks} as cta_clicks,
          ${item.snapshot.affiliate_clicks} as affiliate_clicks,
          ${item.snapshot.link_errors} as link_errors,
          ${item.snapshot.faq_expands} as faq_expands
        from dual
      ) source
      on (target.page_id = source.page_id and target.metric_date = to_date(source.metric_date_text, 'YYYY-MM-DD'))
      when matched then update set
        target.page_views = source.page_views,
        target.cta_clicks = source.cta_clicks,
        target.affiliate_clicks = source.affiliate_clicks,
        target.link_errors = source.link_errors,
        target.faq_expands = source.faq_expands
      when not matched then insert (
        id, page_id, metric_date, page_views, cta_clicks, affiliate_clicks, link_errors, faq_expands
      ) values (
        ${metricId}, source.page_id, to_date(source.metric_date_text, 'YYYY-MM-DD'),
        source.page_views, source.cta_clicks, source.affiliate_clicks, source.link_errors, source.faq_expands
      )`;
    metricsUpserted += 1;

    for (const recommendation of generateDailyRecommendations(item.snapshot)) {
      const existing = await sql`
        select id from optimization_recommendations
        where page_id = ${pageId}
          and recommendation_type = ${recommendation.recommendation_type}
          and status = 'pending'
          and created_at >= ${start}
          and created_at < ${end}
        limit 1`;
      if (existing.rows[0]) continue;
      await sql`
        insert into optimization_recommendations (
          id, product_id, page_id, recommendation_type, risk_level, summary, proposed_change, status
        ) values (
          ${randomUUID()}, ${productId}, ${pageId}, ${recommendation.recommendation_type},
          ${recommendation.risk_level}, ${recommendation.summary},
          ${JSON.stringify({ ...recommendation.proposed_change, metric_date: metricDate })}, 'pending'
        )`;
      recommendationsCreated += 1;
    }
  }

  return { action: "daily_optimization_review_completed", metric_date: metricDate, pages_aggregated: byPage.size, metrics_upserted: metricsUpserted, recommendations_created: recommendationsCreated };
}

async function runGit(args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) {
  const { stdout, stderr } = await execFileAsync("git", args, { cwd, windowsHide: true, timeout: 60_000, env });
  return `${stdout}${stderr}`.trim();
}

export function getArtifactPrPlan(result: WrittenLandingArtifactsResult, env: Record<string, string | undefined> = process.env, cwd = process.cwd()) {
  if (env.LANDING_ARTIFACT_CREATE_PR !== "true") {
    return { ready: false as const, action: "artifact_pr_skipped", reason: "LANDING_ARTIFACT_CREATE_PR is not true" };
  }
  const repoDir = path.resolve(env.LANDING_ARTIFACT_REPO_DIR ?? cwd);
  const outputDir = path.resolve(result.outputDirectory);
  const relativeOutput = path.relative(repoDir, outputDir);
  if (relativeOutput.startsWith("..") || path.isAbsolute(relativeOutput)) {
    return { ready: false as const, action: "artifact_pr_skipped", reason: "artifact output directory is outside repository" };
  }
  return { ready: true as const, repoDir, outputDir, relativeOutput };
}

async function withGitHubTokenAuthEnv<T>(githubToken: string, action: (env: NodeJS.ProcessEnv) => Promise<T>) {
  const askpassPath = path.join(os.tmpdir(), `vetted-git-askpass-${randomUUID()}.sh`);
  await writeFile(askpassPath, [
    "#!/bin/sh",
    "case \"$1\" in",
    "  *Username*) printf '%s\\n' 'x-access-token' ;;",
    "  *Password*) printf '%s\\n' \"$VETTED_GITHUB_TOKEN\" ;;",
    "  *) printf '\\n' ;;",
    "esac",
    "",
  ].join("\n"));
  await chmod(askpassPath, 0o700);
  const env = {
    ...process.env,
    GIT_ASKPASS: askpassPath,
    GIT_TERMINAL_PROMPT: "0",
    VETTED_GITHUB_TOKEN: githubToken,
  };
  try {
    return await action(env);
  } finally {
    await unlink(askpassPath).catch(() => undefined);
  }
}

function sanitizeExternalError(error: unknown, secrets: Array<string | null> = []) {
  let message = error instanceof Error ? error.message : String(error);
  for (const secret of secrets) {
    if (secret) message = message.split(secret).join("[redacted]");
  }
  return message.slice(0, 1500);
}

export function parseGitHubRemote(remoteUrl: string) {
  const trimmed = remoteUrl.trim();
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (sshMatch?.[1] && sshMatch[2]) return { owner: sshMatch[1], repo: sshMatch[2].replace(/\.git$/i, "") };

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.toLowerCase() !== "github.com") return null;
    const [owner, repo] = parsed.pathname.replace(/^\/+/, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/i, "") };
  } catch {
    return null;
  }
}

async function createGitHubPullRequest(repoDir: string, branch: string, githubToken: string) {
  const remoteUrl = await runGit(["remote", "get-url", "origin"], repoDir);
  const repo = parseGitHubRemote(remoteUrl);
  if (!repo) throw new Error("origin remote is not a supported GitHub repository URL");

  const base = process.env.GITHUB_BASE_BRANCH ?? "main";
  const response = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/pulls`, {
    method: "POST",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${githubToken}`,
      "content-type": "application/json",
      "user-agent": "VettedSaaSBlueprint-Hermes-Worker",
      "x-github-api-version": "2022-11-28",
    },
    body: JSON.stringify({
      base,
      head: `${repo.owner}:${branch}`,
      title: "Update generated landing artifacts",
      body: "Hermes exported published landing-page artifacts. Merge remains owner-controlled.",
    }),
  });
  const payload = await response.json().catch(() => ({})) as { html_url?: unknown; message?: unknown };
  if (response.ok && typeof payload.html_url === "string") return payload.html_url;
  const message = typeof payload.message === "string" ? payload.message : `GitHub PR creation failed with HTTP ${response.status}`;
  throw new Error(`${message} (${response.status})`);
}

async function prepareArtifactRepositoryForWrite(outputDirectory: string) {
  const plan = getArtifactPrPlan({
    outputDirectory,
    manifestPath: path.join(outputDirectory, "index.json"),
    pageCount: 0,
    writtenAt: new Date().toISOString(),
  });
  if (!plan.ready) return { action: plan.action, reason: plan.reason };

  const githubToken = asString(process.env.GITHUB_TOKEN);
  if (!githubToken) return { action: "artifact_pr_skipped", reason: "GITHUB_TOKEN is required for artifact PR automation" };

  const baseBranch = process.env.GITHUB_BASE_BRANCH ?? "main";
  await withGitHubTokenAuthEnv(githubToken, async (authEnv) => {
    await runGit(["fetch", "origin", baseBranch], plan.repoDir, authEnv);
    await runGit(["checkout", "-B", baseBranch, `origin/${baseBranch}`], plan.repoDir);
  });
  return { action: "artifact_pr_repo_prepared", base_branch: baseBranch };
}

async function maybeCreateArtifactPullRequest(result: WrittenLandingArtifactsResult) {
  const plan = getArtifactPrPlan(result);
  if (!plan.ready) return { action: plan.action, reason: plan.reason };
  const { repoDir, relativeOutput } = plan;
  const githubToken = asString(process.env.GITHUB_TOKEN);
  if (!githubToken) return { action: "artifact_pr_skipped", reason: "GITHUB_TOKEN is required for artifact PR automation" };

  const branch = `codex/landing-artifacts-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}-${randomUUID().slice(0, 8)}`;
  await runGit(["checkout", "-B", branch], repoDir);
  await runGit(["add", relativeOutput], repoDir);
  try {
    await runGit(["diff", "--cached", "--quiet"], repoDir);
    return { action: "artifact_pr_skipped", reason: "no artifact changes", branch };
  } catch {
    await runGit(["commit", "-m", "Update generated landing artifacts"], repoDir);
  }
  await withGitHubTokenAuthEnv(githubToken, async (authEnv) => {
    await runGit(["push", "-u", "origin", branch], repoDir, authEnv);
  });

  try {
    const url = await createGitHubPullRequest(repoDir, branch, githubToken);
    return { action: "artifact_pr_created", branch, url };
  } catch (error) {
    return { action: "artifact_pr_push_completed", branch, pr_error: sanitizeExternalError(error, [githubToken]) };
  }
}

async function runLandingArtifactPublication() {
  const artifacts = await fetchPublishedLandingArtifactsFromDb();
  const outputDirectory = process.env.LANDING_ARTIFACT_OUTPUT_DIR;
  if (!outputDirectory) {
    return {
      action: "landing_artifacts_export_skipped",
      reason: "Set LANDING_ARTIFACT_OUTPUT_DIR to emit static artifact files for Vercel publish-ready commit.",
      page_count: artifacts.index.pages.length,
    };
  }
  const prPreparation = await prepareArtifactRepositoryForWrite(outputDirectory);
  const result = await writeLandingArtifactsToDirectory(artifacts, outputDirectory);
  const pr = await maybeCreateArtifactPullRequest(result);
  return { action: "landing_artifacts_exported", ...result, pr_preparation: prPreparation, pr };
}

async function runJob(job: HermesJob) {
  switch (job.job_type) {
    case "RESEARCH_REFRESH_CYCLE":
      return runResearchRefreshCycle(job);
    case "AFFILIATE_LINK_CHECK":
      return runAffiliateLinkCheck(job);
    case "QUALITY_COMPLIANCE_SCORE":
      return runQualityComplianceScore(job);
    case "DAILY_OPTIMIZATION_REVIEW":
    case "DAILY_METRICS_AGGREGATION":
    case "OPTIMIZATION_RECOMMENDATION":
      return aggregateDailyMetrics(job);
    case "LANDING_ARTIFACT_PUBLICATION":
      return runLandingArtifactPublication();
    default:
      return { action: "unsupported_job_type", job_type: job.job_type };
  }
}

async function processOneJob() {
  const job = await claimJob();
  if (!job) return { processed: 0 };

  const heartbeat = setInterval(() => {
    heartbeatJob(job).catch((error) => console.error(JSON.stringify({ event: "heartbeat_failed", job_id: job.id, error: error instanceof Error ? error.message : String(error) })));
  }, 60_000);

  try {
    const output = await runJob(job);
    await completeJob(job, output as Record<string, unknown>);
    return { processed: 1, job_id: job.id, job_type: job.job_type, output };
  } catch (error) {
    await failJob(job, error);
    return { processed: 1, job_id: job.id, job_type: job.job_type, failed: true, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearInterval(heartbeat);
  }
}

async function runHealth(checkDb: boolean): Promise<{ ok: boolean; [key: string]: unknown }> {
  const oracleReady = Boolean(
    (process.env.ORACLE_WALLET_LOCATION || process.env.TNS_ADMIN) &&
    (process.env.ORACLE_CONNECTION_STRING || process.env.DATABASE_URL || process.env.ORACLE_SERVICE_ALIAS) &&
    (process.env.ORACLE_DB_USER || process.env.ORACLE_APP_USER) &&
    (process.env.ORACLE_DB_PASSWORD || process.env.ORACLE_APP_PASSWORD)
  );
  const health: { ok: boolean; [key: string]: unknown } = {
    ok: Boolean(token && apiBase && oracleReady),
    worker_id: workerId,
    env: {
      hermes_api_token_present: Boolean(token),
      site_url_present: Boolean(apiBase),
      oracle_ready: oracleReady,
      artifact_output_dir_present: Boolean(process.env.LANDING_ARTIFACT_OUTPUT_DIR),
      artifact_pr_enabled: process.env.LANDING_ARTIFACT_CREATE_PR === "true",
      github_token_present: Boolean(process.env.GITHUB_TOKEN),
      artifact_repo_dir_present: Boolean(process.env.LANDING_ARTIFACT_REPO_DIR),
    },
  };
  if (checkDb) {
    try {
      const { rows } = await sql`select 1 as ok from dual`;
      health.db = { ok: asNumber(rowValue(rows[0], "ok"), 0) === 1 };
    } catch (error) {
      health.ok = false;
      health.db = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  return health;
}

function getArgValue(name: string, fallback: string | null = null) {
  const prefix = `${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

async function main() {
  const mode = process.argv[2] ?? "daemon";
  if (mode === "health") {
    const result = await runHealth(process.argv.includes("--db"));
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }

  if (mode === "once") {
    const maxJobs = Math.max(1, asNumber(getArgValue("--max-jobs", process.env.HERMES_ONCE_MAX_JOBS ?? "1"), 1));
    const results = [];
    for (let index = 0; index < maxJobs; index += 1) {
      const result = await processOneJob();
      results.push(result);
      if (result.processed === 0) break;
    }
    console.log(JSON.stringify({ mode, results }, null, 2));
    await closePool();
    return;
  }

  if (mode !== "daemon") throw new Error(`Unsupported Hermes worker mode: ${mode}`);
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; });
  process.on("SIGTERM", () => { stopping = true; });

  console.log(JSON.stringify({ event: "worker_started", mode, worker_id: workerId }));
  while (!stopping) {
    const result = await processOneJob();
    if (result.processed === 0) await sleep(asNumber(process.env.HERMES_IDLE_SLEEP_MS, 30_000));
  }
  console.log(JSON.stringify({ event: "worker_stopped", worker_id: workerId }));
  await closePool();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(JSON.stringify({ event: "worker_fatal", error: error instanceof Error ? error.message : String(error) }));
    process.exit(1);
  });
}
