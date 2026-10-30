import { availableParallelism } from "node:os";
import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const testDirectory = resolve("tests");
const testFiles = (await readdir(testDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
  .map((entry) => resolve(testDirectory, entry.name))
  .sort();

if (testFiles.length === 0) {
  throw new Error(`No active tests found in ${testDirectory}.`);
}

// Node defaults test-file concurrency to every available core. On a four-core host that
// oversubscribes the two Playwright-backed suites, whose tests carry a hard 20 s timeout,
// so the release gate fails on contention rather than behaviour. Two workers keep a
// browser launch and a file walk from competing for the same core.
const concurrency = Math.max(1, Math.min(2, availableParallelism() - 1));

const result = spawnSync(
  process.execPath,
  ["--test", `--test-concurrency=${concurrency}`, "--import", "tsx", ...testFiles],
  { stdio: "inherit" },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
