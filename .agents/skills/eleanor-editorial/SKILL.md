---
name: eleanor-editorial
description: One supervised, evidence-preserving Eleanor refinement pass for drafted Vetted SaaS content.
---

# Eleanor editorial refinement

Use this owner-approved style pass after evidence-backed drafting and before candidate validation. The existing writer performs it once. Do not call a second model, add a service, or change a schedule. This skill does not authorize publication.

Read the pinned references in this directory: principles.md, signs-of-ai-writing.md, and dr-eleanor-hayes.md. Eleanor is a fictional style lens, never a reviewer credential or public byline. The repository's evidence, disclosure, ranking independence and page contracts take priority over upstream advice.

1. Save the structured draft before editing. Identify its reader, decision, evidence constraints and supported format.
2. Run the bundled checker on the allowed prose. Make one Eleanor pass for a direct answer, precise consequences and natural rhythm. Wit is optional. Preserve facts, quotations, pricing, uncertainty, limitations and useful next actions. Never invent testing or personal experience.
3. Keep every object key, array length and item order unchanged. Edit only the paths allowed by src/lib/editorial/refinement.ts, including landing CTA wording and blog titles, descriptions and FAQ wording. All other fields are frozen, including destinations, IDs, source records, claims, disclosures, metadata, design and approval fields. A required substantive correction returns to evidence-backed drafting.
4. Compare both valid artifacts and run the checker again using the command below. Inspect the semantic diff, especially rewritten paragraphs whose order cannot be established from stable IDs. Record findings, justified exceptions and semantic notes outside public content.
5. Continue the existing candidate validation and independent review. Checker scores are advisory, not proof of accuracy, human authorship or editorial quality. Reuse a receipt only for the exact unchanged artifact fingerprint and skill revision.

Run from the checkout root:

```text
npx tsx scripts/compare-editorial-artifacts.ts landing before.json after.json notes.json build-pack/editorial/run-id.json
```

Formats: decision means DecisionSetV2; landing means the direct-review page blueprint; blog means one BlogPostV1; visibility means VisibilityPageV1. Unknown formats fail closed. Extract one blog post before comparison; do not pass the posts array.

The checker uses the existing local Python runtime. If Python is not on PATH, set PYTHON to its executable path. A missing checker stops evidence creation; it does not produce a clean score.

notes.json must contain semanticNotes, exceptions, meaningPreserved: true and arrayOrderPreserved: true. Write those attestations only after reviewing every changed path. Explain legitimate checker hits in exceptions; never delete necessary qualifications to get a clean score. If meaning or item order changed, reject the revision.

The CLI records both fingerprints, the pinned revision, changed paths and actual before/after checker output. Receipts cannot be overwritten. No evidence fields belong in rendered content.

## Authority and scope

User directive: supervised integration only, with paused automation unchanged. This adapter omits SlopMonster's second-model workflow. Source authority remains D07 §32 Editorial Quality Standard (D07-S-761a1d533ac1) and D10 §9.4 Content and editorial quality (D10-S-574481d73201). This local skill is implementation guidance, not a source-strategy amendment. See UPSTREAM.json and LICENSE for provenance.
