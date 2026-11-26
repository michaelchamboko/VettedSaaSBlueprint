import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as blogPageModule from "../src/app/blog/[slug]/page";
import { DecisionJourneyPage } from "../src/components/public/DecisionJourneyPage";
import { listDecisionSets } from "../src/lib/decision-journey/sets";
import { MOTION_SITES_REVIEW_SOURCE, captureArticleVisualRuntime, captureOffscreenArticleMedia, installArticleVisualProbe, pauseArticleVisualIntermediate, resumeArticleVisualIntermediate, validateArticleVisualQualityReview, validateArticleVisualRuntime } from "../src/lib/article-import/article-visual-quality";
import { storeEvidence, storeEvidenceBytes } from "../src/lib/article-import/execution-evidence";
import { designRuntimeMaterial } from "../src/lib/article-import/workflow-evidence";

const digest = "a".repeat(64);
const screenshotRef = { path: "evidence/browser.png", sha256: digest };

const browserFixture = `<!doctype html>
<html><head><style>
  * { box-sizing: border-box; }
  body { margin: 0; }
  main { width: 100%; }
  .blog-article__hero { display: grid; grid-template-columns: 1.1fr .9fr; min-height: 44rem; }
  .blog-article__intro { padding: 4rem; }
  .blog-article__intro h1 { margin: 0 0 1.5rem; font: 400 96px/.86 Georgia, serif; }
  .blog-article__question { max-width: 44rem; margin: 0; font: 400 30px/1.5 Georgia, serif; }
  [data-reviewed-article-hero] { display: block; width: 100%; height: 600px; animation: hero-in 500ms linear both; }
  [data-reviewed-article-hero] img { display: block; width: 100%; height: 100%; }
  @keyframes hero-in { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  @media (prefers-reduced-motion: reduce) { [data-reviewed-article-hero] { animation: none; opacity: 1; transform: none; } }
</style><script defer src="/delayed.js"></script></head><body>
<main><article class="blog-article"><header class="blog-article__hero">
  <div class="blog-article__intro"><p class="eyebrow">Field guide</p><h1>Choose the workflow that your team can operate</h1><p class="blog-article__question">Can this workflow fit?</p></div>
  <figure><span data-reviewed-article-hero><img alt="Workflow evidence" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23d8cdbd'/%3E%3C/svg%3E"></span></figure>
</header></article></main></body></html>`;

async function routeBrowserFixture(page: import("playwright").Page, delayMs: number, html = browserFixture) {
  await page.route("https://article.test/**", async (route) => {
    if (route.request().resourceType() === "image") {
      await route.fulfill({ status: 200, contentType: "image/svg+xml", body: "<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='1000'><rect width='1600' height='1000' fill='#d8cdbd'/></svg>" });
      return;
    }
    if (route.request().url().endsWith("/delayed.js")) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.fulfill({ status: 200, contentType: "text/javascript", body: "window.delayedScriptLoaded = true;" });
      return;
    }
    await route.fulfill({ status: 200, contentType: "text/html", body: html });
  });
}

async function actualBlogFixture() {
  const interop = blogPageModule.default as unknown as { default?: typeof blogPageModule.default };
  const renderPage = interop.default ?? blogPageModule.default;
  const tree = await renderPage({ params: Promise.resolve({ slug: "production-ready-ai-voice-cloning-checklist" }) });
  const markup = renderToStaticMarkup(tree).replace(
    'class="blog-article__hero-media"',
    'class="blog-article__hero-media reviewed-article-hero-frame" data-reviewed-article-hero',
  );
  assert.match(markup, /class="blog-article__question"/);
  assert.match(markup, /data-reviewed-article-hero/);
  const css = (await readFile(path.resolve("src/app/globals.css"), "utf8")).replace('@import "tailwindcss";', "");
  return `<!doctype html><html><head><style>${css}</style></head><body>${markup}</body></html>`;
}

async function actualDecisionFixture() {
  const records = listDecisionSets().flatMap((set) => [set.pages.decisionHub, set.pages.solutionHub, set.pages.scenario]);
  const record = records.toSorted((left, right) => right.headline.length - left.headline.length)[0]!;
  const markup = renderToStaticMarkup(createElement(DecisionJourneyPage, { record, reviewedHero: {
    publicPath: "/images/decision-set-test-hero.webp", width: 1600, height: 900,
    alt: "A reviewed decision workspace showing evidence and account controls.",
  } }));
  assert.match(markup, /data-reviewed-article-hero/);
  const css = (await readFile(path.resolve("src/app/globals.css"), "utf8")).replace('@import "tailwindcss";', "");
  return { html: `<!doctype html><html><head><style>${css}</style></head><body>${markup}</body></html>`, record };
}

