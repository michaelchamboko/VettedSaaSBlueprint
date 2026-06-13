import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";

const allowedJobTypes = new Set(["RESEARCH_REFRESH_CYCLE","PRODUCT_DEEP_RESEARCH","SOURCE_REFRESH","PAIN_POINT_DISCOVERY","COMPETITOR_SCAN","PRICING_REFRESH","AFFILIATE_LINK_CHECK","PAGE_DRAFT_GENERATION","QUALITY_COMPLIANCE_SCORE","DAILY_OPTIMIZATION_REVIEW","LOW_RISK_AUTO_UPDATE"]);

export async function GET(request: Request) {
  if (!requireOwnerSession(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from generation_jobs order by priority desc, created_at asc limit 100`;
  return Response.json({ generation_jobs: rows });
}

export async function POST(request: Request) {
  if (!requireOwnerSession(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!allowedJobTypes.has(body.job_type)) return Response.json({ error: "Unsupported job_type" }, { status: 400 });
  const { rows } = await sql`insert into generation_jobs (product_id, page_id, job_type, priority, input_payload) values (${body.product_id ?? null}, ${body.page_id ?? null}, ${body.job_type}, ${body.priority ?? 50}, ${body.input_payload ?? {}}) returning *`;
  auditAdminAction("create_generation_job", { generation_job_id: rows[0].id, job_type: body.job_type });
  return Response.json({ generation_job: rows[0] }, { status: 201 });
}
