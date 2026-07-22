import type { Browser, Page } from "@playwright/test";
import sharp from "sharp";

import { ReferenceAuditFailure, type AuditedReferenceCapture, type ReferenceAuditAdapter } from "./audit";
import type { DesignReferenceViewportSnapshot } from "./classifier";

const desktopViewport = { width: 1440, height: 900 };
const mobileViewport = { width: 390, height: 844 };

function effectiveDomain(url: string) {
  const labels = new URL(url).hostname.toLowerCase().replace(/^www\./, "").split(".");
  return labels.slice(-2).join(".");
}

export function sameRegistrableDomain(originalUrl: string, resolvedUrl: string) {
  return effectiveDomain(originalUrl) === effectiveDomain(resolvedUrl);
}

export async function compressReferenceCapture(png: Buffer, viewport: { width: number; height: number }, maxBytes = 2_000_000) {
  for (const quality of [82, 72, 64]) {
    const webp = await sharp(png).webp({ quality }).toBuffer();
    const metadata = await sharp(webp).metadata();
    if (metadata.format !== "webp" || metadata.width !== viewport.width || metadata.height !== viewport.height) {
      throw new ReferenceAuditFailure("capture_invalid", `Captured image must remain an exact ${viewport.width}x${viewport.height} WebP.`);
    }
    if (webp.byteLength <= maxBytes) return webp;
  }
  throw new ReferenceAuditFailure("capture_invalid", "Unable to compress the reference capture below the 2 MB byte limit.");
}

async function waitForFonts(page: Page) {
  await page.evaluate(async () => {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => window.setTimeout(resolve, 3_000)),
    ]);
  });
}

export async function dismissPrivacyBanner(page: Page) {
  const patterns = [/reject all/i, /reject optional/i, /essential only/i, /necessary only/i, /decline all/i, /continue without accepting/i];
  for (const name of patterns) {
    const locator = page.getByRole("button", { name }).first();
    try {
      if (await locator.isVisible({ timeout: 250 })) {
        await locator.click({ timeout: 750 });
        await page.waitForTimeout(150);
        return true;
      }
    } catch { /* Absence or a detached consent control is not an audit failure. */ }
  }
  return false;
}

export async function measureReferencePage(page: Page, responseStatus: number): Promise<DesignReferenceViewportSnapshot> {
  await page.evaluate("globalThis.__name = globalThis.__name || ((target) => target);");
  return await page.evaluate((status) => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || 1) > 0;
    };
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height };
    };
    const h1 = [...document.querySelectorAll("h1")].find(visible) ?? null;
    const heading = h1 ? (() => {
      const style = getComputedStyle(h1);
      return {
        text: (h1.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 240),
        ...box(h1),
        font_family: style.fontFamily,
        font_size: Number.parseFloat(style.fontSize) || 0,
        font_weight: Number.parseInt(style.fontWeight, 10) || 400,
        text_align: style.textAlign,
      };
    })() : null;
    const bodyStyle = getComputedStyle(document.body);
    const media = [...document.querySelectorAll("img, video, canvas, picture")]
      .filter(visible)
      .map((element) => ({ tag: element.tagName.toLowerCase(), ...box(element) }))
      .filter((item) => item.width >= 120 && item.height >= 80)
      .sort((left, right) => left.y - right.y)
      .slice(0, 12);
    const ctas = [...document.querySelectorAll("a, button, [role='button']")]
      .filter(visible)
      .flatMap((element) => {
        const text = (element.textContent ?? "").trim().replace(/\s+/g, " ");
        const rect = box(element);
        const style = getComputedStyle(element);
        const className = typeof element.className === "string" ? element.className : "";
        const buttonLike = element.tagName === "BUTTON" || element.getAttribute("role") === "button" || /button|btn|cta/i.test(className) || style.backgroundColor !== "rgba(0, 0, 0, 0)";
        return text && text.length <= 80 && rect.height >= 32 && buttonLike ? [{ text, ...rect }] : [];
      })
      .sort((left, right) => left.y - right.y)
      .slice(0, 20);
    const sectionCandidates = [...document.querySelectorAll("main section, body > section, main > div")].filter(visible);
    const sections = sectionCandidates.flatMap((element) => {
      const rect = box(element);
      if (rect.height < 160) return [];
      const sectionHeading = [...element.querySelectorAll("h2, h3")].find(visible);
      if (!sectionHeading) return [];
      const headingText = (sectionHeading.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 180);
      const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 700);
      const children = [...element.children].filter(visible);
      const childX = new Set(children.map((child) => Math.round(child.getBoundingClientRect().x / 24) * 24));
      const style = getComputedStyle(element);
      const gridColumns = style.display === "grid" && style.gridTemplateColumns !== "none" ? style.gridTemplateColumns.split(" ").length : childX.size;
      return [{
        heading: headingText,
        text,
        y: rect.y,
        columns: Math.max(1, Math.min(gridColumns || 1, 6)),
        item_count: children.length,
        has_details: Boolean(element.querySelector("details")),
        has_cta: Boolean([...element.querySelectorAll("a, button, [role='button']")].find(visible)),
        text_align: getComputedStyle(sectionHeading).textAlign,
      }];
    }).sort((left, right) => left.y - right.y).slice(0, 20);
    const navigationElement = [...document.querySelectorAll("nav, header")].find(visible) ?? null;
    const navigation = navigationElement ? (() => {
      const rect = navigationElement.getBoundingClientRect();
      const lineTops = new Set([...navigationElement.querySelectorAll("a, button")].filter(visible).map((element) => Math.round(element.getBoundingClientRect().top / 8) * 8));
      return { height: rect.height, line_count: Math.max(1, lineTops.size) };
    })() : null;
    const animations = document.getAnimations().slice(0, 50).map((animation) => {
      const effect = animation.effect as KeyframeEffect | null;
      const timing = effect?.getTiming();
      const duration = typeof timing?.duration === "number" ? timing.duration : 0;
      const properties = [...new Set((effect?.getKeyframes() ?? []).flatMap((frame) => Object.keys(frame).filter((key) => !["offset", "easing", "composite", "computedOffset"].includes(key))))];
      return { duration_ms: duration, properties };
    });
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "";
    return {
      width: innerWidth,
      height: innerHeight,
      title: document.title,
      description,
      resolved_url: location.href,
      response_status: status,
      document_width: document.documentElement.scrollWidth,
      body_font_family: bodyStyle.fontFamily,
      body_font_size: Number.parseFloat(bodyStyle.fontSize) || 16,
      heading,
      media,
      ctas,
      sections,
      navigation,
      animations,
      visible_text_length: (document.body.innerText ?? "").trim().length,
    };
  }, responseStatus);
}

