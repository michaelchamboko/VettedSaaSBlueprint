export const PUBLIC_EVENT_PATH = "/ingest/events";
export const PUBLIC_AFFILIATE_PATH = "/r/affiliate";

export const ALLOWED_EVENT_TYPES = [
  "page_view",
  "cta_click",
  "faq_expand",
  "link_error",
  "affiliate_click",
] as const;

export type PublicEventType = (typeof ALLOWED_EVENT_TYPES)[number];

function getPublicTrackingBase(rawBase?: string) {
  const baseCandidate = (rawBase ?? process.env.NEXT_PUBLIC_TRACKING_BASE_URL ?? "").trim();
  if (!baseCandidate) return null;
  const parsed = new URL(baseCandidate);
  if (parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_TRACKING_BASE_URL must be https.");
  }
  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed;
}

export function buildPublicEventIngestUrl(rawBase?: string) {
  const baseUrl = getPublicTrackingBase(rawBase);
  if (!baseUrl) return PUBLIC_EVENT_PATH;
  const root = `${baseUrl.origin}${baseUrl.pathname}`;
  return `${root.replace(/\/$/, "")}${PUBLIC_EVENT_PATH}`;
}

function isSafeEventType(eventType: string): eventType is "page_view" | "cta_click" | "faq_expand" | "link_error" | "affiliate_click" {
  return ALLOWED_EVENT_TYPES.includes(eventType as PublicEventType);
}

export function normalizeEventType(eventType: unknown): PublicEventType | null {
  if (typeof eventType !== "string") return null;
  return isSafeEventType(eventType) ? eventType : null;
}

const minimalTrackingKeys: ReadonlySet<string> = new Set([
  "event_type",
  "page_type",
  "page_slug",
  "referrer",
  "page_url",
  "user_agent",
  "campaign",
  "link_id",
  "linkId",
  "variant",
  "clicked_section",
  "faq_index",
  "error_code",
  "source",
  "page_id",
  "product_id",
]);

function sanitizeTrackingPayload(rawPayload: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  Object.entries(rawPayload).forEach(([key, value]) => {
    if (minimalTrackingKeys.has(key) && value !== undefined) output[key] = value;
  });
  return output;
}

export function buildPublicTrackingPayload(rawPayload: Record<string, unknown>, eventType: PublicEventType | string) {
  const safeEventType = normalizeEventType(eventType) ?? "page_view";
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return { event_type: eventType };
  const sanitizedPayload = sanitizeTrackingPayload(rawPayload);
  return {
    ...sanitizedPayload,
    event_type: normalizeEventType(rawPayload.event_type) ? (rawPayload.event_type as PublicEventType) : safeEventType,
  };
}

export function buildPublicAffiliateRedirectUrl(linkId: string, base?: string) {
  const url = getPublicTrackingBase(base);
  if (!url) return `${PUBLIC_AFFILIATE_PATH}?${new URLSearchParams({ linkId }).toString()}`;
  const root = `${url.origin}${url.pathname}`.replace(/\/$/, "");
  const redirectUrl = new URL(`${root}${PUBLIC_AFFILIATE_PATH}`, url.origin);
  redirectUrl.searchParams.set("linkId", linkId);
  return redirectUrl.toString();
}
