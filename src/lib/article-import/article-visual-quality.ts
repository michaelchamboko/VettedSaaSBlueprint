import { z } from "zod";
import type { Page } from "playwright";
import { evidenceRefSchema, type EvidenceRef } from "./execution-evidence";

export const MOTION_SITES_REVIEW_SOURCE = {
  repository: "https://github.com/michaelchamboko/motion-sites.git",
  revision: "faa30d512e3973e58675c72101a7ef42ed37ae83",
  path: "plugins/motionsites-web-builder/skills/motionsites-web-builder/references/review.md",
  license: "MIT",
} as const;

export const ARTICLE_VISUAL_QUALITY_INSTRUCTIONS = [
  ".agents/skills/design-taste-frontend/SKILL.md",
  ".agents/skills/impeccable/reference/layout.md",
  ".agents/skills/impeccable/reference/typeset.md",
  ".agents/skills/impeccable/reference/animate.md",
  ".agents/skills/impeccable/reference/craft-floor.md",
  ".agents/skills/external-article-import/references/article-visual-quality.md",
  ".agents/skills/external-article-import/references/design-judgment.md",
] as const;

const nonempty = z.string().trim().min(1);
const rectSchema = z.object({ x: z.number(), y: z.number(), width: z.number().nonnegative(), height: z.number().nonnegative() }).strict();
const styleSchema = z.object({ fontFamily: nonempty, fontSize: nonempty, fontWeight: nonempty, lineHeight: nonempty, letterSpacing: nonempty }).strict();
const sampleSchema = z.object({ elapsedMs: z.number().int().nonnegative(), values: z.record(nonempty, z.string()) }).strict();
const effectSchema = z.object({
  target: nonempty,
  purpose: z.string().trim().min(16),
  properties: z.array(nonempty).min(1),
  samples: z.array(sampleSchema).min(3).max(180),
}).strict();

export const articleVisualRuntimeSchema = z.object({
  schemaVersion: z.literal("ArticleVisualRuntimeV1"),
  format: z.enum(["direct-review", "blog", "visibility", "decision-set"]),
  route: z.string().startsWith("/"),
  screenshots: z.object({ early: evidenceRefSchema, settled: evidenceRefSchema }).strict(),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), reducedMotion: z.boolean() }).strict(),
  rects: z.object({ main: rectSchema, primaryHeading: rectSchema, bodyCopy: z.array(rectSchema).min(1), primaryMedia: rectSchema }).strict(),
  typography: z.object({ heading: styleSchema, body: styleSchema.optional() }).strict(),
  layout: z.object({ documentHeight: z.number().positive(), scrollWidth: z.number().positive(), visibleTextCharacters: z.number().int().nonnegative(), horizontalOverflow: z.boolean() }).strict(),
  assertions: z.object({ headingVisible: z.literal(true), bodyCopyVisible: z.literal(true), mediaVisible: z.literal(true), mediaDecoded: z.literal(true), motionPreferenceConfirmed: z.literal(true) }).strict(),
  motion: z.object({
    effects: z.array(effectSchema),
    reducedAlternative: z.enum(["static", "gentler", "semantic-only"]).optional(),
  }).strict(),
}).strict();
export type ArticleVisualRuntime = z.infer<typeof articleVisualRuntimeSchema>;

const judgment = z.object({
  verdict: z.enum(["pass", "fail", "insufficient-evidence"]),
  observations: z.array(z.string().trim().min(24)).min(2),
}).strict();

export const articleVisualQualityReviewSchema = z.object({
  schemaVersion: z.literal("ArticleVisualQualityReviewV1"),
  format: z.enum(["direct-review", "blog", "visibility", "decision-set"]),
  artifactFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  routes: z.array(z.string().startsWith("/")).min(1),
  source: z.object({
    repository: z.literal(MOTION_SITES_REVIEW_SOURCE.repository),
    revision: z.literal(MOTION_SITES_REVIEW_SOURCE.revision),
    path: z.literal(MOTION_SITES_REVIEW_SOURCE.path),
    license: z.literal(MOTION_SITES_REVIEW_SOURCE.license),
  }).strict(),
  verdict: z.enum(["pass", "fail", "insufficient-evidence"]),
  checks: z.object({
    firstGlance: judgment,
    whitespaceAndDensity: judgment,
    typographicHierarchy: judgment,
    mediaIntegration: judgment,
    purposefulMotion: judgment,
    responsiveAdaptation: judgment,
    reducedMotion: judgment,
  }).strict(),
  findings: z.array(z.object({ description: nonempty, disposition: z.enum(["resolved", "unresolved"]) }).strict()),
}).strict();
export type ArticleVisualQualityReview = z.infer<typeof articleVisualQualityReviewSchema>;

