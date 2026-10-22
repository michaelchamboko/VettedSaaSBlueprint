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
  for (const card of cards) assert.match(card, /<summary[\s\S]*Explore 5 briefs[\s\S]*<\/summary>/);
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
  assert.match(readFileSync("src/components/public/StudioCategoryGallery.tsx", "utf8"), /open=\{index === activeIndex\}/);
  assert.match(readFileSync("src/components/public/StudioCategoryGallery.tsx", "utf8"), /suppressHydrationWarning/);
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
  assert.match(readFileSync("src/components/public/StudioCategoryGallery.tsx", "utf8"), /data-home-motion="review-card"/);
});

test("studio gallery stabilizes hover selection and respects reduced motion", () => {
  const source = readFileSync("src/components/public/StudioCategoryGallery.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(source, /useState\(2\)/);
  assert.match(source, /<motion\.details/);
  assert.match(source, /useReducedMotion\(\)/);
  assert.match(source, /layout=\{!reduceMotion\}/);
  assert.match(source, /duration: 0\.42, ease: \[0\.16, 1, 0\.3, 1\]/);
  assert.match(source, /onPointerMove=/);
  assert.match(source, /pointerType !== "mouse"/);
  assert.ok(source.includes('(hover: hover) and (pointer: fine)'));
  assert.match(source, /closest<HTMLElement>\("\.studio-category-card"\)/);
  assert.match(source, /onFocus=\{\(\) => setActiveIndex\(index\)\}/);
  assert.match(source, /event\.preventDefault\(\); setActiveIndex\(index\)/);
  assert.doesNotMatch(source, /onPointerEnter|card\.open\s*=/);
  const cardRule = css.match(/\.studio-category-card \{([^}]+)\}/)?.[1] ?? "";
  assert.doesNotMatch(cardRule, /transition:[^;]*(?:flex-grow|transform|top)/);
  assert.match(css, /@media \(max-width: 1024px\)[\s\S]*?\.studio-category-gallery \{ display: grid;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.studio-category-card, \.studio-category-card__image \{ transition: none; \}\s*\.studio-category-card\[open\] \{ top: 0; \}/);
});
