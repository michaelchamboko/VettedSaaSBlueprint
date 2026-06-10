import { sql } from "@vercel/postgres";
import { productSchema } from "@/lib/schemas/contracts";

export async function GET() {
  const { rows } = await sql`select * from products order by created_at desc limit 100`;
  return Response.json({ products: rows });
}

export async function POST(request: Request) {
  const input = productSchema.parse(await request.json());
  const { rows } = await sql`insert into products (name, slug, website_url, partnerstack_id, description, primary_audience, pricing_summary, commission_summary, target_countries, competitor_products, seed_keywords, status, research_priority, auto_low_risk_updates_enabled) values (${input.name}, ${input.slug}, ${input.website_url ?? null}, ${input.partnerstack_id ?? null}, ${input.description ?? null}, ${input.primary_audience ?? null}, ${input.pricing_summary ?? null}, ${input.commission_summary ?? null}, ${input.target_countries}, ${input.competitor_products}, ${input.seed_keywords}, ${input.status}, ${input.research_priority}, ${input.auto_low_risk_updates_enabled}) returning *`;
  await sql`insert into manual_review_tasks (product_id, entity_type, entity_id, review_type, risk_level, reason) values (${rows[0].id}, 'product', ${rows[0].id}, 'COMPLIANCE_PROFILE_REQUIRED', 'MEDIUM_RISK', 'Product cannot publish until program rules and compliance profile are reviewed.')`;
  return Response.json({ product: rows[0] }, { status: 201 });
}
