import { handlePublicEventPost } from "@/lib/tracking/public-event-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handlePublicEventPost(request, "cta_click");
}
