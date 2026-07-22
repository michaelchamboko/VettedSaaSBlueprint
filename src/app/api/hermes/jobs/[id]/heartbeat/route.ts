import { sql } from "@/lib/db";
import { jsonError, requireHermesAuth } from "@/lib/hermes/auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireHermesAuth(request)) return jsonError("Unauthorized", 401);
  const { id } = await params;
  const { rows } = await sql`update generation_jobs set locked_at = now() where id = ${id} and status = 'running' returning id, locked_at`;
  if (!rows[0]) return jsonError("Job not found or not running", 404);
  return Response.json({ job: rows[0] });
}
