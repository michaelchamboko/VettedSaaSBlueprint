import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = new URL('./', import.meta.url);
const pages = [
  ['webcatalog', 'how-can-you-organize-multiple-web-apps-into-dedicated-desktop-workspaces', 'https://try.webcatalog.io/vettedsaasblueprint'],
  ['campaign-monitor', 'how-can-growing-brands-automate-on-brand-email-marketing-journeys', 'https://partners.campaignmonitor.com/vettedsaasblueprint'],
];
const browser = await chromium.launch();
const results = [];
try {
  for (const [name, slug, affiliate] of pages) {
    for (const [mode, width, height, reducedMotion, javaScriptEnabled] of [
      ['desktop', 1440, 900, 'no-preference', true],
      ['mobile', 390, 844, 'no-preference', true],
      ['reduced', 390, 844, 'reduce', true],
      ['no-js', 390, 844, 'reduce', false],
    ]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion, javaScriptEnabled });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(`http://localhost:3113/landing-page-previews/${slug}`, { waitUntil: 'networkidle' });
      const firstViewport = await page.evaluate(() => {
        const visible = selector => {
          const rect = document.querySelector(selector).getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= innerHeight;
        };
        return { primary_cta_visible: visible('[data-track="primary-cta"]'), disclosure_visible: visible('.landing-reference-composed__compact-disclosure') };
      });
      await page.screenshot({ path: fileURLToPath(new URL(`${name}-${mode}-first.png`, root)) });
      for (let y = 0; y < await page.locator('body').evaluate(el => el.scrollHeight); y += 650) {
        await page.evaluate(y => window.scrollTo(0, y), y);
        await page.waitForTimeout(180);
      }
      await page.waitForTimeout(700);
      await page.screenshot({ path: fileURLToPath(new URL(`${name}-${mode}-full.png`, root)), fullPage: true });
      const data = await page.evaluate(affiliate => ({
        exact_ctas: [...document.querySelectorAll('a')].filter(a => a.getAttribute('href') === affiliate).length,
        source_links: [...document.querySelectorAll('a')].filter(a => a.textContent === 'Read official source').map(a => a.href),
        review_date: document.querySelector('time')?.textContent,
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
        width: document.documentElement.clientWidth,
        scroll_width: document.documentElement.scrollWidth,
        headings: [...document.querySelectorAll('h1')].map(el => el.textContent),
        hidden_sections: [...document.querySelectorAll('[data-section-key]')].filter(el => Number(getComputedStyle(el).opacity) < 0.9).length,
      }), affiliate);
      const pass = response.status() === 200 && data.exact_ctas === 2 && data.source_links.length === 1 && data.review_date === '2026-10-13' && data.robots.includes('noindex') && data.width === data.scroll_width && data.headings.length === 1 && data.hidden_sections === 0 && errors.length === 0 && firstViewport.primary_cta_visible && firstViewport.disclosure_visible;
      results.push({ name, mode, status: response.status(), pass, ...firstViewport, ...data, errors });
      await context.close();
    }
  }
} finally { await browser.close(); }
await mkdir(root, { recursive: true });
await writeFile(new URL('browser-verification.json', root), JSON.stringify({ checked_at: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some(result => !result.pass)) process.exitCode = 1;
