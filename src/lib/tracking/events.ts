import { sql } from "@/lib/db";
import { createHash } from "crypto";

export function hashIp(value: string | null) {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex");
}

export async function recordEvent(request: Request, eventType: string) {
  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const url = new URL(request.url);
  const payload = { ...body, search: Object.fromEntries(url.searchParams.entries()) };
  const { rows } = await sql`insert into conversion_events (page_id, product_id, affiliate_link_id, event_type, event_payload, user_agent, referrer, ip_hash) values (${body.page_id ?? null}, ${body.product_id ?? null}, ${body.affiliate_link_id ?? url.searchParams.get("linkId") ?? null}, ${eventType}, ${payload}, ${request.headers.get("user-agent")}, ${request.headers.get("referer")}, ${hashIp(request.headers.get("x-forwarded-for"))}) returning id`;
  return rows[0];
}
