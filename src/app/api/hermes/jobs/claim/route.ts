import { sql } from "@/lib/db";
import { jsonError, requireHermesAuth } from "@/lib/hermes/auth";

export async function POST(request: Request) {
  if (!requireHermesAuth(request)) return jsonError("Unauthorized", 401);
  const workerId = request.headers.get("x-hermes-worker") ?? "hermes-oracle-worker";
  const { rows } = await sql`
    with next_job as (
      select id from generation_jobs
      where status = 'queued' or (status = 'running' and locked_at < now() - interval '15 minutes')
      order by priority desc, created_at asc
      for update skip locked
      limit 1
    )
    update generation_jobs
    set status = 'running', locked_by = ${workerId}, locked_at = now(), started_at = coalesce(started_at, now())
    where id in (select id from next_job)
    returning *`;
  return Response.json({ job: rows[0] ?? null });
}
