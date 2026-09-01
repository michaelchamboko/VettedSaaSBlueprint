import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const landingComponentsPath = path.join(process.cwd(), "src", "components", "landing");
const directReviewSource = fs.readFileSync(path.join(landingComponentsPath, "DirectReviewPage.tsx"), "utf8");
const editorialReviewPath = path.join(landingComponentsPath, "EditorialReviewPage.tsx");
const editorialSource = fs.existsSync(editorialReviewPath) ? fs.readFileSync(editorialReviewPath, "utf8") : "";

test("legacy renderer source remains the fallback for absent design profiles", () => {
  assert.match(directReviewSource, /design_profile/);
  assert.match(directReviewSource, /EditorialReviewPage/);
});

test("editorial v2 renderer contains mobile-safe CTA and no sticky CTA primitive", () => {
  assert.match(editorialSource, /flex items-center justify-between whitespace-nowrap/);
  assert.doesNotMatch(editorialSource, /position:\s*(fixed|sticky)|fixed bottom|sticky bottom/);
});
