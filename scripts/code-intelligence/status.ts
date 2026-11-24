import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ARTIFACT_FILES, sourceManifest, validate } from "./common.ts";
const root = process.cwd();
const digest = sourceManifest(root).digest;
let current = false;
if (existsSync(path.join(root, ".codebase-memory", "provenance.json"))) current = validate(root).current;
const pendingArg = process.argv.indexOf("--pending-ref");
let pendingCurrent = false;
if (!current && pendingArg >= 0) {
  const ref = process.argv[pendingArg + 1];
  if (!ref || ref.startsWith("-")) throw new Error("Invalid pending ref");
  const dir = mkdtempSync(path.join(tmpdir(), "cbm-pending-"));
  try {
    for (const file of ARTIFACT_FILES) writeFileSync(path.join(dir, file), execFileSync("git", ["-C", root, "show", `${ref}:.codebase-memory/${file}`], { maxBuffer: 128 * 1024 * 1024 }));
    pendingCurrent = validate(root, dir).sourceDigest === digest;
  } finally { rmSync(dir, { recursive: true }); }
}
const shouldBuild = !current && !pendingCurrent;
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `should_build=${shouldBuild}\npending_current=${pendingCurrent}\n`);
console.log(JSON.stringify({ current, pendingCurrent, shouldBuild, sourceDigest: digest }, null, 2));

