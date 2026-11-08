import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const outDir = process.argv[2];
const baseUrl = process.argv[3];
const sourceHash = process.argv[4] || '';
const buildId = process.argv[5] || '';

fs.mkdirSync(outDir, { recursive: true });

const expectedH1 = {
  '/decision-hub': 'How should a five-person team choose software without a technical administrator?',
  '/blog/production-ready-ai-voice-cloning-checklist': 'A Production Test for AI Voice Cloning',
  '/landing-page-builders/elevenlabs-ai-voice-generator': 'Decide if ElevenLabs fits your voiceover workflow',
};

const routes = Object.keys(expectedH1);

function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

async function motionMetrics(page) {
  return await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    let animatedOrTransition = 0;
    const durations = [];
    for (const el of all) {
      const cs = window.getComputedStyle(el);
      const t = cs.transitionDuration || '';
      const a = cs.animationDuration || '';
      if ((t && t !== '0s') || (a && a !== '0s')) animatedOrTransition++;
      if (t && t !== '0s') durations.push(t);
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return { reducedMotionMedia: reduce, elementsWithAnimationOrTransition: animatedOrTransition, sampleTransitionDurations: durations.slice(0, 10) };
  });
}

async function overflowState(page) {
  return await page.evaluate(() => ({
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    documentScrollWidth: document.documentElement.scrollWidth,
    documentClientWidth: document.documentElement.clientWidth,
  }));
}

const browser = await chromium.launch();
const report = {
  baseUrl,
  sourceCssSha256: sourceHash,
  buildId,
  startedUtc: new Date().toISOString(),
  entries: [],
  hardError: false,
};

let hardError = false;

