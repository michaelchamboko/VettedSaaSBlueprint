import { sql } from "@/lib/db";
import { recordEvent } from "@/lib/tracking/events";
export async function POST(request: Request) { return Response.json({ event: await recordEvent(request, "affiliate_click") }, { status: 201 }); }
export async function GET(request: Request) { const url = new URL(request.url); const linkId = url.searchParams.get("linkId"); if (!linkId) return Response.json({ error: "linkId required" }, { status: 400 }); await recordEvent(request, "affiliate_click"); const { rows } = await sql`select partnerstack_url from affiliate_links where id = ${linkId} and status = 'active' limit 1`; if (!rows[0]) return Response.redirect(new URL("/affiliate-link-unavailable", url.origin)); return Response.redirect(rows[0].partnerstack_url, 302); }
