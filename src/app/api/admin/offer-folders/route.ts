import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { ownerSessionOrUnauthorized } from "@/lib/auth/owner-session-response";
import { offerFolderSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  const unauthorized = await ownerSessionOrUnauthorized(request);
  if (unauthorized) return unauthorized;
  const { rows } = await sql`select * from offer_folders order by created_at desc limit 100`;
  return Response.json({ offer_folders: rows });
}

export async function POST(request: Request) {
  const unauthorized = await ownerSessionOrUnauthorized(request);
  if (unauthorized) return unauthorized;
  const form = await request.formData();
  const input = offerFolderSchema.parse({
    product_id: String(form.get("product_id") ?? ""),
    affiliate_link_id: String(form.get("affiliate_link_id") ?? ""),
    name: String(form.get("name") ?? ""),
    status: String(form.get("status") ?? "active"),
  });
  const { rows } = await sql`insert into offer_folders (product_id, affiliate_link_id, name, status) values (${input.product_id}, ${input.affiliate_link_id}, ${input.name}, ${input.status}) returning *`;
  auditAdminAction("create_offer_folder", { offer_folder_id: rows[0].id, product_id: input.product_id, affiliate_link_id: input.affiliate_link_id });
  return Response.json({ offer_folder: rows[0] }, { status: 201 });
}
