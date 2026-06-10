import { sql } from "@vercel/postgres";

const allowedJobTypes = new Set(["RESEARCH_REFRESH_CYCLE","PRODUCT_DEEP_RESEARCH","SOURCE_REFRESH","PAIN_POINT_DISCOVERY","COMPETITOR_SCAN","PRICING_REFRESH","AFFILIATE_LINK_CHECK","PAGE_DRAFT_GENERATION","QUALITY_COMPLIANCE_SCORE","DAILY_OPTIMIZATION_REVIEW","LOW_RISK_AUTO_UPDATE"]);

export async function GET() {
  const { rows } = await sql`select * from generation_jobs order by priority desc, created_at asc limit 100`;
  return Response.json({ generation_jobs: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!allowedJobTypes.has(body.job_type)) return Response.json({ error: "Unsupported job_type" }, { status: 400 });
  const { rows } = await sql`insert into generation_jobs (product_id, page_id, job_type, priority, input_payload) values (${body.product_id ?? null}, ${body.page_id ?? null}, ${body.job_type}, ${body.priority ?? 50}, ${body.input_payload ?? {}}) returning *`;
  return Response.json({ generation_job: rows[0] }, { status: 201 });
}
