import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const bashFiles = [
  ".agents/skills/before-and-after/scripts/adapters/0x0st.sh",
  ".agents/skills/before-and-after/scripts/adapters/blob.sh",
  ".agents/skills/before-and-after/scripts/adapters/gist.sh",
  ".agents/skills/before-and-after/scripts/capture.sh",
  ".agents/skills/before-and-after/scripts/upload-and-copy.sh",
];

test("Build Faster Skills workflow contract is intact", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-agent-workflow.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("vendored Bash scripts are LF with valid shebang and pinned SHA256", () => {
  for (const file of bashFiles) {
    const bytes = readFileSync(file);
    assert.equal(bytes.includes(Buffer.from("\r")), false, `${file} contains CR`);
    assert.ok(bytes.toString("utf8").startsWith("#!"), `${file} missing shebang`);
    const manifest = JSON.parse(readFileSync(".agents/build-faster-skills.lock.json", "utf8"));
    const expected = manifest.files[file];
    const actual = createHash("sha256").update(bytes).digest("hex");
    assert.equal(actual, expected, `${file} SHA256 mismatch`);
  }
  for (const file of bashFiles) {
    const attr = spawnSync("git", ["check-attr", "eol", "--", file], { encoding: "utf8" });
    assert.equal(attr.status, 0, `${file} git check-attr failed: ${attr.stderr}`);
    assert.match(attr.stdout, new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: eol: lf`), `${file} effective checkout eol is not lf`);
  }
});