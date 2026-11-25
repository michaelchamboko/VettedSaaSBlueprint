import { requireOwnerSession } from "@/lib/auth/session";

export async function ownerSessionOrUnauthorized(request: Request): Promise<Response | null> {
  if (await requireOwnerSession(request)) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}