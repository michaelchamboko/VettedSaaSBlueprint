import { recordEvent } from "@/lib/tracking/events";
export async function POST(request: Request) { return Response.json({ event: await recordEvent(request, "cta_click") }, { status: 201 }); }
