import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { rows } = await sql`update optimization_recommendations set status = 'approved' where id = ${id} returning *`;
  if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
  auditAdminAction("approve_optimization_recommendation", { recommendation_id: id });
  return Response.json({ optimization_recommendation: rows[0] });
}
