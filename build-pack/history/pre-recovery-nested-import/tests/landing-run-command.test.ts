import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runLandingCommand } from "../scripts/landing-run";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";

test("landing:run fails closed when the Neon control authority is absent", async () => {
  await assert.rejects(
    () => runLandingCommand(["--url", affiliateUrl]),
    /LANDING_CONTROL_DATABASE_URL is missing/,
  );
});

test("landing:run rejects local event-file advancement", async () => {
  await assert.rejects(
    () => runLandingCommand(["--url", affiliateUrl, "--event-file", "event.json"]),
    /Local event files cannot advance/,
  );
});

test("package exposes durable research and landing commands", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.equal(packageJson.scripts?.["landing:run"], "tsx scripts/landing-run.ts");
  assert.equal(packageJson.scripts?.["landing:research:prep"], "tsx scripts/landing-research-prep.ts");
  assert.equal(packageJson.scripts?.["landing:research:status"], "tsx scripts/landing-research-status.ts");
});
