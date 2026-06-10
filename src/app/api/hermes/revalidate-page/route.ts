import { revalidatePath } from "next/cache";
import { jsonError, requireHermesAuth } from "@/lib/hermes/auth";

export async function POST(request: Request) {
  if (!requireHermesAuth(request)) return jsonError("Unauthorized", 401);
  const body = await request.json();
  if (!body.path || typeof body.path !== "string") return jsonError("path is required");
  revalidatePath(body.path);
  return Response.json({ revalidated: body.path });
}
