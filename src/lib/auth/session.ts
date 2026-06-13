import crypto from "crypto";
import { cookies } from "next/headers";
import { LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS, OWNER_USERNAME, SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./config";

type SessionRecord = { username: string; expiresAt: number };

const sessions = new Map<string, SessionRecord>();
const attempts = new Map<string, number[]>();

function getSessionSecret() {
  return process.env.ORACLE_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createSessionToken(username: string) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Missing session secret");
  const payload = JSON.stringify({ username, expiresAt: Date.now() + SESSION_TTL_MS });
  const payloadPart = encodeBase64Url(payload);
  const signature = crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
  return `${payloadPart}.${signature}`;
}

export function parseSessionToken(token: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  let parsed: SessionRecord;
  try {
    parsed = JSON.parse(decodeBase64Url(payloadPart)) as SessionRecord;
  } catch {
    return null;
  }
  if (parsed.username !== OWNER_USERNAME) return null;
  if (Date.now() > parsed.expiresAt) return null;
  return parsed;
}

export function issueSession(username: string) {
  const token = createSessionToken(username);
  sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function revokeSession(token: string) {
  sessions.delete(token);
}

export function readSessionTokenFromRequest(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function getCurrentSession(request?: Request) {
  const token = request ? readSessionTokenFromRequest(request) : cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
  if (!token) return null;
  const record = sessions.get(token);
  if (record && record.expiresAt > Date.now()) return { token, ...record };
  const parsed = parseSessionToken(token);
  if (!parsed) return null;
  sessions.set(token, parsed);
  return { token, ...parsed };
}

export function requireOwnerSession(request: Request) {
  return Boolean(getCurrentSession(request));
}

export function isOwnerAuthenticated(request: Request) {
  return requireOwnerSession(request);
}

export function setSessionCookie(response: Response, token: string) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}; Secure`
  );
}

export function clearSessionCookie(response: Response) {
  response.headers.append("Set-Cookie", `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Secure`);
}

export function registerLoginAttempt(identifier: string) {
  const now = Date.now();
  const recent = (attempts.get(identifier) ?? []).filter((timestamp) => now - timestamp < LOGIN_RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  attempts.set(identifier, recent);
  return recent.length <= LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
}
