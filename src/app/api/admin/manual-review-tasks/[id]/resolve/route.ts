import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const resolutionNote = typeof body?.resolution_note === "string" ? body.resolution_note.trim() : "";
  if (!resolutionNote) return Response.json({ error: "resolution_note is required" }, { status: 400 });

  const existing = await sql`select supporting_context from manual_review_tasks where id = ${id}`;
  if (!existing.rows[0]) return Response.json({ error: "Not found" }, { status: 404 });
  const rawContext = existing.rows[0].supporting_context;
  const supportingContext = typeof rawContext === "string" ? JSON.parse(rawContext || "{}") : (rawContext ?? {});

  const { rows } = await sql`
    update manual_review_tasks
    set status = 'resolved',
        resolved_by = 'owner',
        resolved_at = current_timestamp,
        supporting_context = ${JSON.stringify({ ...supportingContext, resolution_note: resolutionNote })}
    where id = ${id}
    returning *
  `;
  auditAdminAction("resolve_manual_review_task", { task_id: id });
  return Response.json({ manual_review_task: rows[0] });
}
