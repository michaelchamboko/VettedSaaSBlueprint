import { recordEvent } from "@/lib/tracking/events";
export async function POST(request: Request) { return Response.json({ event: await recordEvent(request, "page_view") }, { status: 201 }); }