for (const route of routes) {
  // Desktop normal
  for (const mode of ['normal', 'reduced']) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('requestfailed', (r) => requestFailures.push(`${r.url()} :: ${r.failure()?.errorText}`));

    const entry = {
      route,
      context: `desktop-${mode}`,
      device: 'desktop-1440x900',
      startedUtc: new Date().toISOString(),
      httpStatus: null,
      h1Actual: null,
      h1Expected: expectedH1[route],
      h1Match: false,
      nextErrorOverlay: null,
      consoleErrors,
      pageErrors,
      requestFailures,
      overflowInitial: null,
      overflowAfterScroll: null,
      overflowAfterFaq: null,
      faq: { present: false, expanded: false, openAfterClick: null, keyboardActivated: false, visibleFocus: null },
      motion: null,
      keyboardFocusFirst: null,
      screenshot: null,
      screenshotSha256: null,
      error: null,
      endedUtc: null,
    };

    try {
      const res = await page.goto(baseUrl + route, { waitUntil: 'networkidle', timeout: 60000 });
      entry.httpStatus = res ? res.status() : null;
      if (!res || res.status() !== 200) throw new Error(`HTTP ${entry.httpStatus}`);

      entry.h1Actual = await page.locator('h1').first().textContent();
      entry.h1Match = entry.h1Actual === entry.h1Expected;
      if (!entry.h1Match) throw new Error(`H1 mismatch: got "${entry.h1Actual}" expected "${entry.h1Expected}"`);

      // Next error overlay check
      const overlay = await page.locator('nextjs-portal, #__next-build-error, [data-nextjs-dialog]').count();
      const bodyText = await page.locator('body').innerText();
      const hasErrorText = /Application error|Unhandled Runtime Error/i.test(bodyText);
      entry.nextErrorOverlay = { overlayCount: overlay, hasErrorText };
      if (overlay > 0 || hasErrorText) throw new Error('Next error overlay/text detected');

      entry.overflowInitial = await overflowState(page);

      // screenshot
      const safe = route.replace(/^\//, '').replace(/\//g, '_');
      const file = path.join(outDir, `${safe}-desktop-${mode}.png`);
      await page.screenshot({ path: file, fullPage: true });
      entry.screenshot = file;
      entry.screenshotSha256 = sha256File(file);

      // scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      entry.overflowAfterScroll = await overflowState(page);

      // FAQ detection
      const detailsCount = await page.locator('details').count();
      entry.faq.present = detailsCount > 0;
      if (detailsCount > 0) {
        const firstDetails = page.locator('details').first();
        const summary = firstDetails.locator('summary');
        // keyboard activation
        await summary.focus();
        const focusInfo = await page.evaluate(() => {
          const el = document.activeElement;
          const cs = window.getComputedStyle(el);
          return { tag: el.tagName, outlineWidth: cs.outlineWidth, outline: cs.outline, boxShadow: cs.boxShadow };
        });
        entry.faq.visibleFocus = focusInfo;
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        const isOpen = await firstDetails.evaluate((d) => d.open);
        entry.faq.expanded = true;
        entry.faq.openAfterClick = isOpen;
        entry.faq.keyboardActivated = true;
        if (!isOpen) throw new Error('FAQ did not open after keyboard activation');
        entry.overflowAfterFaq = await overflowState(page);
      } else {
        entry.faq.expanded = false;
        entry.overflowAfterFaq = entry.overflowAfterScroll;
      }

      entry.motion = await motionMetrics(page);

      // first Tab focus
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
      entry.keyboardFocusFirst = await page.evaluate(() => {
        const el = document.activeElement;
        const cs = window.getComputedStyle(el);
        return { tag: el.tagName, id: el.id || null, className: el.className || null, outlineWidth: cs.outlineWidth, outline: cs.outline, boxShadow: cs.boxShadow };
      });

      if (entry.overflowInitial.hasHorizontalOverflow || entry.overflowAfterScroll.hasHorizontalOverflow || (entry.overflowAfterFaq && entry.overflowAfterFaq.hasHorizontalOverflow)) {
        throw new Error('Horizontal overflow detected');
      }
      if (consoleErrors.length || pageErrors.length || requestFailures.length) {
        hardError = true;
      }
    } catch (e) {
      entry.error = String(e);
      hardError = true;
    } finally {
      entry.endedUtc = new Date().toISOString();
      report.entries.push(entry);
      await ctx.close().catch(() => {});
    }
  }

  // Genuine mobile device emulation (Pixel 5) on AFTER
  {
    const device = devices['Pixel 5'];
    const ctx = await browser.newContext({ ...device, reducedMotion: 'no-preference' });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('requestfailed', (r) => requestFailures.push(`${r.url()} :: ${r.failure()?.errorText}`));

    const entry = {
      route,
      context: 'mobile-device',
      device: 'Pixel 5',
      emulation: { isMobile: device.isMobile, hasTouch: device.hasTouch, deviceScaleFactor: device.deviceScaleFactor, viewport: device.viewport },
      startedUtc: new Date().toISOString(),
      httpStatus: null,
      h1Actual: null,
      h1Expected: expectedH1[route],
      h1Match: false,
      nextErrorOverlay: null,
      consoleErrors,
      pageErrors,
      requestFailures,
      overflowInitial: null,
      overflowAfterScroll: null,
      overflowAfterFaq: null,
      faq: { present: false, expanded: false, openAfterClick: null, keyboardActivated: false, visibleFocus: null },
      motion: null,
      screenshot: null,
      screenshotSha256: null,
      error: null,
      endedUtc: null,
    };

    try {
      const res = await page.goto(baseUrl + route, { waitUntil: 'networkidle', timeout: 60000 });
      entry.httpStatus = res ? res.status() : null;
      if (!res || res.status() !== 200) throw new Error(`HTTP ${entry.httpStatus}`);
      entry.h1Actual = await page.locator('h1').first().textContent();
      entry.h1Match = entry.h1Actual === entry.h1Expected;
      if (!entry.h1Match) throw new Error(`H1 mismatch: got "${entry.h1Actual}"`);

      const overlay = await page.locator('nextjs-portal, #__next-build-error, [data-nextjs-dialog]').count();
      const bodyText = await page.locator('body').innerText();
      const hasErrorText = /Application error|Unhandled Runtime Error/i.test(bodyText);
      entry.nextErrorOverlay = { overlayCount: overlay, hasErrorText };
      if (overlay > 0 || hasErrorText) throw new Error('Next error overlay/text detected');

      entry.overflowInitial = await overflowState(page);
      const safe = route.replace(/^\//, '').replace(/\//g, '_');
      const file = path.join(outDir, `${safe}-mobile-Pixel5.png`);
      await page.screenshot({ path: file, fullPage: true });
      entry.screenshot = file;
      entry.screenshotSha256 = sha256File(file);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
      entry.overflowAfterScroll = await overflowState(page);

      const detailsCount = await page.locator('details').count();
      entry.faq.present = detailsCount > 0;
      if (detailsCount > 0) {
        const firstDetails = page.locator('details').first();
        await firstDetails.locator('summary').tap();
        await page.waitForTimeout(300);
        const isOpen = await firstDetails.evaluate((d) => d.open);
        entry.faq.expanded = true;
        entry.faq.openAfterClick = isOpen;
        entry.faq.keyboardActivated = false;
        if (!isOpen) throw new Error('FAQ did not open after tap');
        entry.overflowAfterFaq = await overflowState(page);
      } else {
        entry.overflowAfterFaq = entry.overflowAfterScroll;
      }

      entry.motion = await motionMetrics(page);

      if (entry.overflowInitial.hasHorizontalOverflow || entry.overflowAfterScroll.hasHorizontalOverflow || (entry.overflowAfterFaq && entry.overflowAfterFaq.hasHorizontalOverflow)) {
        throw new Error('Horizontal overflow detected');
      }
      if (consoleErrors.length || pageErrors.length || requestFailures.length) hardError = true;
    } catch (e) {
      entry.error = String(e);
      hardError = true;
    } finally {
      entry.endedUtc = new Date().toISOString();
      report.entries.push(entry);
      await ctx.close().catch(() => {});
    }
  }
}

await browser.close();
report.endedUtc = new Date().toISOString();
report.hardError = hardError;

const outFile = path.join(outDir, 'supplemental-functional-report.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ entries: report.entries.length, hardError, outFile }));

if (hardError) process.exit(1);
