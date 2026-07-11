import assert from "node:assert/strict";
import test from "node:test";

import { buildLandingStaticReport } from "../scripts/scan-landing-static.mjs";

const legacyOnlyContext = {
  rows: [{ file: "legacy.json", data: { metadata: { design_profile: "legacy" } } }],
  manifest: { pages: [] },
  routeSource: "",
  componentSource: "",
  generatedSource: "",
  editorialComponentSource: "",
  stylesSource: "",
};

const invalidEditorialContext = {
  rows: [{
    file: "editorial.json",
    data: {
      metadata: { design_profile: "editorial_v2" },
      hero: {
        answer_snippet: "one two",
        primary_cta_label: "This CTA label is intentionally far too long for a narrow mobile viewport",
      },
    },
  }],
  manifest: { pages: [] },
  routeSource: "",
  componentSource: "",
  generatedSource: "",
  editorialComponentSource: "compact-disclosure; flex items-center justify-between whitespace-nowrap; data-track=\"primary-cta\"; <footer><p className=\"full-disclosure\"></p></footer>; cta { position: sticky; background: linear-gradient(red, blue); }",
  stylesSource: ".landing-editorial-v2 { font-family: var(--font-editorial-body); }",
};

test("future-profile scan ignores legacy artifacts", () => {
  const report = buildLandingStaticReport("editorial-v2", legacyOnlyContext);
  assert.equal(report.status, "pass");
});

test("future-profile scan blocks invalid answer, CTA, gradient, and sticky patterns", () => {
  const report = buildLandingStaticReport("editorial-v2", invalidEditorialContext);
  assert.deepEqual(report.issues.map((issue) => issue.code), [
    "editorial_answer_snippet_invalid",
    "editorial_cta_label_too_long",
    "editorial_gradient_interactive",
    "editorial_sticky_cta",
  ]);
});

test("future-profile scan counts draft rows from the next-50 directory", () => {
  const report = buildLandingStaticReport("editorial-v2", {
    ...legacyOnlyContext,
    rows: [],
    editorialRows: [{
      file: "src/generated/landing-page-drafts/next-50/dh-amazon-profitability-review.json",
      data: {
        metadata: { design_profile: "editorial_v2" },
        hero: {
          answer_snippet: "DataHawk can help Amazon operators inspect marketplace performance across sales, advertising, search, and profitability signals. This page is for buyers deciding which data views to verify first, not for claims about guaranteed performance, savings, or suitability for every marketplace or account configuration before committing.",
          primary_cta_label: "Open Amazon analytics",
        },
        cta_blocks: [{ label: "Open Amazon analytics" }],
      },
    }],
    editorialComponentSource: 'compact-disclosure; flex items-center justify-between whitespace-nowrap; data-track="primary-cta"; <footer><p className="full-disclosure"></p></footer>;',
    stylesSource: ".landing-editorial-v2 { font-family: var(--font-editorial-body); }",
  });

  assert.equal(report.status, "pass");
  assert.equal(report.scanned_count, 1);
});
