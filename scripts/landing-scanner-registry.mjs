// Authoritative registry for all 16 landing scanners. Runners derive their
// scanner lists from this registry; they retain their own scope, arguments,
// and ordering policy.
export const landingScanners = [
  { scan: "route", script: "scan:landing:route", check: "Landing-page route validation", kind: "static", type: "static", order: 7 },
  { scan: "structure", script: "scan:landing:structure", check: "Landing-page structure validation", kind: "static", type: "static", order: 7.1 },
  { scan: "hero", script: "scan:landing:hero", check: "Hero section validation", kind: "static", type: "static", order: 7.2 },
  { scan: "cta", script: "scan:landing:cta", check: "CTA validation", kind: "static", type: "static", order: 7.3 },
  { scan: "seo", script: "scan:landing:seo", check: "SEO metadata scanner", kind: "static", type: "static", order: 8 },
  { scan: "a11y", script: "scan:landing:a11y", check: "Accessibility scanner", kind: "static", type: "static", order: 9 },
  { scan: "links", script: "scan:landing:links", check: "Link scanner", kind: "static", type: "static", order: 10 },
  { scan: "forms", script: "scan:landing:forms", check: "Form validation scanner", kind: "static", type: "static", order: 11 },
  { scan: "conversion", script: "scan:landing:conversion", check: "Conversion / analytics instrumentation scanner", kind: "static", type: "static", order: 13 },
  { scan: "responsive", script: "scan:landing:responsive", check: "Responsive layout static scanner", kind: "static", type: "static", order: 14 },
  { scan: "assets", script: "scan:landing:assets", check: "Image / asset validation", kind: "static", type: "static", order: 13.75 },
  { scan: "publish-readiness", script: "scan:landing:publish-readiness", check: "Publishing-readiness scanner", kind: "static", type: "static", order: 14.5 },
  { scan: "editorial-v2", script: "scan:landing:editorial-v2", check: "Editorial v2 design-profile scanner", kind: "static", type: "static", order: 14.55 },
  { scan: "compliance", script: "scan:landing:compliance", check: "Compliance scanner", kind: "specialist", type: "compliance", order: 12, nodeArgs: [".agents/skills/affiliate-compliance-review/scripts/summarize-compliance-risks.mjs", "src/generated/landing-pages", "--json"] },
  { scan: "uniqueness", script: "scan:landing:uniqueness", check: "Uniqueness / duplicate content scanner", kind: "specialist", type: "uniqueness", order: 12.5, nodeArgs: [".agents/skills/landing-page-uniqueness-review/scripts/summarize-page-duplicates.mjs", "src/generated/landing-pages", "--json"] },
  { scan: "conversion-copy", script: "scan:landing:conversion-copy", check: "Conversion-copy scanner", kind: "specialist", type: "conversion-copy", order: 13.5, nodeArgs: [".agents/skills/conversion-copy-review/scripts/summarize-conversion-copy-risks.mjs", "src/generated/landing-pages", "--json"] },
];
