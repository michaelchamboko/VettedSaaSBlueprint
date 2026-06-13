import { auditAdminAction } from "@/lib/auth/audit";
import { clearSessionCookie, getCurrentSession, revokeSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getCurrentSession(request);
  if (session) revokeSession(session.token);
  const response = Response.redirect(new URL("/admin/login", request.url), 303);
  clearSessionCookie(response);
  auditAdminAction("logout", {});
  return response;
}