function launchChromium() {
  const channel = process.env.ARTICLE_VISUAL_TEST_BROWSER_CHANNEL;
  return chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
}
const baseRuntime = {
  schemaVersion: "ArticleVisualRuntimeV1" as const,
  format: "blog" as const,
  route: "/blog/dext-reference",
  screenshots: { early: { path: "evidence/desktop-early.png", sha256: digest }, settled: { path: "evidence/desktop.png", sha256: digest } },
  viewport: { width: 1440, height: 900, reducedMotion: false },
  rects: {
    main: { x: 120, y: 80, width: 1200, height: 1800 },
    primaryHeading: { x: 180, y: 120, width: 760, height: 160 },
    bodyCopy: [{ x: 180, y: 340, width: 680, height: 120 }],
    primaryMedia: { x: 920, y: 100, width: 360, height: 420 },
  },
  typography: {
    heading: { fontFamily: "Editorial Display", fontSize: "72px", fontWeight: "650", lineHeight: "68px", letterSpacing: "-2px" },
    body: { fontFamily: "Editorial Sans", fontSize: "18px", fontWeight: "400", lineHeight: "29px", letterSpacing: "normal" },
  },
  layout: { documentHeight: 2100, scrollWidth: 1440, visibleTextCharacters: 720, horizontalOverflow: false },
  assertions: { headingVisible: true as const, bodyCopyVisible: true as const, mediaVisible: true as const, mediaDecoded: true as const, motionPreferenceConfirmed: true as const },
  motion: {
    effects: [{
      target: "[data-reviewed-article-hero]",
      purpose: "Introduce the reviewed media as the article's authored focal moment.",
      properties: ["opacity"],
      samples: [
        { elapsedMs: 0, values: { opacity: "0.99" } },
        { elapsedMs: 140, values: { opacity: "0.995" } },
        { elapsedMs: 900, values: { opacity: "1" } },
      ],
    }],
  },
};

const passObservation = (detail: string) => ({ verdict: "pass" as const, observations: [
  `${detail}; desktop screenshot and recorded rectangles establish the exact location.`,
  `${detail}; mobile evidence confirms the reading order remains deliberate and usable.`,
] });

function review(format: "direct-review" | "blog" | "visibility" | "decision-set", routes = [`/${format}/dext-reference`]) {
  return {
    schemaVersion: "ArticleVisualQualityReviewV1" as const,
    format,
    artifactFingerprint: digest,
    routes,
    source: MOTION_SITES_REVIEW_SOURCE,
    verdict: "pass" as const,
    checks: {
      firstGlance: passObservation("The heading at y=120 and integrated media at x=920 establish one immediate focal group"),
      whitespaceAndDensity: passObservation("Measured group separation distinguishes the lead from the readable 680px copy column without an empty void"),
      typographicHierarchy: passObservation("The 72px display heading and 18px body role remain visibly distinct with calm paragraph leading"),
      mediaIntegration: passObservation("The primary media rectangle shares the opening composition and is deliberately cropped beside the lead"),
      purposefulMotion: passObservation("Early, intermediate, and settled opacity samples change while the content remains available throughout"),
      responsiveAdaptation: passObservation("The mobile screenshot reflows the media and copy while retaining the heading-first reading order"),
      reducedMotion: passObservation("The reduced-motion capture preserves the complete hierarchy and meaning without compulsory spatial movement"),
    },
    findings: [],
  };
}

test("rejects the former Dext-style first-viewport void from actual heading geometry", () => {
  assert.throws(() => validateArticleVisualRuntime({ ...baseRuntime, rects: { ...baseRuntime.rects, primaryHeading: { ...baseRuntime.rects.primaryHeading, y: 980 } } }), /ARTICLE_VISUAL_PRIMARY_CONTENT_NOT_VISIBLE/);
});

test("rejects dense copy and weak hierarchy when the scoped screenshot review fails", () => {
  const value = review("blog");
  value.verdict = "fail" as "pass";
  value.checks.whitespaceAndDensity = { verdict: "fail", observations: [
    "The desktop screenshot shows six uninterrupted paragraphs compressed into the opening viewport without group separation.",
    "The mobile screenshot compounds the copy wall: body blocks touch the heading and media with no generous interval.",
  ] } as typeof value.checks.whitespaceAndDensity;
  assert.throws(() => validateArticleVisualQualityReview(value, { format: "blog", artifactFingerprint: digest, routes: value.routes }), /ARTICLE_VISUAL_QUALITY_GATE_FAILED/);
});