async function navigate(page: Page, sourceUrl: string, timeout: number) {
  const response = await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout });
  if (!response) throw new ReferenceAuditFailure("network_timeout", `No navigation response for ${sourceUrl}.`);
  await waitForFonts(page);
  await dismissPrivacyBanner(page);
  await page.waitForTimeout(350);
  const resolvedUrl = page.url();
  if (!sameRegistrableDomain(sourceUrl, resolvedUrl)) {
    throw new ReferenceAuditFailure("cross_domain_redirect", `Reference redirected outside its supplied site: ${resolvedUrl}`, resolvedUrl, response.status());
  }
  return response.status();
}

async function captureViewport(browser: Browser, sourceUrl: string, viewport: { width: number; height: number }, timeout: number) {
  const page = await browser.newPage({ viewport });
  try {
    const status = await navigate(page, sourceUrl, timeout);
    const snapshot = await measureReferencePage(page, status);
    const png = await page.screenshot({ type: "png" });
    const capture = await compressReferenceCapture(png, viewport);
    return { snapshot, capture };
  } finally { await page.close(); }
}

async function captureReducedMotion(browser: Browser, sourceUrl: string, timeout: number) {
  const context = await browser.newContext({ viewport: desktopViewport, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    const status = await navigate(page, sourceUrl, timeout);
    const snapshot = await measureReferencePage(page, status);
    return { animation_count: snapshot.animations.length, visible_text_length: snapshot.visible_text_length };
  } finally { await context.close(); }
}

export function createPlaywrightReferenceAuditAdapter(browser: Browser): ReferenceAuditAdapter {
  return {
    async audit(source, attempt): Promise<AuditedReferenceCapture> {
      const timeout = attempt === 1 ? 15_000 : 30_000;
      const desktop = await captureViewport(browser, source.source_url, desktopViewport, timeout);
      const mobile = await captureViewport(browser, source.source_url, mobileViewport, timeout);
      const reducedMotion = await captureReducedMotion(browser, source.source_url, timeout);
      return {
        desktop: desktop.snapshot,
        mobile: mobile.snapshot,
        reduced_motion: reducedMotion,
        desktop_capture: desktop.capture,
        mobile_capture: mobile.capture,
      };
    },
    close: async () => browser.close(),
  };
}
