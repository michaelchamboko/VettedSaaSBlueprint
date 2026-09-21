import { buildPublicAffiliateRedirectUrl } from "@/lib/tracking/public-tracking-endpoints";
import { handlePublicEventPost } from "@/lib/tracking/public-event-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handlePublicEventPost(request, "affiliate_click");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const linkId = url.searchParams.get("linkId");
  if (!linkId) return Response.json({ error: "linkId required" }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_TRACKING_BASE_URL?.trim();
  let redirect = `${url.origin}/r/affiliate?${new URLSearchParams({ linkId }).toString()}`;
  if (base) {
    try {
      redirect = buildPublicAffiliateRedirectUrl(linkId, base);
    } catch {
      redirect = `${url.origin}/r/affiliate?${new URLSearchParams({ linkId }).toString()}`;
    }
  }
  return Response.redirect(redirect, 302);
}
