import { handleOraclePublicEventPost } from "@/lib/tracking/oracle-public-event-handler";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  return handleOraclePublicEventPost(request, "link_error");
}
