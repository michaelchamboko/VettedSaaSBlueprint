import { auditAdminAction } from "@/lib/auth/audit";
import { OWNER_USERNAME } from "@/lib/auth/config";
import { issueSession, registerLoginAttempt, setSessionCookie } from "@/lib/auth/session";
import { verifyOwnerPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const nextPath = String(form.get("next") ?? "/admin");
  const identifier = `${request.headers.get("x-forwarded-for") ?? "unknown"}:${username}`;
  if (!registerLoginAttempt(identifier)) return Response.json({ error: "Too many attempts" }, { status: 429 });
  if (username !== OWNER_USERNAME) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await verifyOwnerPassword(password))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const token = issueSession(username);
  const response = Response.redirect(new URL(nextPath, request.url), 303);
  setSessionCookie(response, token);
  auditAdminAction("login", { username });
  return response;
}
