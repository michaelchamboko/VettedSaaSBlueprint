import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  assertTreesEqual,
  gitBlobSha1,
  normaliseRepositoryUrl,
  parseGitTree,
  verifyLocalPin,
} from "../.agents/skills/eleanor-editorial/scripts/verify-upstream.mjs";

const root = ".agents/skills/eleanor-editorial";

test("the recorded complete tree covers the pinned upstream while runtime bytes stay selective", () => {
  const pin = verifyLocalPin(root);
  assert.equal(pin.manifest.commit, "8bf609edfaeed844f1d03bb6b69f80dc21728c8b");
  assert.equal(Object.keys(pin.tree.files).length, 24);
  assert.equal(pin.verified.length, 9);
  assert.ok(pin.tree.files["SKILL.md"]);
  assert.ok(pin.tree.files["tools/test_deslop.py"]);
  assert.equal(pin.manifest.files["SKILL.md"], undefined);
  assert.equal(pin.manifest.files["docs/img/hero.png"], undefined);
});

test("local verification rejects changed vendor bytes", () => {
  const temporaryRoot = mkdtempSync(join(process.cwd(), ".tmp-eleanor-pin-"));
  try {
    const manifest = JSON.parse(readFileSync(join(root, "UPSTREAM.json"), "utf8"));
    const tree = JSON.parse(readFileSync(join(root, "UPSTREAM_TREE.json"), "utf8"));
    writeFileSync(join(temporaryRoot, "UPSTREAM.json"), JSON.stringify(manifest));
    writeFileSync(join(temporaryRoot, "UPSTREAM_TREE.json"), JSON.stringify(tree));
    for (const path of Object.keys(manifest.files)) {
      const target = join(temporaryRoot, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(join(root, path)));
    }
    writeFileSync(join(temporaryRoot, "tools/deslop.py"), "changed vendor bytes\n");
    assert.throws(() => verifyLocalPin(temporaryRoot), /Vendored file bytes drifted: tools\/deslop\.py/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("complete tree comparison catches additions, omissions, hashes and modes", () => {
  const expected = {
    "a.txt": { mode: "100644", gitBlobSha1: "a".repeat(40) },
    "bin/run": { mode: "100755", gitBlobSha1: "b".repeat(40) },
  };
  assert.doesNotThrow(() => assertTreesEqual(expected, structuredClone(expected)));
  assert.throws(() => assertTreesEqual(expected, { ...expected, "new.txt": { mode: "100644", gitBlobSha1: "c".repeat(40) } }), /added/);
  assert.throws(() => assertTreesEqual(expected, { "a.txt": expected["a.txt"] }), /missing/);
  assert.throws(() => assertTreesEqual(expected, { ...expected, "a.txt": { ...expected["a.txt"], gitBlobSha1: "d".repeat(40) } }), /changed/);
  assert.throws(() => assertTreesEqual(expected, { ...expected, "bin/run": { ...expected["bin/run"], mode: "100644" } }), /changed/);
});

test("git tree parsing preserves paths, hashes and executable modes", () => {
  const parsed = parseGitTree(`100644 blob ${"a".repeat(40)}\tplain.txt\0` + `100755 blob ${"b".repeat(40)}\tdir/a file.sh\0`);
  assert.deepEqual(parsed, {
    "plain.txt": { mode: "100644", gitBlobSha1: "a".repeat(40) },
    "dir/a file.sh": { mode: "100755", gitBlobSha1: "b".repeat(40) },
  });
});

test("Git blob hashing and repository URL comparison match Git conventions", () => {
  const bytes = Buffer.from("hello\n");
  const expected = createHash("sha1").update("blob 6\0hello\n").digest("hex");
  assert.equal(gitBlobSha1(bytes), expected);
  assert.equal(normaliseRepositoryUrl("https://github.com/michaelchamboko/SlopMonster.git\n"), "https://github.com/michaelchamboko/SlopMonster");
});
