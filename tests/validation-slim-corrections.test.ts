import test from "node:test";
import assert from "node:assert/strict";
import { pageDesignValidationSchema } from "../src/lib/article-import/contracts";
import { validPageDesignReceipt } from "./fixtures/article-content-approval";
import { readVerifiedEvidenceBytes } from "../src/lib/article-import/execution-evidence";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";


test("page design notes no longer require viewport words", () => {
  const result = pageDesignValidationSchema.safeParse({
    ...validPageDesignReceipt,
    notes: "Reviewed the approved page with all required checks.",
  });
  assert.equal(result.success, true);
});

test("page design notes still reject unavailable or not-run checks", () => {
  for (const phrase of ["unknown command", "not run", "unavailable"]) {
    const result = pageDesignValidationSchema.safeParse({
      ...validPageDesignReceipt,
      notes: `Reviewed the page but a check was ${phrase}.`,
    });
    assert.equal(result.success, false, phrase);
  }
});

test("page design notes are still required", () => {
  const result = pageDesignValidationSchema.safeParse({
    ...validPageDesignReceipt,
    notes: "",
  });
  assert.equal(result.success, false);
});

test("readVerifiedEvidenceBytes returns bytes and rejects hash mismatch", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "verified-bytes-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const relative = "evidence/sample.txt";
  await mkdir(path.join(root, "evidence"), { recursive: true });
  await writeFile(path.join(root, relative), "hello");
  const bytes = Buffer.from("hello");
  const digest = createHash("sha256").update(bytes).digest("hex");
  const ref = { path: relative, sha256: digest };
  const read = await readVerifiedEvidenceBytes(root, ref);
  assert.equal(read.toString("utf8"), "hello");
  const badRef = { path: relative, sha256: "0".repeat(64) };
  await assert.rejects(readVerifiedEvidenceBytes(root, badRef), /EVIDENCE_HASH_MISMATCH/);
});