test("fails normal-motion validation when no sampled property change exists", () => {
  assert.throws(() => validateArticleVisualRuntime({ ...baseRuntime, motion: { effects: [] } }), /ARTICLE_VISUAL_MOTION_EVIDENCE_INSUFFICIENT/);
  const endpointsOnly = {...baseRuntime.motion.effects[0],samples:[
    {elapsedMs:0,values:{opacity:"0"}},
    {elapsedMs:140,values:{opacity:"0"}},
    {elapsedMs:900,values:{opacity:"1"}},
  ]};
  assert.throws(() => validateArticleVisualRuntime({...baseRuntime,motion:{effects:[endpointsOnly]}}),/ARTICLE_VISUAL_MOTION_EVIDENCE_INSUFFICIENT/);
});

test("finds a real intermediate when hydration starts after the first sampled frames", () => {
  const lateStart = {...baseRuntime.motion.effects[0],samples:[
    {elapsedMs:8,values:{opacity:"1"}},
    {elapsedMs:24,values:{opacity:"1"}},
    {elapsedMs:180,values:{opacity:"0.4"}},
    {elapsedMs:420,values:{opacity:"0.8"}},
    {elapsedMs:980,values:{opacity:"1"}},
  ]};
  assert.doesNotThrow(() => validateArticleVisualRuntime({...baseRuntime,motion:{effects:[lateStart]}}));
});

test("accepts restrained useful motion and an intentional static reduced-motion alternative", () => {
  assert.doesNotThrow(() => validateArticleVisualRuntime(baseRuntime));
  assert.doesNotThrow(() => validateArticleVisualRuntime({
    ...baseRuntime,
    viewport: { ...baseRuntime.viewport, reducedMotion: true },
    motion: { effects: [{...baseRuntime.motion.effects[0],samples:baseRuntime.motion.effects[0].samples.map((sample) => ({...sample,values:{opacity:"1"}}))}], reducedAlternative: "static" },
  }));
});

test("off-screen media is allowed only for a retained, below-fold mobile decision-set capture", () => {
  const offscreen = {
    ...baseRuntime,
    format: "decision-set" as const,
    viewport: { ...baseRuntime.viewport, width: 390, height: 844 },
    layout: { ...baseRuntime.layout, scrollWidth: 390 },
    rects: { ...baseRuntime.rects, primaryMedia: { ...baseRuntime.rects.primaryMedia, y: 900 } },
    assertions: { ...baseRuntime.assertions, mediaVisible: false },
  };
  assert.throws(() => validateArticleVisualRuntime(offscreen), /ARTICLE_VISUAL_MEDIA_EVIDENCE_INSUFFICIENT/);
  assert.doesNotThrow(() => validateArticleVisualRuntime({ ...offscreen, screenshots: { ...offscreen.screenshots, media: screenshotRef } }));
  assert.throws(() => validateArticleVisualRuntime({ ...offscreen, format: "blog", screenshots: { ...offscreen.screenshots, media: screenshotRef } }), /ARTICLE_VISUAL_MEDIA_EVIDENCE_INSUFFICIENT/);
});

test("real Chromium selects the actual 1440px blog question as semantic lead copy", async (t) => {
  const browser = await launchChromium();
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await routeBrowserFixture(page, 0, await actualBlogFixture());
  await installArticleVisualProbe(page);
  await page.goto("https://article.test/", { waitUntil: "domcontentloaded" });
  assert.equal(await pauseArticleVisualIntermediate(page), true);
  await resumeArticleVisualIntermediate(page);
  await page.waitForTimeout(650);
  const runtime = await captureArticleVisualRuntime(page, { format: "blog", route: "/blog/fixture", viewport: { width: 1440, height: 900, reducedMotion: false }, screenshots: { early: screenshotRef, settled: screenshotRef } });
  assert(Number.parseFloat(runtime.typography.body!.fontSize) > 24);
  assert.equal(runtime.rects.bodyCopy.length, 1);
  assert.deepEqual(runtime.rects.bodyCopy[0], await page.locator(".blog-article__question").boundingBox());
});

