import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { canPublishPage, nextPageStatus } from "@/lib/pages/workflow";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";
import { isCompliantProfileStatus, isHighRiskClaimLevel, type PublishReadinessRequirements } from "@/lib/compliance/gate";

function toBoolean(value: unknown) {
  return value === 1 || value === true || value === "1" || value === "true";
}

function parseEntityRows(rows: Record<string, unknown>[]) {
  return rows[0] ?? null;
}

async function getPublishReadiness(blueprintId: string, productId: string, ctaLinkId: string): Promise<PublishReadinessRequirements> {
  const { rows: destinationRows } = await sql`
    select
      r.owner_override,
      r.reviewed_by_owner
    from offer_purchase_destination_reviews r
    join offer_folders f on f.id = r.offer_folder_id
    where r.affiliate_link_id = ${ctaLinkId}
      and f.product_id = ${productId}
    order by r.created_at desc
    limit 1`
  ;

  const latestReview = parseEntityRows(destinationRows);
  const hasCurrentDestinationReview = Boolean(latestReview);
  const ownerOverride = toBoolean(latestReview?.owner_override) || toBoolean(latestReview?.reviewed_by_owner);

  const { rows: affiliateRows } = await sql`select status from affiliate_links where id = ${ctaLinkId} and product_id = ${productId} limit 1`;
  const affiliateRow = parseEntityRows(affiliateRows);
  const affiliateStatus = typeof affiliateRow?.status === "string" ? String(affiliateRow.status).toLowerCase() : "";
  const affiliateLinkActive = affiliateStatus === "active";

  const { rows: complianceRows } = await sql`
    select status
    from compliance_profiles
    where product_id = ${productId}
    order by updated_at desc
    limit 1
  `;
  const complianceRow = parseEntityRows(complianceRows);
  const complianceProfileComplete = isCompliantProfileStatus(complianceRow?.status);

  const { rows: programRuleRows } = await sql`
    select 1 as has_rules
    from partnerstack_program_rules
    where product_id = ${productId}
      and last_reviewed_at is not null
    limit 1
  `;
  const programRulesReviewed = Boolean(programRuleRows[0]?.has_rules);

  const { rows: evidenceRows } = await sql`
    select risk_level, usage_allowed
    from evidence_claims
    where product_id = ${productId}
      and page_id = ${blueprintId}
  `;
  const highRiskClaimsApproved = !evidenceRows.some((row) => isHighRiskClaimLevel(row.risk_level) && !toBoolean(row.usage_allowed));

  return {
    hasCurrentDestinationReview,
    ownerOverride,
    affiliateLinkActive,
    complianceProfileComplete,
    programRulesReviewed,
    highRiskClaimsApproved,
  };
}

async function getBlueprintAndStatus(id: string) {
  const { rows } = await sql`select * from page_blueprints where id = ${id} limit 1`;
  return rows[0] ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const action = String(body.action ?? "");
  const blueprint = await getBlueprintAndStatus(id);
  if (!blueprint) return Response.json({ error: "Not found" }, { status: 404 });

  if (action === "approve") {
    const { rows } = await sql`update page_blueprints set status = ${nextPageStatus("approve")} where id = ${id} returning *`;
    auditAdminAction("approve_page_blueprint", { blueprint_id: id });
    return Response.json({ page_blueprint: rows[0] });
  }

  if (action === "publish") {
    const parsed = pageBlueprintSchema.parse(blueprint.structural_json);
    const productId = typeof parsed.metadata?.product_id === "string" ? parsed.metadata.product_id : "";
    const ctaLinkId = typeof parsed.hero?.primary_cta_link_id === "string" ? parsed.hero.primary_cta_link_id : "";
    const readiness = await getPublishReadiness(String(blueprint.id), productId, ctaLinkId);
    const page = await sql`select dp.id, dp.path, dp.status from dynamic_pages dp where dp.blueprint_id = ${id} limit 1`;
    const approved = blueprint.status === "approved";
    const gate = canPublishPage(parsed, { ...readiness, approved });
    if (!gate.publishable) return Response.json({ error: gate.failures.join(" ") }, { status: 409 });
    const dynamicPageId = page.rows[0]?.id;
    if (dynamicPageId) {
      const { rows } = await sql`update dynamic_pages set status = ${nextPageStatus("publish")}, published_at = now(), updated_at = now() where id = ${dynamicPageId} returning *`;
      auditAdminAction("publish_page", { blueprint_id: id, page_id: dynamicPageId });
      return Response.json({ dynamic_page: rows[0] });
    }
    const { rows } = await sql`insert into dynamic_pages (blueprint_id, path, status, robots, revalidate_seconds, published_at) values (${id}, ${`/landing-page-builders/${parsed.metadata.url_slug}`}, 'published', 'index,follow', 10800, now()) returning *`;
    auditAdminAction("publish_page", { blueprint_id: id, page_id: rows[0].id });
    return Response.json({ dynamic_page: rows[0] }, { status: 201 });
  }

  if (action === "pause" || action === "noindex") {
    const status = nextPageStatus(action);
    const { rows } = await sql`update page_blueprints set status = ${status} where id = ${id} returning *`;
    auditAdminAction(`page_${action}`, { blueprint_id: id });
    return Response.json({ page_blueprint: rows[0] });
  }

  return Response.json({ error: "Unsupported action" }, { status: 400 });
}
