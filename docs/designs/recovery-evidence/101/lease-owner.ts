import { writeFile } from "node:fs/promises";
import { claimWorkflowLease } from "../../../../src/lib/article-import/workflow-lease";

async function main() {
  const [root, importId, readyPath, exitPath] = process.argv.slice(2);
  if (!root || !importId || !readyPath || !exitPath) throw new Error("lease-owner arguments required");

  const lease = await claimWorkflowLease(root, "import", importId);
  if (!lease) throw new Error("lease owner could not claim fixture lease");
  await writeFile(readyPath, lease.ownerToken);
  while (true) {
    try {
      await import("node:fs/promises").then(({ access }) => access(exitPath));
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

// Deliberately exit without release to exercise verified recovery after owner exit.
main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
