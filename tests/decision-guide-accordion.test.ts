import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";

import Home from "../src/app/page";
import { listDecisionSets } from "../src/lib/decision-journey/sets";

const initialGuidePaths = ["/decision-hub", "/solution-hub", "/scenarios"];
const stylesheet = readFileSync("src/app/globals.css", "utf8").replace(/^@import[^;]+;\s*$/gm, "");

test("homepage decision guides are grouped native disclosures without a JavaScript dependency", { timeout: 60_000 }, async () => {
  const markup = renderToStaticMarkup(createElement(Home));
  const decisionSets = listDecisionSets();
  const expectedPaths = [
    ...initialGuidePaths,
    ...decisionSets.flatMap((set) => [
      set.pages.decisionHub.canonicalPath,
      set.pages.solutionHub.canonicalPath,
      set.pages.scenario.canonicalPath,
    ]),
  ];
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await page.setContent(markup);

    const groups = page.locator(".decision-guide-accordion");
    assert.equal(await groups.count(), decisionSets.length + 1);

    for (let index = 0; index < await groups.count(); index += 1) {
      const group = groups.nth(index);
      assert.equal(await group.getAttribute("data-home-motion"), "review-card", "the deck should enter as one aligned group");
      assert.equal(await group.locator("[data-home-motion]").count(), 0, "cards must not receive staggered reveal transforms");
      assert.equal(await group.locator("details").count(), 3);
      assert.equal(await group.locator("summary").count(), 3);
      assert.equal(await group.locator("h3").count(), 3);
      assert.equal(await group.locator("details[open]").count(), 1);
      assert.deepEqual(await group.locator("details").evaluateAll((items) => [...new Set(items.map((item) => item.getAttribute("name")))]), [
        index === 0 ? "homepage-decision-guides" : `decision-set-${decisionSets[index - 1].slug}`,
      ]);
    }

    const renderedPaths = await groups.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    assert.deepEqual(renderedPaths, expectedPaths);

    const firstGroup = groups.first();
    await firstGroup.locator("summary").nth(1).click();
    assert.equal(await firstGroup.locator("details").nth(0).getAttribute("open"), null);
    assert.notEqual(await firstGroup.locator("details").nth(1).getAttribute("open"), null);
  } finally {
    await browser.close();
  }
});

