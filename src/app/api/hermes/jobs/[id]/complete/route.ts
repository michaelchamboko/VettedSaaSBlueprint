import { sql } from "@/lib/db";
import { jsonError } from "@/lib/hermes/auth";
import { prepareHermesJobRequest } from "@/lib/hermes/job-request";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await prepareHermesJobRequest(request, params);
  if (!result.ok) return result.response;
  const { id, body } = result;
  const { rows } = await sql`update generation_jobs set status = 'completed', output_payload = ${body.output_payload ?? {}}, completed_at = now(), locked_by = null, locked_at = null where id = ${id} returning *`;
  if (!rows[0]) return jsonError("Job not found", 404);
  return Response.json({ job: rows[0] });
}
