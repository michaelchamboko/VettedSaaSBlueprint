import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { productSchema } from "@/lib/schemas/contracts";

function parseList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toJsonArray(values: string[]) {
  return JSON.stringify(values);
}

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from products order by created_at desc limit 100`;
  return Response.json({ products: rows });
}

export async function POST(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const input = productSchema.parse({
    name: String(form.get("name") ?? ""),
    slug: String(form.get("slug") ?? ""),
    website_url: String(form.get("website_url") ?? "") || null,
    partnerstack_id: String(form.get("partnerstack_id") ?? "") || null,
    description: String(form.get("description") ?? "") || null,
    primary_audience: String(form.get("primary_audience") ?? "") || null,
    pricing_summary: String(form.get("pricing_summary") ?? "") || null,
    commission_summary: String(form.get("commission_summary") ?? "") || null,
    target_countries: parseList(form.get("target_countries")),
    competitor_products: parseList(form.get("competitor_products")),
    seed_keywords: parseList(form.get("seed_keywords")),
    status: String(form.get("status") ?? "draft"),
    research_priority: Number(form.get("research_priority") ?? 50),
    auto_low_risk_updates_enabled: form.get("auto_low_risk_updates_enabled") === "on",
  });
  const { rows } = await sql`insert into products (name, slug, website_url, partnerstack_id, description, primary_audience, pricing_summary, commission_summary, target_countries, competitor_products, seed_keywords, status, research_priority, auto_low_risk_updates_enabled) values (${input.name}, ${input.slug}, ${input.website_url ?? null}, ${input.partnerstack_id ?? null}, ${input.description ?? null}, ${input.primary_audience ?? null}, ${input.pricing_summary ?? null}, ${input.commission_summary ?? null}, ${toJsonArray(input.target_countries)}, ${toJsonArray(input.competitor_products)}, ${toJsonArray(input.seed_keywords)}, ${input.status}, ${input.research_priority}, ${input.auto_low_risk_updates_enabled}) returning *`;
  await sql`insert into manual_review_tasks (product_id, entity_type, entity_id, review_type, risk_level, reason) values (${rows[0].id}, 'product', ${rows[0].id}, 'COMPLIANCE_PROFILE_REQUIRED', 'MEDIUM_RISK', 'Product cannot publish until program rules and compliance profile are reviewed.')`;
  auditAdminAction("create_product", { product_id: rows[0].id });
  return Response.json({ product: rows[0] }, { status: 201 });
}