test("real Chromium preserves delayed normal motion through resumed and settled samples while reduced motion stays static", async (t) => {
  const browser = await launchChromium();
  t.after(() => browser.close());

  const normal = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  await routeBrowserFixture(normal, 1650);
  await installArticleVisualProbe(normal);
  const startedAt = Date.now();
  await normal.goto("https://article.test/", { waitUntil: "domcontentloaded" });
  assert(Date.now() - startedAt >= 1500, "fixture must outlast the former 1400ms probe budget");
  assert.equal(await normal.evaluate(() => (window as Window & { delayedScriptLoaded?: boolean }).delayedScriptLoaded), true);
  assert.equal(await pauseArticleVisualIntermediate(normal), true);
  await resumeArticleVisualIntermediate(normal);
  await normal.waitForTimeout(650);
  const normalRuntime = await captureArticleVisualRuntime(normal, { format: "blog", route: "/blog/delayed", viewport: { width: 1440, height: 900, reducedMotion: false }, screenshots: { early: screenshotRef, settled: screenshotRef } });
  const normalSamples = normalRuntime.motion.effects[0].samples;
  assert(normalSamples.at(-1)!.elapsedMs > 2000, "sampling must continue through the resumed settled state");
  assert.equal(normalSamples.at(-1)!.values.opacity, "1");
  assert(normalSamples.some((sample) => Number(sample.values.opacity) > 0 && Number(sample.values.opacity) < 1));

  const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await routeBrowserFixture(reduced, 1650);
  await installArticleVisualProbe(reduced);
  await reduced.goto("https://article.test/", { waitUntil: "domcontentloaded" });
  await reduced.waitForTimeout(100);
  const reducedRuntime = await captureArticleVisualRuntime(reduced, { format: "blog", route: "/blog/delayed", viewport: { width: 1440, height: 900, reducedMotion: true }, screenshots: { early: screenshotRef, settled: screenshotRef } });
  assert.equal(reducedRuntime.motion.reducedAlternative, "static");
  assert.deepEqual(new Set(reducedRuntime.motion.effects[0].samples.map((sample) => sample.values.opacity)), new Set(["1"]));
});

test("real Chromium retains the actual stacked mobile decision hero without weakening initial readability", async (t) => {
  const browser = await launchChromium();
  t.after(() => browser.close());
  const fixture = await actualDecisionFixture();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" });
  await routeBrowserFixture(page, 0, fixture.html);
  await installArticleVisualProbe(page);
  await page.goto("https://article.test/", { waitUntil: "domcontentloaded" });
  assert.equal(await pauseArticleVisualIntermediate(page), true);
  const initial = await page.evaluate(() => {
    const heading = document.querySelector("main h1")!.getBoundingClientRect().toJSON();
    const lead = document.querySelector(".decision-journey__hero-copy h1 + p")!.getBoundingClientRect().toJSON();
    const media = document.querySelector("[data-reviewed-article-hero]")!.getBoundingClientRect().toJSON();
    return { heading, lead, media, scrollY };
  });
  assert(initial.heading.top < 844 && initial.heading.bottom > 0);
  assert(initial.lead.top < 844 && initial.lead.bottom > 0);
  assert(initial.media.top >= 844, "the real stacked mobile hero must begin below the initial viewport");
  await resumeArticleVisualIntermediate(page);
  await page.waitForTimeout(850);
  const mediaBytes = await captureOffscreenArticleMedia(page);
  assert(mediaBytes && mediaBytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")));
  assert.equal(await page.evaluate(() => scrollY), initial.scrollY);
  const media = { path: "evidence/mobile-decision-media.png", sha256: createHash("sha256").update(mediaBytes).digest("hex") };
  const runtime = await captureArticleVisualRuntime(page, { format: "decision-set", route: fixture.record.canonicalPath, viewport: { width: 390, height: 844, reducedMotion: false }, screenshots: { early: screenshotRef, settled: screenshotRef, media } });
  assert.equal(runtime.assertions.headingVisible, true);
  assert.equal(runtime.assertions.bodyCopyVisible, true);
  assert.equal(runtime.assertions.mediaVisible, false);
  assert.deepEqual(runtime.screenshots.media, media);
});

test("binds a substantive visual-quality review for every supported article format", () => {
  for (const format of ["direct-review", "blog", "visibility", "decision-set"] as const) {
    const value = review(format);
    assert.equal(validateArticleVisualQualityReview(value, { format, artifactFingerprint: digest, routes: value.routes }).format, format);
  }
});

test("rejects long but generic pass observations that do not identify retained evidence", () => {
  const value = review("blog");
  value.checks.firstGlance.observations = ["Everything looks polished and professional enough to pass this review without any further work.","The overall result feels intentional and suitable for this brand in every important respect."];
  assert.throws(() => validateArticleVisualQualityReview(value,{format:"blog",artifactFingerprint:digest,routes:value.routes}),/ARTICLE_VISUAL_REVIEW_OBSERVATION_INSUFFICIENT/);
});

test("replays pre-hero V2 observations exactly while V3 rejects missing geometry", async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),"article-visual-v2-"));
  const importId="article-11111111-1111-4111-8111-111111111111";
  const artifactRef=await storeEvidence(root,importId,{artifact:"historical-v2"});
  const renderRef=await storeEvidence(root,importId,{rendering:"historical-v2"});
  const routes=["/historical-v2"];
  const observations:Record<string,{path:string;sha256:string}>={};
  const expected=[];
  for(const rule of ["desktop","mobile","reduced-motion"] as const){
    const viewport={width:rule==="mobile"?390:1440,height:rule==="mobile"?844:900,reducedMotion:rule==="reduced-motion"};
    const screenshot=await storeEvidenceBytes(root,importId,Buffer.from(`\x89PNG historical ${rule}`),"png");
    const checks={rendered:true};
    const ref=await storeEvidence(root,importId,{schemaVersion:"ExecutionEvidenceV1",kind:"browser",toolVersion:"historical-v2",startedAt:"2026-11-01T00:00:00.000Z",completedAt:"2026-11-01T00:00:01.000Z",inputRefs:[artifactRef,renderRef],outputRefs:[],target:"http://127.0.0.1:3000",routes,viewport,checks,screenshots:[screenshot]});
    observations[rule]=ref;
    expected.push({rule,ref,routes,viewport,checks,screenshots:[screenshot]});
  }
  const legacy=await designRuntimeMaterial(root,importId,artifactRef,renderRef,routes,observations as never,"legacy-v2");
  assert.equal(legacy.browserObservations,JSON.stringify(expected));
  assert.deepEqual(legacy.images,expected.flatMap((item)=>item.screenshots));
  await assert.rejects(designRuntimeMaterial(root,importId,artifactRef,renderRef,routes,observations as never,"current-v3"),/ARTICLE_VISUAL_RUNTIME_EVIDENCE_REQUIRED/);
});

