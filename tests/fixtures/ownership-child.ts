// Hold the first durable record read inside the real command, after lease acquisition.
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";

const [root, id, command, mode] = process.argv.slice(2);
async function main() {
  const file = path.join(root, ".automation", "article-imports", id + ".json");
  if (mode === "hold") {
    const original = fs.readFile;
    const originalReaddir = fs.readdir;
    let held = false;
    fs.readFile = (async (...args: Parameters<typeof fs.readFile>) => {
      if (held || path.resolve(String(args[0])) !== file) return original(...args);
      const leaseDirectory = path.join(root, ".automation", "article-imports", "leases", "import", id);
      const claims = await originalReaddir(leaseDirectory).catch(() => []);
      const generation = Math.max(0, ...claims.filter(name => /^\d+\.json$/.test(name)).map(name => Number(name.slice(0, -5))));
      const claim = generation ? JSON.parse(await original(path.join(leaseDirectory, `${generation}.json`), "utf8")) : undefined;
      if (claim?.pid === process.pid && !claim.released) {
        held = true;
        const released = new Promise<void>(resolve => process.once("message", () => resolve()));
        process.send?.("owned");
        await released;
      }
      return original(...args);
    }) as typeof fs.readFile;
    syncBuiltinESMExports();
  }
  const { openCodeVersion } = JSON.parse(await fs.readFile(path.join(root, "config/article-workflow-capabilities.json"), "utf8"));
  const probe = async (tool: string) => tool === "opencode" ? openCodeVersion : "Python 3.13.0";
  if (command === "resume") {
    const { executeImportCommand } = await import("../../scripts/import-article");
    return executeImportCommand(root, { kind: "resume", importId: id }, undefined, undefined, probe);
  }
  const { recordArticlePresentation } = await import("../../scripts/record-article-presentation");
  return recordArticlePresentation(root, id, "build-pack/article-import/verifier.json", path.join(root, "page-design.json"), probe);
}
main().then(
  record => { process.stdout.write(JSON.stringify(record)); process.disconnect?.(); },
  error => { process.stderr.write(String(error)); process.exitCode = 1; process.disconnect?.(); },
);
