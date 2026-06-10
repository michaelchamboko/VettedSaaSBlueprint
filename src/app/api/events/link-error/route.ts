import { recordEvent } from "@/lib/tracking/events";
export async function POST(request: Request) { return Response.json({ event: await recordEvent(request, "link_error") }, { status: 201 }); }
