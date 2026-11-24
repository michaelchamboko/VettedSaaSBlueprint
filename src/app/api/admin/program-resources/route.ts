import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { ownerSessionOrUnauthorized } from "@/lib/auth/owner-session-response";
import { partnerstackProgramResourceSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  const unauthorized = await ownerSessionOrUnauthorized(request);
  if (unauthorized) return unauthorized;
  const { rows } = await sql`select * from partnerstack_program_resources order by created_at desc limit 100`;
  return Response.json({ program_resources: rows });
}

export async function POST(request: Request) {
  const unauthorized = await ownerSessionOrUnauthorized(request);
  if (unauthorized) return unauthorized;
  const form = await request.formData();
  const input = partnerstackProgramResourceSchema.parse({
    offer_folder_id: String(form.get("offer_folder_id") ?? ""),
    resource_type: String(form.get("resource_type") ?? "note"),
    title: String(form.get("title") ?? ""),
    source_url: String(form.get("source_url") ?? "") || null,
    storage_url: String(form.get("storage_url") ?? "") || null,
    notes: String(form.get("notes") ?? "") || null,
    analysis_status: String(form.get("analysis_status") ?? "pending"),
    owner_review_status: String(form.get("owner_review_status") ?? "pending"),
  });
  const { rows } = await sql`insert into partnerstack_program_resources (offer_folder_id, resource_type, title, source_url, storage_url, notes, analysis_status, owner_review_status) values (${input.offer_folder_id}, ${input.resource_type}, ${input.title}, ${input.source_url ?? null}, ${input.storage_url ?? null}, ${input.notes ?? null}, ${input.analysis_status}, ${input.owner_review_status}) returning *`;
  auditAdminAction("create_program_resource", { program_resource_id: rows[0].id, offer_folder_id: input.offer_folder_id, resource_type: input.resource_type });
  return Response.json({ program_resource: rows[0] }, { status: 201 });
}
