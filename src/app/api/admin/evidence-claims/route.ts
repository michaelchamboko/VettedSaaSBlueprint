import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { evidenceClaimSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from evidence_claims order by created_at desc limit 100`;
  return Response.json({ evidence_claims: rows });
}

export async function POST(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = evidenceClaimSchema.parse(await request.json());
  const { rows } = await sql`insert into evidence_claims (product_id, page_id, source_id, claim_text, claim_type, risk_level, extracted_quote, source_summary, confidence_score, usage_allowed) values (${input.product_id ?? null}, ${input.page_id ?? null}, ${input.source_id ?? null}, ${input.claim_text}, ${input.claim_type}, ${input.risk_level}, ${input.extracted_quote ?? null}, ${input.source_summary ?? null}, ${input.confidence_score}, ${input.usage_allowed}) returning *`;
  auditAdminAction("create_evidence_claim", { evidence_claim_id: rows[0].id, product_id: input.product_id ?? null, source_id: input.source_id ?? null });
  return Response.json({ evidence_claim: rows[0] }, { status: 201 });
}
