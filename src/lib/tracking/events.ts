import { sql } from "@/lib/db";
import { createHash } from "crypto";

function minimizePayload(raw: Record<string, unknown>) {
  const payload: Record<string, unknown> = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (value === undefined) return;
    payload[key] = value;
  });
  return payload;
}

export function hashIp(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export async function recordEvent(request: Request, eventType: string) {
  const bodyRaw = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const url = new URL(request.url);
  const body = typeof bodyRaw === "object" && bodyRaw ? bodyRaw as Record<string, unknown> : {};

  const eventPayload = minimizePayload({
    event_type: eventType,
    source: body.source,
    referrer: body.referrer,
    clicked_section: body.clicked_section,
    faq_index: body.faq_index,
    error_code: body.error_code,
    campaign: url.searchParams.get("campaign") ?? body.campaign,
    page_type: body.page_type,
    linkId: url.searchParams.get("linkId") ?? body.linkId,
    variant: body.variant,
  });

  const pageId = typeof body.page_id === "string" ? body.page_id : typeof body.page_id === "number" ? String(body.page_id) : null;
  const productId = typeof body.product_id === "string" ? body.product_id : typeof body.product_id === "number" ? String(body.product_id) : null;
  const rawAffiliateLinkId = body.affiliate_link_id ?? url.searchParams.get("linkId") ?? body.linkId;
  const affiliateLinkId = typeof rawAffiliateLinkId === "string" ? rawAffiliateLinkId : null;

  const { rows } = await sql`
    insert into conversion_events
      (page_id, product_id, affiliate_link_id, event_type, event_payload, user_agent, referrer, ip_hash)
    values
      (${pageId}, ${productId}, ${affiliateLinkId}, ${eventType}, ${eventPayload}, ${request.headers.get("user-agent")}, ${request.headers.get("referer")}, ${hashIp(request.headers.get("x-forwarded-for"))})
    returning id
  `;
  return rows[0];
}
