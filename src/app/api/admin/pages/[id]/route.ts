import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { canPublishPage, nextPageStatus } from "@/lib/pages/workflow";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";

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
    const page = await sql`select dp.id, dp.path, dp.status from dynamic_pages dp where dp.blueprint_id = ${id} limit 1`;
    const hasCurrentDestinationReview = Boolean(body.hasCurrentDestinationReview);
    const ownerOverride = Boolean(body.ownerOverride);
    const affiliateLinkActive = Boolean(body.affiliateLinkActive ?? true);
    const approved = blueprint.status === "approved";
    const gate = canPublishPage(parsed, { hasCurrentDestinationReview, ownerOverride, affiliateLinkActive, approved });
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
