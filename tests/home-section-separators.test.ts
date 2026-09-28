import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chromium } from "playwright";

const stylesheet = readFileSync("src/app/globals.css", "utf8").replace(/^@import[^;]+;\s*$/gm, "");

test("the review catalogue renders one final separator in populated and empty states", { timeout: 60_000 }, async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>${stylesheet}</style>
      <div class="public-site">
        <section class="home-section review-catalogue">
          <div class="review-list">
            <article class="review-card">First review</article>
            <article class="review-card">Last review</article>
          </div>
        </section>
        <section class="home-section review-catalogue review-catalogue--empty">
          <div class="empty-review-state">No reviews</div>
        </section>
      </div>
    `);

    const borders = await page.evaluate(() => {
      const catalogue = document.querySelector<HTMLElement>(".review-catalogue");
      const reviews = document.querySelectorAll<HTMLElement>(".review-card");
      const emptyState = document.querySelector<HTMLElement>(".empty-review-state");

      if (!catalogue || reviews.length !== 2 || !emptyState) throw new Error("separator fixture did not render");

      return {
        catalogue: getComputedStyle(catalogue).borderBottomWidth,
        emptyState: getComputedStyle(emptyState).borderBottomWidth,
        firstReview: getComputedStyle(reviews[0]).borderBottomWidth,
        lastReview: getComputedStyle(reviews[1]).borderBottomWidth,
      };
    });

    assert.deepEqual(borders, {
      catalogue: "1px",
      emptyState: "0px",
      firstReview: "1px",
      lastReview: "0px",
    });
  } finally {
    await browser.close();
  }
});
