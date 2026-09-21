import { buildPublicTrackingPayload, normalizeEventType, buildPublicEventIngestUrl } from "@/lib/tracking/public-tracking-endpoints";
import { loadPublicSiteConfig } from "@/lib/site/public-site";
import { publicTrackingAllowed } from "@/lib/tracking/privacy";

export const runtime = "nodejs";
export const maxDuration = 30;

async function forwardEvent(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  });
  return response.status >= 200 && response.status < 400;
}

export async function POST(request: Request) {
  if (!publicTrackingAllowed(request, loadPublicSiteConfig())) {
    return Response.json({ status: "suppressed" }, { status: 202 });
  }
  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const eventType = normalizeEventType(raw?.event_type);
  if (!eventType) {
    return Response.json({ error: "invalid or missing event_type" }, { status: 400 });
  }

  const payload = buildPublicTrackingPayload(raw, eventType ?? "page_view");
  const base = process.env.NEXT_PUBLIC_TRACKING_BASE_URL;

  if (base) {
    try {
      const target = buildPublicEventIngestUrl(base);
      const forwarded = await forwardEvent(target, payload);
      if (forwarded) return Response.json({ event: payload }, { status: 201 });
    } catch {
      // keep behavior stable if tracking ingest is temporarily unavailable
    }
  }

  return Response.json({ event: payload, status: "deferred" }, { status: 202 });
}
