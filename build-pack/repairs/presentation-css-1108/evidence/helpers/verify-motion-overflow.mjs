import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const outDir = process.argv[2];
const baseUrl = process.argv[3];
const manifestPath = 'build-pack/repairs/presentation-css-1108/evidence/source-hash-manifest.json';
const buildIdPath = '.next/BUILD_ID';
const route = '/landing-page-builders/elevenlabs-ai-voice-generator';
const expectedH1 = 'Decide if ElevenLabs fits your voiceover workflow';
const widths = [390, 393, 1440];
const reducedModes = [false, true];
const samples = 5;

// Read manifest and build ID before any browser work.
const manifestRaw = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestRaw);
const ownedFiles = manifest.ownedFiles || {};
const recomputed = {};
for (const f of Object.keys(ownedFiles)) {
  recomputed[f] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
}
for (const f of Object.keys(ownedFiles)) {
  if (recomputed[f] !== ownedFiles[f]) {
    console.error(`Hash mismatch for ${f}: expected ${ownedFiles[f]} got ${recomputed[f]}`);
    process.exit(1);
  }
}
const buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
if (!buildId) {
  console.error('Missing build ID');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const report = {
  baseUrl,
  route,
  expectedH1,
  sourceHashes: recomputed,
  buildId,
  startedUtc: new Date().toISOString(),
  results: [],
  hardError: false,
};

for (const width of widths) {
  for (const reduced of reducedModes) {
    const ctx = await browser.newContext({
      viewport: { width, height: reduced ? 900 : 851 },
      reducedMotion: reduced ? 'reduce' : 'no-preference',
    });
    const perMode = { width, reducedMotion: reduced, samples: [], maxScrollWidth: 0, anyOverflow: false, httpStatus: null, h1Actual: null, h1Match: false, nextErrorOverlay: null, errors: [] };
    for (let i = 0; i < samples; i++) {
      const page = await ctx.newPage();
      const samplesArr = [];
      let hard = false;
      try {
        const res = await page.goto(baseUrl + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
        perMode.httpStatus = res ? res.status() : null;
        if (!res || res.status() !== 200) { hard = true; perMode.errors.push(`HTTP ${perMode.httpStatus}`); }
        const h1 = await page.locator('h1').first().textContent().catch(() => null);
        perMode.h1Actual = h1;
        perMode.h1Match = h1 === expectedH1;
        if (!perMode.h1Match) { hard = true; perMode.errors.push(`H1 mismatch: ${h1}`); }
        const overlay = await page.locator('nextjs-portal, #__next-build-error, [data-nextjs-dialog]').count();
        const bodyText = await page.locator('body').innerText();
        const hasErrorText = /Application error|Unhandled Runtime Error/i.test(bodyText);
        perMode.nextErrorOverlay = { overlayCount: overlay, hasErrorText };
        if (overlay > 0 || hasErrorText) { hard = true; perMode.errors.push('Next error overlay/text'); }

        for (let t = 0; t < 1200; t += 50) {
          await page.waitForTimeout(50);
          const m = await page.evaluate(() => ({
            sw: document.documentElement.scrollWidth,
            cw: document.documentElement.clientWidth,
          }));
          samplesArr.push(m);
          perMode.maxScrollWidth = Math.max(perMode.maxScrollWidth, m.sw);
          if (m.sw > m.cw + 1) perMode.anyOverflow = true;
        }
      } catch (e) {
        hard = true;
        perMode.errors.push(String(e));
      } finally {
        await page.close();
      }
      perMode.samples.push(samplesArr);
      if (hard) report.hardError = true;
    }
    await ctx.close();
    report.results.push(perMode);
    if (perMode.anyOverflow || perMode.errors.length) report.hardError = true;
  }
}

await browser.close();
report.endedUtc = new Date().toISOString();
const outFile = path.join(outDir, 'motion-overflow-verified.json');
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ anyOverflow: report.results.some(r => r.anyOverflow), errors: report.results.flatMap(r=>r.errors), outFile, buildId, sourceHashes: recomputed }));
if (report.hardError) process.exit(1);
