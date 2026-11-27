import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = dirname(fileURLToPath(import.meta.url));
const packetRoot = join(root, "reviewer-packets");

async function state(page) {
  return page.evaluate(() => {
    const strip = document.querySelector("#strip");
    return {
      activeElement: document.activeElement?.id || document.activeElement?.tagName.toLowerCase(),
      scrollLeft: strip.scrollLeft,
      clientWidth: strip.clientWidth,
      scrollWidth: strip.scrollWidth,
    };
  });
}

async function capture(caseId, screenshots) {
  const output = join(packetRoot, caseId);
  const rawVideo = join(output, ".video");
  rmSync(rawVideo, { recursive: true, force: true });
  mkdirSync(rawVideo, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.REVIEW_BROWSER || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: rawVideo, size: { width: 390, height: 844 } } });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(output, "fixture.html")).href);
  await page.locator("#before").focus();
  await page.screenshot({ path: join(output, screenshots[0]) });
  const before = await state(page);
  const steps = [{ action: "Focus the control before the region", observation: before }];

  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  const focused = await state(page);
  steps.push({ action: "Press Tab once", observation: focused });
  if (screenshots.length === 3) await page.screenshot({ path: join(output, screenshots[1]) });

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1200);
  const after = await state(page);
  steps.push({ action: "Press ArrowRight", observation: after });
  await page.screenshot({ path: join(output, screenshots.at(-1)) });

  const video = page.video();
  await context.close();
  await browser.close();
  const videoPath = await video.path();
  copyFileSync(videoPath, join(output, "interaction.webm"));
  rmSync(rawVideo, { recursive: true, force: true });

  writeFileSync(join(output, "interaction.json"), `${JSON.stringify({
    schemaVersion: 1,
    caseId,
    investigatedRevision: "f026bca8b53aecca829262e9a27820ac6d078892",
    capturedAt: new Date().toISOString(),
    browser: { name: "Google Chrome", version: browserVersion },
    viewport: { width: 390, height: 844 },
    fixture: basename(join(output, "fixture.html")),
    steps,
    before,
    after,
  }, null, 2)}\n`);
}

await capture("case-meadow", ["01-before.png", "02-after.png"]);
await capture("case-quartz", ["01-before.png", "02-focused.png", "03-after.png"]);
