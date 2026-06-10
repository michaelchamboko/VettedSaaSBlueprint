import { recordEvent } from "@/lib/tracking/events";
export async function POST(request: Request) { return Response.json({ event: await recordEvent(request, "faq_expand") }, { status: 201 }); }
