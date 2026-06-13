import { sql } from "@/lib/db";
import { auditAdminAction } from "@/lib/auth/audit";
import { requireOwnerSession } from "@/lib/auth/session";
import { offerPurchaseDestinationReviewSchema } from "@/lib/schemas/contracts";

function parseList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { rows } = await sql`select * from offer_purchase_destination_reviews order by created_at desc limit 100`;
  return Response.json({ purchase_destination_reviews: rows });
}

export async function POST(request: Request) {
  if (!(await requireOwnerSession(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const input = offerPurchaseDestinationReviewSchema.parse({
    offer_folder_id: String(form.get("offer_folder_id") ?? ""),
    affiliate_link_id: String(form.get("affiliate_link_id") ?? ""),
    affiliate_url_checked: String(form.get("affiliate_url_checked") ?? ""),
    final_visible_destination_url: String(form.get("final_visible_destination_url") ?? "") || null,
    redirect_chain: parseList(form.get("redirect_chain")),
    message_match_notes: String(form.get("message_match_notes") ?? "") || null,
    cta_language: String(form.get("cta_language") ?? "") || null,
    offer_promise: String(form.get("offer_promise") ?? "") || null,
    pricing_trial_guarantee_claims: String(form.get("pricing_trial_guarantee_claims") ?? "") || null,
    trust_cues: String(form.get("trust_cues") ?? "") || null,
    friction_notes: String(form.get("friction_notes") ?? "") || null,
    visual_affinity_profile: String(form.get("visual_affinity_profile") ?? "") || null,
    compliance_warnings: String(form.get("compliance_warnings") ?? "") || null,
    conversion_continuity_score: Number(form.get("conversion_continuity_score") ?? 0),
    reviewed_by_owner: form.get("reviewed_by_owner") === "on",
    owner_override: form.get("owner_override") === "on",
  });
  const { rows } = await sql`
    insert into offer_purchase_destination_reviews (
      offer_folder_id,
      affiliate_link_id,
      affiliate_url_checked,
      final_visible_destination_url,
      redirect_chain,
      message_match_notes,
      cta_language,
      offer_promise,
      pricing_trial_guarantee_claims,
      trust_cues,
      friction_notes,
      visual_affinity_profile,
      compliance_warnings,
      conversion_continuity_score,
      reviewed_by_owner,
      owner_override
    ) values (
      ${input.offer_folder_id},
      ${input.affiliate_link_id},
      ${input.affiliate_url_checked},
      ${input.final_visible_destination_url ?? null},
      ${JSON.stringify(input.redirect_chain)},
      ${input.message_match_notes ?? null},
      ${input.cta_language ?? null},
      ${input.offer_promise ?? null},
      ${input.pricing_trial_guarantee_claims ?? null},
      ${input.trust_cues ?? null},
      ${input.friction_notes ?? null},
      ${input.visual_affinity_profile ?? null},
      ${input.compliance_warnings ?? null},
      ${input.conversion_continuity_score},
      ${input.reviewed_by_owner ? 1 : 0},
      ${input.owner_override ? 1 : 0}
    ) returning *
  `;
  auditAdminAction("create_purchase_destination_review", { review_id: rows[0].id, offer_folder_id: input.offer_folder_id, affiliate_link_id: input.affiliate_link_id });
  return Response.json({ purchase_destination_review: rows[0] }, { status: 201 });
}
