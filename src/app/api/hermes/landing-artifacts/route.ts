import { jsonError, requireHermesAuth } from "@/lib/hermes/auth";
import { fetchPublishedLandingArtifactsFromDb } from "@/lib/publication/landing-artifacts";

export async function GET(request: Request) {
  if (!requireHermesAuth(request)) return jsonError("Unauthorized", 401);

  try {
    const payload = await fetchPublishedLandingArtifactsFromDb();
    return Response.json(payload);
  } catch {
    return jsonError("Failed to collect landing artifacts", 500);
  }
}
