import { buildOracleAffiliateRedirectUrl, buildOracleEventIngestUrl, buildOracleTrackingPayload } from "@/lib/tracking/oracle-public-endpoints";
import { loadPublicSiteConfig } from "@/lib/site/public-site";
import { publicTrackingAllowed } from "@/lib/tracking/privacy";

export const runtime = "nodejs";
export const maxDuration = 30;

function buildFallback(request: Request, linkId: string) {
  const fallback = new URL("/affiliate-link-unavailable", request.url);
  fallback.searchParams.set("linkId", linkId);
  return fallback;
}

async function sendAffiliateTracking(base: string, linkId: string) {
  try {
    const eventPayload = buildOracleTrackingPayload(
      {
        event_type: "affiliate_click",
        link_id: linkId,
      },
      "affiliate_click",
    );
    const response = await fetch(buildOracleEventIngestUrl(base), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(eventPayload),
      keepalive: true,
    });
    return response.ok || response.status === 202 || response.status === 201;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const linkId = requestUrl.searchParams.get("linkId");
  if (!linkId) return Response.json({ error: "linkId required" }, { status: 400 });

  const base = process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL?.trim();
  try {
    if (base) {
      const redirectTarget = new URL(buildOracleAffiliateRedirectUrl(linkId, base));
      if (publicTrackingAllowed(request, loadPublicSiteConfig())) {
        await sendAffiliateTracking(base, linkId);
      }
      return Response.redirect(redirectTarget, 302);
    }

    return Response.redirect(buildFallback(request, linkId), 302);
  } catch {
    const fallback = buildFallback(request, linkId);
    return Response.redirect(fallback, 302);
  }
}
