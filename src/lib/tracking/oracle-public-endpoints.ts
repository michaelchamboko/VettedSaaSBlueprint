export const ORACLE_PUBLIC_EVENT_PATH = "/ingest/events";
export const ORACLE_PUBLIC_AFFILIATE_PATH = "/r/affiliate";

export const ALLOWED_ORACLE_EVENT_TYPES = [
  "page_view",
  "cta_click",
  "faq_expand",
  "link_error",
  "affiliate_click",
] as const;

export type OracleEventType = (typeof ALLOWED_ORACLE_EVENT_TYPES)[number];

function getOraclePublicBase(rawBase?: string) {
  const baseCandidate = (rawBase ?? process.env.NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL ?? "").trim();
  if (!baseCandidate) return null;
  const parsed = new URL(baseCandidate);
  if (parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_ORACLE_PUBLIC_BASE_URL must be https.");
  }
  parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed;
}

export function buildOracleEventIngestUrl(rawBase?: string) {
  const baseUrl = getOraclePublicBase(rawBase);
  if (!baseUrl) return ORACLE_PUBLIC_EVENT_PATH;
  const root = `${baseUrl.origin}${baseUrl.pathname}`;
  return `${root.replace(/\/$/, "")}${ORACLE_PUBLIC_EVENT_PATH}`;
}

function isSafeEventType(eventType: string): eventType is "page_view" | "cta_click" | "faq_expand" | "link_error" | "affiliate_click" {
  return ALLOWED_ORACLE_EVENT_TYPES.includes(eventType as OracleEventType);
}

export function normalizeEventType(eventType: unknown): OracleEventType | null {
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

export function buildOracleTrackingPayload(rawPayload: Record<string, unknown>, eventType: OracleEventType | string) {
  const safeEventType = normalizeEventType(eventType) ?? "page_view";
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) return { event_type: eventType };
  const sanitizedPayload = sanitizeTrackingPayload(rawPayload);
  return {
    ...sanitizedPayload,
    event_type: normalizeEventType(rawPayload.event_type) ? (rawPayload.event_type as OracleEventType) : safeEventType,
  };
}

export function buildOracleAffiliateRedirectUrl(linkId: string, base?: string) {
  const url = getOraclePublicBase(base);
  if (!url) return `${ORACLE_PUBLIC_AFFILIATE_PATH}?${new URLSearchParams({ linkId }).toString()}`;
  const root = `${url.origin}${url.pathname}`.replace(/\/$/, "");
  const redirectUrl = new URL(`${root}${ORACLE_PUBLIC_AFFILIATE_PATH}`, url.origin);
  redirectUrl.searchParams.set("linkId", linkId);
  return redirectUrl.toString();
}
