import { sql } from "@/lib/db";
import { recordEvent } from "@/lib/tracking/events";
import { resolveAffiliateRedirect } from "@/lib/tracking/affiliate-redirect";

export async function POST(request: Request) {
  return Response.json({ event: await recordEvent(request, "affiliate_click") }, { status: 201 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const linkId = url.searchParams.get("linkId");
  if (!linkId) return Response.json({ error: "linkId required" }, { status: 400 });

  await recordEvent(request, "affiliate_click");
  const { rows } = await sql`select partnerstack_url from affiliate_links where id = ${linkId} and status = 'active' limit 1`;
  const rawAffiliateUrl = rows.length > 0 && rows[0] ? rows[0].partnerstack_url : null;
  const partnerstackUrl = typeof rawAffiliateUrl === "string" ? rawAffiliateUrl : null;
  const redirectUrl = resolveAffiliateRedirect(partnerstackUrl, url.origin);
  return Response.redirect(redirectUrl, rows[0] ? 302 : 302);
}
