import { buildPublicTrackingPayload, type PublicEventType } from "@/lib/tracking/public-tracking-endpoints";
import { loadPublicSiteConfig } from "@/lib/site/public-site";
import { publicTrackingAllowed } from "@/lib/tracking/privacy";

export async function handlePublicEventPost(request: Request, eventType: PublicEventType) {
  if (!publicTrackingAllowed(request, loadPublicSiteConfig())) {
    return Response.json({ status: "suppressed" }, { status: 202 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const payload = buildPublicTrackingPayload(body, eventType);

  try {
    const forwardUrl = new URL("/ingest/events", request.url);
    const response = await fetch(forwardUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (response.ok || response.status === 201 || response.status === 202) {
      return Response.json({ event: await response.json().catch(() => payload) }, { status: 201 });
    }
  } catch {}

  return Response.json({ event: payload }, { status: 202 });
}