function hasChangedDeclaredProperty(effect: z.infer<typeof effectSchema>): boolean {
  return effect.properties.some((property) => {
    const values = effect.samples.map((sample) => sample.values[property]);
    if (!values.every((value) => value !== undefined)) return false;
    const first = values[0], settled = values.at(-1);
    return values.slice(1,-1).some((value) => value !== first && value !== settled);
  });
}

export function validateArticleVisualRuntime(value: unknown): ArticleVisualRuntime {
  const runtime = articleVisualRuntimeSchema.parse(value);
  const { viewport, rects, layout, motion } = runtime;
  if (runtime.screenshots.early.sha256.length !== 64 || runtime.screenshots.settled.sha256.length !== 64 || layout.horizontalOverflow || layout.scrollWidth > viewport.width + 1) throw new Error("ARTICLE_VISUAL_LAYOUT_INVALID");
  if (rects.primaryHeading.width <= 0 || rects.primaryHeading.height <= 0 || rects.primaryHeading.y >= viewport.height || rects.main.width <= 0) throw new Error("ARTICLE_VISUAL_PRIMARY_CONTENT_NOT_VISIBLE");
  if (layout.visibleTextCharacters < 40) throw new Error("ARTICLE_VISUAL_CONTENT_INSUFFICIENT");
  if (!viewport.reducedMotion) {
    if (!motion.effects.length || !motion.effects.some(hasChangedDeclaredProperty)) throw new Error("ARTICLE_VISUAL_MOTION_EVIDENCE_INSUFFICIENT");
  } else if (!motion.reducedAlternative || !motion.effects.length) {
    throw new Error("ARTICLE_VISUAL_REDUCED_MOTION_EVIDENCE_INSUFFICIENT");
  }
  return runtime;
}

export function validateArticleVisualQualityReview(value: unknown, expected: { format: ArticleVisualQualityReview["format"]; artifactFingerprint: string; routes: string[] }): ArticleVisualQualityReview {
  const review = articleVisualQualityReviewSchema.parse(value);
  if (review.format !== expected.format || review.artifactFingerprint !== expected.artifactFingerprint || JSON.stringify(review.routes) !== JSON.stringify(expected.routes)) throw new Error("ARTICLE_VISUAL_REVIEW_BINDING_MISMATCH");
  const observations = Object.values(review.checks).flatMap((check) => check.observations);
  if (observations.some((observation) => observation.split(/\s+/).length < 6 || !/(?:\d|px|viewport|rectangle|screenshot|frame|font|heading|body|media|transform|opacity|clip|spacing|line-height|desktop|mobile|capture|computed|observed)/i.test(observation))) throw new Error("ARTICLE_VISUAL_REVIEW_OBSERVATION_INSUFFICIENT");
  if (review.verdict !== "pass" || Object.values(review.checks).some((check) => check.verdict !== "pass") || review.findings.some((finding) => finding.disposition !== "resolved")) throw new Error("ARTICLE_VISUAL_QUALITY_GATE_FAILED");
  return review;
}

const sampleProperties = ["transform", "opacity", "clipPath", "filter", "backgroundColor", "boxShadow"] as const;
type BrowserVisualFacts = {
  rects: unknown;
  typography: unknown;
  layout: unknown;
  assertions: { headingVisible: boolean; bodyCopyVisible: boolean; mediaVisible: boolean; mediaDecoded: boolean; motionPreferenceConfirmed: boolean };
  frames: Array<{ elapsedMs: number; values: Record<string,string> }>;
};

export async function installArticleVisualProbe(page: Page): Promise<void> {
  await page.addInitScript({content:`(() => {
    const properties = ${JSON.stringify(sampleProperties)};
    const startedAt = performance.now();
    const frames = [];
    Object.defineProperty(window,"__articleVisualStartedAt",{value:startedAt,writable:false,configurable:false});
    Object.defineProperty(window,"__articleVisualFrames",{value:frames,writable:false,configurable:false});
    const record = () => {
      const element = document.querySelector("[data-reviewed-article-hero]");
      if (element) {
        const style = getComputedStyle(element);
        frames.push({elapsedMs:Math.round(performance.now()-startedAt),values:Object.fromEntries(properties.map((property) => [property,style[property]]))});
      }
      if (performance.now()-startedAt < 1400) requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  })()`});
}

/** Pause the page's real in-flight hero animation for an honest early screenshot. */
export async function pauseArticleVisualIntermediate(page: Page): Promise<boolean> {
  for (let attempt=0;attempt<30;attempt++) {
    const paused = await page.evaluate(`(() => {
      const element=document.querySelector("[data-reviewed-article-hero]");
      if(!element)return false;
      const active=element.getAnimations({subtree:true}).filter((animation)=>{
        const progress=animation.effect?.getComputedTiming().progress;
        return animation.playState==="running"&&typeof progress==="number"&&progress>0.02&&progress<0.98;
      });
      if(!active.length)return false;
      for(const animation of active)animation.pause();
      window.__articleVisualPausedAnimations=active;
      return true;
    })()`);
    if (paused) return true;
    await page.waitForTimeout(50);
  }
  return false;
}

