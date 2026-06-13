import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { researchSourceSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from research_sources order by created_at desc limit 100`;
  return Response.json({ research_sources: rows });
}

export async function POST(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = researchSourceSchema.parse(await request.json());
  const { rows } = await sql`insert into research_sources (product_id, source_type, source_url, source_title, source_hash, usage_allowed, robots_policy, summary, confidence_score, notes) values (${input.product_id ?? null}, ${input.source_type}, ${input.source_url}, ${input.source_title ?? null}, ${input.source_hash ?? null}, ${input.usage_allowed}, ${input.robots_policy ?? null}, ${input.summary ?? null}, ${input.confidence_score ?? null}, ${input.notes ?? null}) returning *`;
  auditAdminAction("create_research_source", { research_source_id: rows[0].id, product_id: input.product_id ?? null });
  return Response.json({ research_source: rows[0] }, { status: 201 });
}
