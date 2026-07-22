import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { sql } from "@/lib/db";
import { partnerstackProgramRuleSchema } from "@/lib/schemas/contracts";

function dbBoolean(value: boolean | null | undefined) {
  return value == null ? null : value ? 1 : 0;
}

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from partnerstack_program_rules order by updated_at desc fetch first 100 rows only`;
  return Response.json({ program_rules: rows });
}

export async function POST(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const input = partnerstackProgramRuleSchema.parse(await request.json());
  const reviewedAt = input.reviewed ? new Date() : null;
  const { rows } = await sql`
    insert into partnerstack_program_rules (
      product_id,
      partnership_key,
      program_name,
      paid_ads_allowed,
      brand_bidding_allowed,
      coupon_language_allowed,
      custom_links_enabled,
      deep_links_enabled,
      approved_destinations,
      required_disclosure,
      resource_usage_notes,
      self_referral_allowed,
      raw_terms_source_id,
      last_reviewed_at
    ) values (
      ${input.product_id ?? null},
      ${input.partnership_key ?? null},
      ${input.program_name},
      ${dbBoolean(input.paid_ads_allowed)},
      ${dbBoolean(input.brand_bidding_allowed)},
      ${dbBoolean(input.coupon_language_allowed)},
      ${dbBoolean(input.custom_links_enabled)},
      ${dbBoolean(input.deep_links_enabled)},
      ${JSON.stringify(input.approved_destinations)},
      ${input.required_disclosure ?? null},
      ${input.resource_usage_notes ?? null},
      ${dbBoolean(input.self_referral_allowed)},
      ${input.raw_terms_source_id ?? null},
      ${reviewedAt}
    ) returning *
  `;
  auditAdminAction("create_program_rules", {
    program_rules_id: rows[0].id,
    product_id: input.product_id ?? null,
    reviewed: input.reviewed,
  });
  return Response.json({ program_rules: rows[0] }, { status: 201 });
}