export async function resumeArticleVisualIntermediate(page: Page): Promise<void> {
  await page.evaluate(`(() => {
    for(const animation of window.__articleVisualPausedAnimations??[])animation.play();
    delete window.__articleVisualPausedAnimations;
  })()`);
}

export async function captureArticleVisualRuntime(page: Page, input: { format: ArticleVisualRuntime["format"]; route: string; viewport: ArticleVisualRuntime["viewport"]; screenshots: { early: EvidenceRef; settled: EvidenceRef } }): Promise<ArticleVisualRuntime> {
  for(let attempt=0;attempt<3;attempt++){
    const count=await page.evaluate(`(() => {
      const frames=window.__articleVisualFrames??[];
      if(frames.length>=3)return frames.length;
      const element=document.querySelector("[data-reviewed-article-hero]");
      if(!element)return frames.length;
      const properties=${JSON.stringify(sampleProperties)};
      const style=getComputedStyle(element);
      frames.push({elapsedMs:Math.round(performance.now()-(window.__articleVisualStartedAt??0)),values:Object.fromEntries(properties.map((property)=>[property,style[property]]))});
      return frames.length;
    })()`) as number;
    if(count>=3)break;
    await page.waitForTimeout(50);
  }
  const facts = await page.evaluate(`(() => {
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : undefined;
    };
    const typography = (element) => {
      if (!element) return undefined;
      const style = getComputedStyle(element);
      return { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing };
    };
    const main = document.querySelector("main");
    const heading = main?.querySelector("h1") ?? null;
    const bodyCopy = [...(main?.querySelectorAll("article p, [data-article-body] p, .prose p, p") ?? [])].filter((element) => {
      const text = (element.textContent ?? "").replace(/\s+/g," ").trim();
      const style = getComputedStyle(element);
      return text.length >= 40 && !element.closest("[data-eyebrow],.eyebrow,.kicker") && Number.parseFloat(style.fontSize) <= 24 && style.display !== "none" && style.visibility !== "hidden";
    }).slice(0,6);
    const media = document.querySelector("[data-reviewed-article-hero]");
    const mediaElement = media?.matches("img,video") ? media : media?.querySelector("img,video");
    const mediaDecoded = mediaElement instanceof HTMLImageElement ? mediaElement.complete && mediaElement.naturalWidth > 0 : mediaElement instanceof HTMLVideoElement ? mediaElement.readyState >= 2 : false;
    const visible = (element) => { const value = element?.getBoundingClientRect(); return Boolean(value && value.width > 0 && value.height > 0 && value.bottom > 0 && value.top < innerHeight); };
    const visibleTextCharacters = (main?.textContent ?? "").replace(/\s+/g, " ").trim().length;
    const frames = window.__articleVisualFrames ?? [];
    return { rects: { main: rect(main), primaryHeading: rect(heading), bodyCopy: bodyCopy.map(rect), primaryMedia: rect(media) }, typography: { heading: typography(heading), body: typography(bodyCopy[0] ?? null) }, layout: { documentHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, visibleTextCharacters, horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 }, assertions:{headingVisible:visible(heading),bodyCopyVisible:bodyCopy.some(visible),mediaVisible:visible(media),mediaDecoded,motionPreferenceConfirmed:matchMedia("(prefers-reduced-motion: reduce)").matches === false}, frames };
  })()`) as BrowserVisualFacts;
  facts.assertions.motionPreferenceConfirmed = facts.assertions.motionPreferenceConfirmed === !input.viewport.reducedMotion;
  // Keep the measured sequence. Picking the collection midpoint can miss a
  // late hydration start or an effect that settles early.
  const frames = facts.frames.slice(0,180);
  const effect = { target:"[data-reviewed-article-hero]",purpose:"Introduce the reviewed article media as the authored focal moment without delaying access to the article.",properties:[...sampleProperties],samples:frames };
  const spatialChanged = ["transform","clipPath","filter"].some((property) => new Set(frames.map((frame) => frame.values[property])).size > 1);
  const anyChanged = sampleProperties.some((property) => new Set(frames.map((frame) => frame.values[property])).size > 1);
  const motion = input.viewport.reducedMotion ? {effects:frames.length >= 3 ? [effect] : [],reducedAlternative:spatialChanged ? "gentler" as const : anyChanged ? "semantic-only" as const : "static" as const} : {effects:frames.length >= 3 ? [effect] : []};
  return validateArticleVisualRuntime({ schemaVersion:"ArticleVisualRuntimeV1",format:input.format,route:input.route,screenshots:input.screenshots,viewport:input.viewport,rects:facts.rects,typography:facts.typography,layout:facts.layout,assertions:facts.assertions,motion });
}
