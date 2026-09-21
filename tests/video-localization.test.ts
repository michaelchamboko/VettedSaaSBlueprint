import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { localizationPages, localizationPaths, localizationSources } from "../src/lib/decision-journey/video-localization";

test("video localization delivers connected 12/7/12 evidence-backed page contracts", () => {
  assert.deepEqual(localizationPages.map((page) => page.sections.length), [12, 7, 12]);
  assert.deepEqual(localizationPages.map((page) => page.path), [...localizationPaths]);
  const sourceIds = new Set(localizationSources.map((source) => source.id));
  for (const page of localizationPages) {
    assert.equal(new Set(page.sections.map((section) => section.id)).size, page.sections.length);
    for (const section of page.sections) {
      for (const source of section.sources ?? []) assert.ok(sourceIds.has(source));
      assert.ok(section.answer.length > 30);
      assert.ok(section.paragraphs.length >= 2);
    }
  }
  assert.equal(localizationPages[0].affiliate, false);
  assert.match(JSON.stringify(localizationPages[2]), /illustrative scenario, not a customer story/);
  assert.match(JSON.stringify(localizationPages), /Beta Services/);
});

test("commercial next step retains the exact approved URL with adjacent disclosure", () => {
  const receipt = JSON.parse(readFileSync("src/generated/landing-pages/releases/elevenlabs-ai-voice-generator/release-receipt.json", "utf8"));
  const approved = readFileSync("approved-urls.md", "utf8");
  assert.ok(approved.split(/\r?\n/).includes(`- ${receipt.exact_affiliate_url}`));
  const component = readFileSync("src/components/public/LocalizationJourney.tsx", "utf8");
  assert.ok(component.includes(receipt.exact_affiliate_url));
  assert.match(component, /rel="sponsored nofollow"/);
  assert.match(component, /may earn a commission/);
  assert.ok(component.indexOf("may earn a commission") < component.indexOf("Check ElevenLabs for your pilot"));
});