test("current decision-set runtime retains off-screen media for review within the 24-image attachment limit", async () => {
  const root=await mkdtemp(path.join(os.tmpdir(),"article-visual-media-"));
  const importId="article-22222222-2222-4222-8222-222222222222";
  const artifactRef=await storeEvidence(root,importId,{artifact:"decision-set"});
  const renderRef=await storeEvidence(root,importId,{rendering:"decision-set"});
  const routes=["/decision-hub/example","/solution-hub/example","/scenarios/example"];
  const observations:Record<string,{path:string;sha256:string}>={};
  const retainedMedia=[];
  for(const rule of ["desktop","mobile","reduced-motion"] as const){
    const viewport={width:rule==="mobile"?390:1440,height:rule==="mobile"?844:900,reducedMotion:rule==="reduced-motion"};
    const screenshots=[], outputRefs=[];
    for(const [index,route] of routes.entries()){
      const early=await storeEvidenceBytes(root,importId,Buffer.from(`early ${rule} ${index}`),"png");
      const settled=await storeEvidenceBytes(root,importId,Buffer.from(`settled ${rule} ${index}`),"png");
      const media=rule==="mobile" ? await storeEvidenceBytes(root,importId,Buffer.from(`media ${rule} ${index}`),"png") : undefined;
      if(media)retainedMedia.push(media);
      const runtime=validateArticleVisualRuntime({...baseRuntime,format:"decision-set",route,viewport,
        screenshots:{early,settled,...(media?{media}:{})},layout:{...baseRuntime.layout,scrollWidth:viewport.width},
        rects:{...baseRuntime.rects,primaryMedia:{...baseRuntime.rects.primaryMedia,y:media?900:100}},
        assertions:{...baseRuntime.assertions,mediaVisible:!media},
        motion:viewport.reducedMotion?{effects:[{...baseRuntime.motion.effects[0],samples:baseRuntime.motion.effects[0].samples.map((sample)=>({...sample,values:{opacity:"1"}}))}],reducedAlternative:"static"}:baseRuntime.motion});
      outputRefs.push(await storeEvidence(root,importId,runtime));
      screenshots.push(settled);
    }
    observations[rule]=await storeEvidence(root,importId,{schemaVersion:"ExecutionEvidenceV1",kind:"browser",toolVersion:"chromium",startedAt:"2026-11-26T00:00:00.000Z",completedAt:"2026-11-26T00:00:01.000Z",inputRefs:[artifactRef,renderRef],outputRefs,target:"http://127.0.0.1:3000",routes,viewport,checks:{rendered:true},screenshots});
  }
  const material=await designRuntimeMaterial(root,importId,artifactRef,renderRef,routes,observations as never,"current-v3");
  assert.equal(material.images.length,21);
  assert(material.images.length<=24);
  assert(retainedMedia.every((media)=>material.images.some((image)=>image.path===media.path&&image.sha256===media.sha256)));
  assert.match(material.browserObservations,/"media":/);
});
