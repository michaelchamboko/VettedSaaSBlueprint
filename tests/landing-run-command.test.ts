import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runLandingCommand } from "../scripts/landing-run";

const affiliateUrl = "https://try.elevenlabs.io/izj2b165mcsj";

test("landing:run accepts only the URL and emits one resumable next action", async () => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "landing-command-"));
  try {
    await writeFile(
      path.join(repositoryRoot, "approved-urls.md"),
      "# Approved affiliate URLs\n\n",
      "utf8",
    );
    const output: string[] = [];
    const result = await runLandingCommand(
      ["--url", affiliateUrl, "--repository-root", repositoryRoot],
      {
        write: (value) => output.push(value),
        now: () => "2026-07-24T10:00:00.000Z",
      },
    );

    assert.equal(output.length, 1);
    assert.equal(result.state, "WORKING");
    assert.equal(result.stage, "research");
    assert.equal(result.page_slug, "elevenlabs-ai-voice-generator");
    assert.equal(result.next_action.kind, "verify_destination_and_research");

    const allowlist = await readFile(
      path.join(repositoryRoot, "approved-urls.md"),
      "utf8",
    );
    assert.match(allowlist, /https:\/\/try\.elevenlabs\.io\/izj2b165mcsj/);

    const resumedOutput: string[] = [];
    const resumed = await runLandingCommand(
      ["--url", affiliateUrl, "--repository-root", repositoryRoot],
      {
        write: (value) => resumedOutput.push(value),
        now: () => "2026-07-24T11:00:00.000Z",
      },
    );
    assert.equal(resumed.created, false);
    assert.equal(resumed.run_id, result.run_id);
    assert.equal(resumedOutput.length, 1);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});

test("package exposes the canonical landing:run command", async () => {
  const packageJson = JSON.parse(
    await readFile(path.resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  assert.equal(packageJson.scripts?.["landing:run"], "tsx scripts/landing-run.ts");
});
