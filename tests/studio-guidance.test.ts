import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getStudioCategories, studioLandingPages } from "../src/lib/studio-catalogue";

test("all Studio briefs offer distinct practical guidance in a reliable sequence", () => {
  assert.equal(studioLandingPages.length, 25);
  assert.equal(new Set(studioLandingPages.map((page) => page.headline)).size, 25);
  assert.equal(new Set(studioLandingPages.map((page) => page.lede)).size, 25);
  for (const page of studioLandingPages) {
    assert.deepEqual(page.steps.map((step) => step.number), ["01", "02", "03"]);
    assert.equal(new Set(page.steps.map((step) => step.body)).size, 3);
    assert.ok(page.guideTitle.length > 10);
    assert.ok(page.nextStep.length > 40);
    for (const step of page.steps) {
      assert.ok(step.title.length > 5);
      assert.ok(step.body.length > 70);
      assert.notEqual(step.body, page.headline);
    }
    assert.doesNotMatch(JSON.stringify(page), /Name the moment|Check the working detail|Decide the next experiment|expanding the bet/);
  }
});

test("homepage gallery receives link data without serializing complete briefs", () => {
  const pages = getStudioCategories().flatMap((category) => category.pages);
  assert.equal(pages.length, 25);
  assert.deepEqual(pages.map((page) => page.path), studioLandingPages.map((page) => page.path));
  for (const page of pages) {
    assert.deepEqual(Object.keys(page).sort(), ["path", "slug", "variant"]);
    assert.deepEqual(Object.keys(page.variant), ["label"]);
  }
});

test("Studio brief destinations stay unchanged and commercial action follows useful guidance", () => {
  const destinations = ["https://get.carepatron.com/michaelmedium", "https://get.datahawk.co/mau0otko9lz4-o5aq3q", "https://try.elevenlabs.io/izj2b165mcsj", "https://free-trial.adcreative.ai/8phdnllve4xi", "https://partners.snowfire.ai/j1a8kovs1uez"];
  assert.deepEqual([...new Set(studioLandingPages.map((page) => page.affiliateUrl))], destinations);
  const source = readFileSync("src/app/studio/[slug]/page.tsx", "utf8");
  assert.ok(source.indexOf("page.steps.map") < source.indexOf("href={page.affiliateUrl}"));
  assert.ok(source.indexOf("styles.disclosure") < source.indexOf("href={page.affiliateUrl}"));
  assert.match(source, /rel="nofollow sponsored"/);
  assert.match(source, /aria-labelledby="guide-title"/);
});
