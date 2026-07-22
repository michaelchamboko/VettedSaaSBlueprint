import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { complianceProfileSchema } from "@/lib/schemas/contracts";

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from compliance_profiles order by updated_at desc fetch first 100 rows only`;
  return Response.json({ compliance_profiles: rows });
}

export async function POST(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = complianceProfileSchema.parse(await request.json());
  const status = input.reviewed && input.status === "incomplete" ? "reviewed" : input.status;
  const reviewedAt = input.reviewed ? new Date() : null;
  const { rows } = await sql`
    insert into compliance_profiles (
      product_id,
      scope,
      required_disclosure,
      allowed_channels,
      disallowed_channels,
      link_rules,
      claim_rules,
      privacy_rules,
      source_usage_rules,
      status,
      last_reviewed_at
    ) values (
      ${input.product_id ?? null},
      ${input.scope},
      ${input.required_disclosure ?? null},
      ${JSON.stringify(input.allowed_channels)},
      ${JSON.stringify(input.disallowed_channels)},
      ${JSON.stringify(input.link_rules)},
      ${JSON.stringify(input.claim_rules)},
      ${JSON.stringify(input.privacy_rules)},
      ${JSON.stringify(input.source_usage_rules)},
      ${status},
      ${reviewedAt}
    ) returning *
  `;
  auditAdminAction("create_compliance_profile", {
    compliance_profile_id: rows[0].id,
    product_id: input.product_id ?? null,
    status,
    reviewed: input.reviewed,
  });
  return Response.json({ compliance_profile: rows[0] }, { status: 201 });
}
