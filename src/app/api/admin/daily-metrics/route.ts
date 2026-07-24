import { sql } from "@/lib/db";
import { requireOwnerSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from page_daily_metrics order by metric_date desc limit 100`;
  return Response.json({ page_daily_metrics: rows });
}
