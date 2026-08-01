import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseApprovedUrls } from "../src/lib/landing-automation/approved-urls";
import { createNeonPool, NeonResearchControl } from "../src/lib/landing-research/neon";

async function main(): Promise<void> {
  const exactUrl = process.argv.includes("--url") ? process.argv[process.argv.indexOf("--url") + 1] : undefined;
  if (exactUrl) {
    const manifest = parseApprovedUrls(await readFile(resolve(process.cwd(), "approved-urls.md"), "utf8"));
    if (!manifest.entries.some((entry) => entry.exactUrl === exactUrl)) throw new Error("The exact URL is not present in approved-urls.md.");
  }
  const pool = createNeonPool(process.env.LANDING_CONTROL_DATABASE_URL, "LANDING_CONTROL_DATABASE_URL");
  const control = new NeonResearchControl(pool);
  try {
    process.stdout.write(`${JSON.stringify(await control.status(exactUrl))}\n`);
  } finally {
    await control.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown research status error.";
  process.stderr.write(`landing research status blocked: ${message}\n`);
  process.exitCode = 1;
});
