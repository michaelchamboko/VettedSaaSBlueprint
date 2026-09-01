import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";

const allowedStatuses = new Set(["active", "manual_review", "disabled"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = typeof body?.status === "string" ? body.status.trim().toLowerCase() : "";
  if (!allowedStatuses.has(status)) return Response.json({ error: "Unsupported affiliate-link status" }, { status: 400 });

  const { rows } = await sql`
    update affiliate_links
    set status = ${status}, updated_at = current_timestamp
    where id = ${id}
    returning *
  `;
  if (!rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
  auditAdminAction("update_affiliate_link_status", { affiliate_link_id: id, status });
  return Response.json({ affiliate_link: rows[0] });
}
