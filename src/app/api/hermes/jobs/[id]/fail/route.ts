import { sql } from "@/lib/db";
import { jsonError } from "@/lib/hermes/auth";
import { prepareHermesJobRequest } from "@/lib/hermes/job-request";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const prepared = await prepareHermesJobRequest(request, params);
  if (!prepared.ok) return prepared.response;
  const { id, body } = prepared;
  const { rows } = await sql`update generation_jobs set status = case when retry_count >= 3 then 'failed' else 'queued' end, error_message = ${body.error_message ?? "Hermes job failed"}, retry_count = retry_count + 1, locked_by = null, locked_at = null where id = ${id} returning *`;
  if (!rows[0]) return jsonError("Job not found", 404);
  return Response.json({ job: rows[0] });
}
