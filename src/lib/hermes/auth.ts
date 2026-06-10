export function requireHermesAuth(request: Request) {
  const expected = process.env.HERMES_API_TOKEN;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || header !== expected) return false;
  return true;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
