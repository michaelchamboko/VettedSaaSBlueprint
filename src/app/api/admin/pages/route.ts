import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { pageBlueprintSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from page_blueprints order by updated_at desc limit 100`;
  return Response.json({ page_blueprints: rows });
}

export async function POST(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const blueprint = pageBlueprintSchema.parse(await request.json());
  const { rows } = await sql`insert into page_blueprints (product_id, page_type, url_slug, status, structural_json) values (${blueprint.metadata.product_id}, ${blueprint.metadata.page_type}, ${blueprint.metadata.url_slug}, 'draft', ${blueprint}) returning *`;
  auditAdminAction("create_page_blueprint", { blueprint_id: rows[0].id, product_id: blueprint.metadata.product_id });
  return Response.json({ page_blueprint: rows[0] }, { status: 201 });
}
