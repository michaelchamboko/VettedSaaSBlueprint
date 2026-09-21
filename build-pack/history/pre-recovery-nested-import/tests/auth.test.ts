import assert from "node:assert/strict";
import test from "node:test";

process.env.STORAGE_SESSION_SECRET = "test-secret";
process.env.STORAGE_APP_PASSWORD = "$2a$12$C6UzMDM.H6dfI/f/IKcEeO8JYjR4n8Qy2zHqV5C4D1f4p5Qv5uF7K";

let session: typeof import("../src/lib/auth/session");
let password: typeof import("../src/lib/auth/password");

async function loadModules() {
  if (!session) session = await import("../src/lib/auth/session");
  if (!password) password = await import("../src/lib/auth/password");
}

test("creates and parses an owner session token", async () => {
  await loadModules();
  const token = await session.createSessionToken("owner");
  const parsed = await session.parseSessionToken(token);
  assert.ok(parsed);
  assert.equal(parsed?.username, "owner");
});

test("rejects incorrect owner password", async () => {
  await loadModules();
  const ok = await password.verifyOwnerPassword("wrong-password");
  assert.equal(ok, false);
});

test("login rate limiter blocks after repeated attempts", () => {
  if (!session) {
    throw new Error("Session module failed to load.");
  }
  const id = "127.0.0.1:owner";
  let allowed = true;
  for (let index = 0; index < 6; index += 1) {
    allowed = session.registerLoginAttempt(id);
  }
  assert.equal(allowed, false);
});
