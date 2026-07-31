import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { inspectLandingResearchPreflight } from "../src/lib/landing-automation/research-preflight";

async function main(): Promise<void> {
  const markdown = await readFile(resolve(process.cwd(), "approved-urls.md"), "utf8");
  const result = inspectLandingResearchPreflight(markdown, process.env);

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status === "blocked") process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown research preflight error.";
  process.stderr.write(`landing research preflight failed: ${message}\n`);
  process.exitCode = 1;
});
