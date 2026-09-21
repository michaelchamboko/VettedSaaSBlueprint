// Shared scanner identities; runners retain their scope and execution policy.
export const landingScanners = [
  { scan: "route", script: "scan:landing:route", kind: "static", order: 7, check: "Landing-page route validation" },
  { scan: "structure", script: "scan:landing:structure", kind: "static", order: 7.1, check: "Landing-page structure validation" },
  { scan: "hero", script: "scan:landing:hero", kind: "static", order: 7.2, check: "Hero section validation" },
  { scan: "cta", script: "scan:landing:cta", kind: "static", order: 7.3, check: "CTA validation" },
  { scan: "seo", script: "scan:landing:seo", kind: "static", order: 8, check: "SEO metadata scanner" },
  { scan: "a11y", script: "scan:landing:a11y", kind: "static", order: 9, check: "Accessibility scanner" },
  { scan: "links", script: "scan:landing:links", kind: "static", order: 10, check: "Link scanner" },
  { scan: "forms", script: "scan:landing:forms", kind: "static", order: 11, check: "Form validation scanner" },
  { scan: "conversion", script: "scan:landing:conversion", kind: "static", order: 13, check: "Conversion / analytics instrumentation scanner" },
  { scan: "responsive", script: "scan:landing:responsive", kind: "static", order: 14, check: "Responsive layout static scanner" },
  { scan: "assets", script: "scan:landing:assets", kind: "static", order: 13.75, check: "Image / asset validation" },
  { scan: "publish-readiness", script: "scan:landing:publish-readiness", kind: "static", order: 14.5, check: "Publishing-readiness scanner" },
  { scan: "editorial-v2", script: "scan:landing:editorial-v2", kind: "static", order: 14.55, check: "Editorial v2 design-profile scanner" },
  { scan: "compliance", script: "scan:landing:compliance", kind: "specialist", nodeArgs: [".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs","src/generated/landing-pages","--json"], order: 12, check: "Compliance scanner" },
  { scan: "uniqueness", script: "scan:landing:uniqueness", kind: "specialist", nodeArgs: [".agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs","src/generated/landing-pages","--json"], order: 12.5, check: "Uniqueness / duplicate content scanner" },
  { scan: "conversion-copy", script: "scan:landing:conversion-copy", kind: "specialist", nodeArgs: [".agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs","src/generated/landing-pages","--json"], order: 13.5, check: "Conversion-copy scanner" },
];
