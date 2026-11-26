import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MOTION_SITES_REVIEW_SOURCE, validateArticleVisualQualityReview, validateArticleVisualRuntime } from "../src/lib/article-import/article-visual-quality";
import { storeEvidence, storeEvidenceBytes } from "../src/lib/article-import/execution-evidence";
import { designRuntimeMaterial } from "../src/lib/article-import/workflow-evidence";

const digest = "a".repeat(64);
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
