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
  editorialComponentSource: "flex items-center justify-between whitespace-nowrap; compact-disclosure; full-disclosure; position: sticky; background: linear-gradient(red, blue);",
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