test("decision guide accordion communicates state across desktop, mobile, focus, and reduced motion", { timeout: 60_000 }, async () => {
  const markup = renderToStaticMarkup(createElement(Home));
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 1440, height: 1000 } });
    await page.setContent(`<style>${stylesheet}</style>${markup}`);

    const group = page.locator(".decision-guide-accordion").first();
    const cards = group.locator("details");
    const summaries = group.locator("summary");
    const panels = group.locator(".decision-guide-card__panel");
    const initialWidths = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
    const deckLayout = await group.evaluate((deck) => {
      const intro = deck.parentElement!.querySelector(".section-heading")!.getBoundingClientRect();
      const deckRect = deck.getBoundingClientRect();
      const first = deck.querySelector("details")!.getBoundingClientRect();
      const second = deck.querySelectorAll("details")[1].getBoundingClientRect();
      return { sideBySide: intro.right <= deckRect.left, overlap: first.right - second.left };
    });
    assert.equal(deckLayout.sideBySide, true, "desktop introduction should sit beside the deck");
    assert.ok(deckLayout.overlap > 0, "closed tabs should tuck behind the active card");
    const darkTab = await cards.nth(1).evaluate((card) => ({ background: getComputedStyle(card).backgroundColor, color: getComputedStyle(card).color }));
    assert.equal(darkTab.background, "rgb(29, 33, 29)");
    assert.equal(darkTab.color, "rgb(251, 248, 241)");
    const button = await panels.nth(0).locator("a").evaluate((link) => ({ background: getComputedStyle(link).backgroundColor, height: link.getBoundingClientRect().height }));
    assert.notEqual(button.background, "rgba(0, 0, 0, 0)");
    assert.ok(button.height >= 48);
    const imageInset = await panels.nth(0).locator("img").evaluate((image) => {
      const frame = image.closest("details")!.getBoundingClientRect();
      const rect = image.getBoundingClientRect();
      return rect.top > frame.top && rect.right < frame.right && rect.bottom < frame.bottom;
    });
    assert.equal(imageInset, true, "photograph should retain a paper margin");

    assert.ok(initialWidths[0] >= initialWidths[1] * 5, `expected the open card to dominate: ${initialWidths.join(", ")}`);
    assert.ok(initialWidths[1] <= 120, `expected a narrow closed tab: ${initialWidths[1]}`);
    assert.equal(await cards.nth(1).locator("h3 > span:last-child").evaluate((title) => getComputedStyle(title).writingMode), "vertical-rl");
    assert.equal(await panels.nth(0).locator("img").isVisible(), true);
    assert.equal(await panels.nth(0).isVisible(), true);
    assert.equal(await panels.nth(1).isVisible(), false);

    await summaries.nth(1).click();
    await page.waitForTimeout(500);
    const transferredWidths = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().width));
    assert.ok(transferredWidths[1] >= transferredWidths[0] * 5, `expected dominance to transfer: ${transferredWidths.join(", ")}`);
    assert.equal(await cards.nth(0).locator("h3 > span:last-child").evaluate((title) => getComputedStyle(title).writingMode), "vertical-rl");
    assert.equal(await panels.nth(1).locator("img").isVisible(), true);
    assert.equal(await panels.nth(0).isVisible(), false);
    assert.equal(await panels.nth(1).isVisible(), true);

    await summaries.nth(1).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const focusState = await summaries.nth(1).evaluate((summary) => {
      const style = getComputedStyle(summary);
      return { height: summary.getBoundingClientRect().height, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    assert.ok(focusState.height >= 44, `expected a 44px control, received ${focusState.height}px`);
    assert.notEqual(focusState.outlineStyle, "none");
    assert.notEqual(focusState.outlineWidth, "0px");

    await page.setViewportSize({ width: 808, height: 668 });
    const labelTransforms = () => summaries.evaluateAll((items) => items.map((summary) => getComputedStyle(summary, "::after").transform));
    assert.deepEqual(await labelTransforms(), ["matrix(1, 0, 0, 1, -14, 0)", "none", "none"], "only a closed tab before the active card needs overlap compensation");
    await summaries.nth(2).click();
    await page.waitForTimeout(500);
    assert.notEqual(await cards.nth(2).getAttribute("open"), null);
    assert.deepEqual(await labelTransforms(), ["matrix(1, 0, 0, 1, -14, 0)", "matrix(1, 0, 0, 1, -14, 0)", "none"]);
    const cardEdges = await cards.evaluateAll((items) => items.map((item) => {
      const { top, bottom } = item.getBoundingClientRect();
      return { top, bottom };
    }));
    for (const edges of cardEdges) {
      assert.ok(Math.abs(edges.top - cardEdges[0].top) < 1, "all cards should share their top edge at 808px");
      assert.ok(Math.abs(edges.bottom - cardEdges[0].bottom) < 1, "all cards should share their bottom edge at 808px");
    }

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const mobileState = await page.evaluate(() => ({
        flexDirection: getComputedStyle(document.querySelector<HTMLElement>(".decision-guide-accordion")!).flexDirection,
        overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }));
      assert.equal(mobileState.flexDirection, "column");
      assert.equal(mobileState.overflows, false);
      assert.deepEqual(await labelTransforms(), ["none", "none", "none"], "mobile labels must retain native unshifted placement");
      const groupWidth = await group.evaluate((element) => element.getBoundingClientRect().width);
      for (const card of await cards.all()) {
        assert.ok(Math.abs(await card.evaluate((element) => element.getBoundingClientRect().width) - groupWidth) < 2);
        assert.equal(await card.locator("h3 > span:last-child").evaluate((title) => getComputedStyle(title).writingMode), "horizontal-tb");
      }
    }

    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotionState = await cards.nth(1).evaluate((card) => {
      const style = getComputedStyle(card);
      return { transform: style.transform, transitionDuration: style.transitionDuration };
    });
    assert.equal(reducedMotionState.transitionDuration, "0s");
    assert.equal(reducedMotionState.transform, "none");
  } finally {
    await browser.close();
  }
});
