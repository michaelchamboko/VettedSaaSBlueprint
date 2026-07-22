import { buildOracleAffiliateRedirectUrl } from "@/lib/tracking/oracle-public-endpoints";
import { handleOraclePublicEventPost } from "@/lib/tracking/oracle-public-event-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleOraclePublicEventPost(request, "affiliate_click");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const linkId = url.searchParams.get("linkId");
  if (!linkId) return Response.json({ error: "linkId required" }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL?.trim();
  let redirect = `${url.origin}/r/affiliate?${new URLSearchParams({ linkId }).toString()}`;
  if (base) {
    try {
      redirect = buildOracleAffiliateRedirectUrl(linkId, base);
    } catch {
      redirect = `${url.origin}/r/affiliate?${new URLSearchParams({ linkId }).toString()}`;
    }
  }
  return Response.redirect(redirect, 302);
}
