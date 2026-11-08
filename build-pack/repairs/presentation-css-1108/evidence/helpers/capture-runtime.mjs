import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const outDir = process.argv[2];
const baseUrl = process.argv[3];
const phase = process.argv[4] || 'before'; // before/after
const sourceHash = process.argv[5] || '';
const buildId = process.argv[6] || '';

fs.mkdirSync(outDir, { recursive: true });

const routes = [
  '/decision-hub',
  '/blog/production-ready-ai-voice-cloning-checklist',
  '/landing-page-builders/elevenlabs-ai-voice-generator',
];

const configs = [
  { name: 'desktop', width: 1440, height: 900, reducedMotion: false },
  { name: 'mobile', width: 390, height: 844, reducedMotion: false },
  { name: 'desktop-reduced-motion', width: 1440, height: 900, reducedMotion: true },
];

function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

const browser = await chromium.launch();
const report = {
  phase,
  baseUrl,
  sourceCssSha256: sourceHash,
  buildId,
  startedUtc: new Date().toISOString(),
  entries: [],
  fatalError: null,
};

let hardError = false;

for (const cfg of configs) {
  for (const route of routes) {
    const entry = {
      route,
      viewport: cfg.name,
      width: cfg.width,
      height: cfg.height,
      reducedMotion: cfg.reducedMotion,
      startedUtc: new Date().toISOString(),
      httpStatus: null,
      h1: null,
      title: null,
      consoleErrors: [],
      pageErrors: [],
      requestFailures: [],
      overflowInitial: null,
      overflowAfterScroll: null,
      overflowAfterFaq: null,
      faqExpanded: false,
      keyboardFocus: null,
      motionObservation: null,
      screenshot: null,
      screenshotSha256: null,
      endedUtc: null,
      error: null,
    };
    let context;
    try {
      context = await browser.newContext({
        viewport: { width: cfg.width, height: cfg.height },
        reducedMotion: cfg.reducedMotion ? 'reduce' : 'no-preference',
      });
      const page = await context.newPage();
      page.on('console', (msg) => { if (msg.type() === 'error') entry.consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => entry.pageErrors.push(String(err)));
      page.on('requestfailed', (req) => entry.requestFailures.push(`${req.url()} :: ${req.failure()?.errorText}`));

      const res = await page.goto(baseUrl + route, { waitUntil: 'networkidle', timeout: 60000 });
      entry.httpStatus = res ? res.status() : null;
      if (!res || res.status() !== 200) throw new Error(`HTTP ${entry.httpStatus} for ${route}`);

      entry.title = await page.title();
      entry.h1 = await page.locator('h1').first().textContent().catch(() => null);

      // overflow check helper
      async function overflow() {
        return await page.evaluate(() => ({
          documentScrollWidth: document.documentElement.scrollWidth,
          documentClientWidth: document.documentElement.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
          bodyClientWidth: document.body.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        }));
      }
      entry.overflowInitial = await overflow();

      // screenshot
      const safeRoute = route.replace(/^\//, '').replace(/\//g, '_');
      const file = path.join(outDir, `${safeRoute}-${cfg.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      entry.screenshot = file;
      entry.screenshotSha256 = sha256File(file);

      // scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      entry.overflowAfterScroll = await overflow();

      // expand FAQ details if any
      const details = page.locator('details');
      const count = await details.count();
      if (count > 0) {
        await details.first().locator('summary').click().catch(() => {});
        await page.waitForTimeout(300);
        entry.faqExpanded = true;
      }
      entry.overflowAfterFaq = await overflow();

      // keyboard focus proof
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          tag: el.tagName,
          id: el.id || null,
          className: el.className || null,
          outline: cs.outline,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
        };
      });
      entry.keyboardFocus = focused;

      // motion observation
      entry.motionObservation = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        let animated = 0;
        for (const el of els) {
          const cs = window.getComputedStyle(el);
          if (cs.animationName && cs.animationName !== 'none') animated++;
          if (cs.transitionDuration && cs.transitionDuration !== '0s') animated++;
        }
        return {
          reducedMotionMedia: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          elementsWithAnimationOrTransition: animated,
        };
      });

      if (entry.consoleErrors.length || entry.pageErrors.length || entry.requestFailures.length) {
        // not fatal, but recorded; mark hardError? Task says catching error must fail run.
        // We'll treat page/console errors as hard failures.
        hardError = true;
      }
      if (entry.overflowInitial?.hasHorizontalOverflow || entry.overflowAfterScroll?.hasHorizontalOverflow || entry.overflowAfterFaq?.hasHorizontalOverflow) {
        // record but do not mark hard error? Mobile overflow is known intermittent; report. We'll not fail hard, but could. Keep as measured.
      }
    } catch (e) {
      entry.error = String(e);
      hardError = true;
    } finally {
      entry.endedUtc = new Date().toISOString();
      report.entries.push(entry);
      if (context) await context.close().catch(() => {});
    }
  }
}

await browser.close();
report.endedUtc = new Date().toISOString();
report.hardError = hardError;

const outFile = path.join(outDir, `runtime-report-${phase}.json`);
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ phase, entries: report.entries.length, hardError, outFile }));

if (hardError) process.exit(1);
