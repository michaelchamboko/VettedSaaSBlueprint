import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StudioCategoryGallery } from "../src/components/public/StudioCategoryGallery";
import { getStudioCategories } from "../src/lib/studio-catalogue";

test("studio gallery preserves native disclosures, ElevenLabs default, and all 25 brief routes", () => {
  const categories = getStudioCategories();
  const html = renderToStaticMarkup(createElement(StudioCategoryGallery, { categories }));
  const cards = html.match(/<details\b[\s\S]*?<\/details>/g) ?? [];
  assert.deepEqual(categories.map((category) => category.productName), ["Carepatron", "DataHawk", "ElevenLabs", "AdCreative.ai", "Snowfire AI"]);
  assert.equal(cards.length, 5);
  for (const card of cards) {
    assert.match(card, /name="homepage-studio-categories"/);
    assert.ok(card.indexOf("studio-category-card__heading") < card.indexOf("studio-category-card__image"));
    assert.ok(card.indexOf("studio-category-card__description") < card.indexOf("studio-category-card__image"));
  }
  assert.equal((html.match(/<summary\b/g) ?? []).length, 5);
  assert.equal((html.match(/Explore 5 briefs/g) ?? []).length, 5);
  for (const card of cards) {
    assert.match(card, /<summary[\s\S]*Explore 5 briefs[\s\S]*<\/summary>/);
  }
  assert.equal(cards.filter((card) => /<details[^>]*\bopen=""/.test(card)).length, 1);
  assert.match(cards[2], /<details[^>]*\bopen=""/);
  assert.match(cards[2], /ElevenLabs/);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(hrefs, categories.flatMap((category) => category.pages.map((page) => page.path)));
  assert.equal(hrefs.length, 25);
  assert.doesNotMatch(html, /[←-⇿]/u);
  for (const category of categories) {
    assert.ok(category.visualPosition);
    assert.ok(category.alt);
  }
  assert.doesNotMatch(readFileSync("src/components/public/StudioCategoryGallery.tsx", "utf8"), /[←-⇿]/u);
});

test("studio images retain accessible descriptions and show one category sprite panel", () => {
  const categories = getStudioCategories();
  const html = renderToStaticMarkup(createElement(StudioCategoryGallery, { categories }));
  assert.equal((html.match(/role="img"/g) ?? []).length, 5);
  assert.equal((html.match(/class="studio-category-card__label"/g) ?? []).length, 5);
  for (const category of categories) {
    assert.ok(html.includes(`aria-label="${category.alt}"`));
    assert.ok(html.includes(`background-position:${category.visualPosition}`));
  }
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /background-size:\s*500% auto/);
});
