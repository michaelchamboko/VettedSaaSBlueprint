import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the documented landing command does not overstate V001 research authority", async () => {
  const [command, workflow] = await Promise.all([
    readFile(new URL("../scripts/landing-run.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/landing-workflow/README.md", import.meta.url), "utf8"),
  ]);

  assert.match(command, /"research_complete"/);
  assert.match(workflow, /Today, `landing:run` dispatches only\s+the V001 research path/);
  assert.match(workflow, /V001 ends at `RESEARCH_COMPLETE`/);
  assert.match(workflow, /It does not create a page, PR, deployment, or\s+release receipt/);
  assert.match(workflow, /RESEARCH_READY/);
  assert.match(workflow, /LP002/);
  assert.doesNotMatch(workflow, /stores a durable `LandingRunV1` record in Neon Postgres/);
  assert.doesNotMatch(workflow, /`landing:run`[^.]*ends only at a verified production page/);
});
