import { sql } from "@/lib/db";
import { jsonError, requireHermesAuth } from "@/lib/hermes/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireHermesAuth(request)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { rows } = await sql`update generation_jobs set status = 'completed', output_payload = ${body.output_payload ?? {}}, completed_at = now(), locked_by = null, locked_at = null where id = ${id} returning *`;
  if (!rows[0]) return jsonError("Job not found", 404);
  return Response.json({ job: rows[0] });
}
