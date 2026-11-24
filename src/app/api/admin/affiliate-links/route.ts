import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { ownerSessionOrUnauthorized } from "@/lib/auth/owner-session-response";
import { affiliateLinkSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  const unauthorized = await ownerSessionOrUnauthorized(request);
  if (unauthorized) return unauthorized;
  const { rows } = await sql`select * from affiliate_links order by created_at desc limit 100`;
  return Response.json({ affiliate_links: rows });
}

export async function POST(request: Request) {
  const unauthorized = await ownerSessionOrUnauthorized(request);
  if (unauthorized) return unauthorized;
  const form = await request.formData();
  const input = affiliateLinkSchema.parse({
    product_id: String(form.get("product_id") ?? ""),
    partnerstack_url: String(form.get("partnerstack_url") ?? ""),
    destination_url: String(form.get("destination_url") ?? "") || null,
    link_type: String(form.get("link_type") ?? ""),
    geo_target: String(form.get("geo_target") ?? "") || null,
    page_angle: String(form.get("page_angle") ?? "") || null,
    utm_source: String(form.get("utm_source") ?? "") || null,
    utm_medium: String(form.get("utm_medium") ?? "") || null,
    utm_campaign: String(form.get("utm_campaign") ?? "") || null,
    subid_template: String(form.get("subid_template") ?? "") || null,
    status: String(form.get("status") ?? "draft"),
  });
  const { rows } = await sql`insert into affiliate_links (product_id, partnerstack_url, destination_url, link_type, geo_target, page_angle, utm_source, utm_medium, utm_campaign, subid_template, status) values (${input.product_id}, ${input.partnerstack_url}, ${input.destination_url ?? null}, ${input.link_type}, ${input.geo_target ?? null}, ${input.page_angle ?? null}, ${input.utm_source ?? null}, ${input.utm_medium ?? null}, ${input.utm_campaign ?? null}, ${input.subid_template ?? null}, ${input.status}) returning *`;
  auditAdminAction("create_affiliate_link", { affiliate_link_id: rows[0].id });
  return Response.json({ affiliate_link: rows[0] }, { status: 201 });
}
