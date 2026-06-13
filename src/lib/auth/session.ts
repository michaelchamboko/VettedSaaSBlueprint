import { LOGIN_RATE_LIMIT_MAX_ATTEMPTS, LOGIN_RATE_LIMIT_WINDOW_MS, OWNER_USERNAME, SESSION_COOKIE_NAME, SESSION_TTL_MS } from "./config";

type SessionRecord = { username: string; expiresAt: number };

const sessions = new Map<string, SessionRecord>();
const attempts = new Map<string, number[]>();

function getSessionSecret() {
  return process.env.ORACLE_SESSION_SECRET ?? process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET;
}

function encodeUtf8(value: string) {
  return new TextEncoder().encode(value);
}

function decodeUtf8(value: Uint8Array) {
  return new TextDecoder().decode(value);
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

async function sign(payloadPart: string) {
  const secret = getSessionSecret();
  if (!secret) throw new Error("Missing session secret");
  const key = await crypto.subtle.importKey("raw", encodeUtf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encodeUtf8(payloadPart));
  return Buffer.from(signature).toString("base64url");
}

async function verify(payloadPart: string, signature: string) {
  const expected = await sign(payloadPart);
  if (expected.length !== signature.length) return false;
  return crypto.subtle.verify(
    "HMAC",
    await crypto.subtle.importKey("raw", encodeUtf8(getSessionSecret() ?? ""), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]),
    Uint8Array.from(Buffer.from(signature, "base64url")),
    encodeUtf8(payloadPart)
  );
}

export async function createSessionToken(username: string) {
  const payload = JSON.stringify({ username, expiresAt: Date.now() + SESSION_TTL_MS });
  const payloadPart = encodeBase64Url(payload);
  const signature = await sign(payloadPart);
  return `${payloadPart}.${signature}`;
}

export async function parseSessionToken(token: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;
  if (!(await verify(payloadPart, signature))) return null;
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

export async function issueSession(username: string) {
  const token = await createSessionToken(username);
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

export async function getCurrentSession(request: Request) {
  const token = readSessionTokenFromRequest(request);
  if (!token) return null;
  const record = sessions.get(token);
  if (record && record.expiresAt > Date.now()) return { token, ...record };
  const parsed = await parseSessionToken(token);
  if (!parsed) return null;
  sessions.set(token, parsed);
  return { token, ...parsed };
}

export async function requireOwnerSession(request: Request) {
  return Boolean(await getCurrentSession(request));
}

export async function isOwnerAuthenticated(request: Request) {
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
