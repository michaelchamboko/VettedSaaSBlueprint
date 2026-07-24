import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseApprovedUrls } from "../src/lib/landing-automation/approved-urls";

async function main(): Promise<void> {
  const manifestPath = resolve(process.cwd(), "approved-urls.md");
  const markdown = await readFile(manifestPath, "utf8");
  const manifest = parseApprovedUrls(markdown);

  process.stdout.write(
    `${JSON.stringify({ digest: manifest.digest, entries: manifest.entries.length }, null, 2)}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown allowlist validation error.";
  process.stderr.write(`approved-urls validation failed: ${message}\n`);
  process.exitCode = 1;
});
