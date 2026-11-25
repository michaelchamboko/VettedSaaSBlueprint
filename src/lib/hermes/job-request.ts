import { jsonError, requireHermesAuth } from "@/lib/hermes/auth";

export async function prepareHermesJobRequest(
  request: Request,
  params: Promise<{ id: string }>,
): Promise<
  | { ok: true; id: string; body: Record<string, unknown> }
  | { ok: false; response: Response }
> {
  if (!requireHermesAuth(request)) {
    return { ok: false, response: jsonError("Unauthorized", 401) };
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: true, id, body };
}