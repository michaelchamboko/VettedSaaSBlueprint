import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { affiliateLinkSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  if (!requireOwnerSession(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from affiliate_links order by created_at desc limit 100`;
  return Response.json({ affiliate_links: rows });
}

export async function POST(request: Request) {
  if (!requireOwnerSession(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = affiliateLinkSchema.parse(await request.json());
  const { rows } = await sql`insert into affiliate_links (product_id, partnerstack_url, destination_url, link_type, geo_target, page_angle, utm_source, utm_medium, utm_campaign, subid_template, status) values (${input.product_id}, ${input.partnerstack_url}, ${input.destination_url ?? null}, ${input.link_type}, ${input.geo_target ?? null}, ${input.page_angle ?? null}, ${input.utm_source ?? null}, ${input.utm_medium ?? null}, ${input.utm_campaign ?? null}, ${input.subid_template ?? null}, ${input.status}) returning *`;
  auditAdminAction("create_affiliate_link", { affiliate_link_id: rows[0].id });
  return Response.json({ affiliate_link: rows[0] }, { status: 201 });
}
