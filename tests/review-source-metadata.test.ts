import assert from "node:assert/strict";
import test from "node:test";
import { pageBlueprintSchema } from "../src/lib/schemas/contracts";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReferenceComposedReviewPage } from "../src/components/landing/ReferenceComposedReviewPage";
import existingBlueprint from "../src/generated/landing-pages/moosend-email-marketing-automation.json";

test("review source links require HTTPS and review timestamps require ISO datetime", () => {
  const page = structuredClone(samplePageBlueprint);
  page.proof_blocks.push({ proof_type: "Official source", summary: "A sourced claim", source_reference_id: "3d6682a0-ad6e-4898-a956-cb86c7c00eb1", confidence_score: 0.9 });
  page.metadata.reviewed_at = "2026-10-13T06:44:16.000Z";
  page.proof_blocks[0].source_url = "https://webcatalog.io/en/pricing";
  assert.equal(pageBlueprintSchema.safeParse(page).success, true);
  for (const url of ["http://example.com", "javascript:alert(1)", "not-a-url"]) {
    page.proof_blocks[0].source_url = url;
    assert.equal(pageBlueprintSchema.safeParse(page).success, false);
  }
  page.proof_blocks[0].source_url = "https://webcatalog.io/en/pricing";
  page.metadata.reviewed_at = "13 October 2026";
  assert.equal(pageBlueprintSchema.safeParse(page).success, false);
});

test("existing blueprints need neither optional source URLs nor review timestamps", () => {
  const parsed = pageBlueprintSchema.parse(samplePageBlueprint);
  assert.equal(parsed.metadata.reviewed_at, undefined);
  assert.ok(parsed.proof_blocks.every((proof) => proof.source_url === undefined));
});

test("review metadata renders official links and date without changing legacy markup", () => {
  const page = pageBlueprintSchema.parse(existingBlueprint);
  page.metadata.motion_profile = "static";
  const render = () => renderToStaticMarkup(createElement(ReferenceComposedReviewPage, { blueprint: page }));
  const original = render();
  assert.doesNotMatch(original, /Read official source|Sources reviewed/);
  page.metadata.reviewed_at = "2026-10-13T06:44:16.000Z";
  page.proof_blocks[0].source_url = "https://webcatalog.io/en/pricing";
  const updated = render();
  assert.match(updated, /<time dateTime="2026-10-13T06:44:16.000Z">2026-10-13<\/time>/);
  assert.match(updated, /href="https:\/\/webcatalog.io\/en\/pricing" rel="noreferrer">Read official source/);
  assert.match(updated, /Confidence 95%/);
  delete page.metadata.reviewed_at;
  delete page.proof_blocks[0].source_url;
  assert.equal(render(), original);
});
