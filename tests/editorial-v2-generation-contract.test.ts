import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("affiliate URL intake uses the resumable landing coordinator without a Hermes draft job", () => {
  const packageJson = JSON.parse(
    readFileSync(path.resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const source = readFileSync(
    path.resolve(process.cwd(), "scripts/landing-run.ts"),
    "utf8",
  );

  assert.equal(packageJson.scripts?.["landing:run"], "tsx scripts/landing-run.ts");
  assert.match(source, /ensureAuthorizedExactUrl/);
  assert.match(source, /loadOrCreateLandingRun/);
  assert.match(source, /advanceLandingRun/);
  assert.match(source, /https:\/\/try\.elevenlabs\.io\/izj2b165mcsj/);
  assert.match(source, /elevenlabs-ai-voice-generator/);
  assert.doesNotMatch(source, /enqueuePageDraftJob|PAGE_DRAFT_GENERATION/);
});
