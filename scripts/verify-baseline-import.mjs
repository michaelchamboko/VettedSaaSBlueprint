import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "build-pack", "baseline-import-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const required = ["source_repository", "source_commit", "source_tree", "source_path_trees", "included", "excluded", "verification"];
for (const key of required) {
  if (!manifest[key]) throw new Error(`Baseline manifest is missing ${key}.`);
}
if (!/^[0-9a-f]{40}$/i.test(manifest.source_commit) || !/^[0-9a-f]{40}$/i.test(manifest.source_tree)) {
  throw new Error("Baseline source commit and tree must be immutable Git object IDs.");
}
for (const item of ["scripts", "tests", "approved-urls.md"]) {
  if (!manifest.included.includes(item) || !manifest.source_path_trees[item]) throw new Error(`Baseline manifest omits ${item}.`);
  await access(path.join(root, item));
}
for (const excluded of [".git", ".vercel", ".env*", "node_modules", ".next", ".github"]) {
  if (!manifest.excluded.includes(excluded)) throw new Error(`Baseline manifest does not protect ${excluded}.`);
}

process.stdout.write(`${JSON.stringify({ status: "pass", source_commit: manifest.source_commit, source_tree: manifest.source_tree })}\n`);
