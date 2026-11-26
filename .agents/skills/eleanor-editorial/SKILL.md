---
name: eleanor-editorial
description: Mandatory full-article SlopMonster rewrite for drafted Vetted SaaS content.
---

# Full-article SlopMonster rewrite

Use this owner-approved stage after evidence-backed drafting and before candidate validation. It is a full rewrite, not a cleanup pass. Publication stays blocked until the final artifact has an `EditorialEvidenceV2` receipt.

The [Refining workflow diagram](../../../docs/article-intake.md#refining-workflow) shows the three rewrite passes, the independent review, and the word-count gate for approved affiliate direct reviews.

Read the pinned references in this directory: principles.md, signs-of-ai-writing.md, and dr-eleanor-hayes.md. Eleanor is a fictional style lens, never a reviewer credential or public byline. The repository's evidence, disclosure, ranking independence and page contracts take priority over upstream advice.

1. Save the complete structured draft before editing. Identify its reader, page intent, decision, evidence constraints and supported format. Run the bundled checker on all editable prose and retain its full output.
2. Rewrite every editable prose field. Work through the entire article in three passes: purpose and structure, meaning and evidence, then wording and rhythm. A field left byte-for-byte unchanged makes the receipt fail. Preserve facts, quotations, pricing, uncertainty, limitations and useful next actions. Never invent testing or personal experience.
3. Have an independent reviewer apply `prompts/cleanse.txt` to the rewritten article. Use any tool and model. Retain the completed exchange and its session identity so the validator can distinguish it from each rewrite session. If the reviewer shares a rewrite session or the evidence cannot establish independence, repeat the review in a verifiably separate context.
4. Keep every object key, array length and item order unchanged. Edit only the paths allowed by `src/lib/editorial/refinement.ts`. All other fields are frozen, including destinations, IDs, source records, claims, disclosures, metadata, design and approval fields. A required substantive correction returns to evidence-backed drafting.
5. Compare both valid artifacts and run the checker again using the command below. The final result must contain `score 5/5 CLEAN`. Inspect the semantic diff and the complete reading experience. Record findings, justified exceptions and semantic notes outside public content.
6. Continue the existing candidate validation and independent current-head review. A clean score does not prove accuracy, human authorship or editorial quality. Reuse a receipt only for the exact unchanged artifact fingerprint and skill revision.

Run from the checkout root:

```text
npx tsx scripts/compare-editorial-artifacts.ts landing before.json after.json notes.json build-pack/editorial/run-id.json
```

Formats: decision means DecisionSetV2; landing means the direct-review page blueprint; blog means one BlogPostV1; visibility means VisibilityPageV1. Unknown formats fail closed. Extract one blog post before comparison; do not pass the posts array.

The checker uses the existing local Python runtime. If Python is not on PATH, set PYTHON to its executable path. A missing checker stops evidence creation; it does not produce a clean score.

Record `semanticNotes`, `exceptions`, `meaningPreserved`, `arrayOrderPreserved` and `rewriteMode: "full_article"` in `notes.json`. Record the five completed passes as `purposeAndStructure`, `meaningAndEvidence`, `wordingAndRhythm`, `independentReview` and `finalFidelityReview`. Check every changed path before recording the result. Reject a revision that changes meaning, protected fields or item order.

The CLI records both fingerprints, the pinned revision, every eligible prose path, changed paths and actual before/after checker output. It rejects partial rewrites, unverified or same-session review, missing passes, a non-clean final score and overwritten receipts. Keep these records outside the published article.

For workflow version 2, supply the `EditorialExecutionV1` execution manifest as a sixth CLI argument. The producer inserts the actual checker execution and editorial receipt references, validates the ordered pass chain and scoped judgments, and returns the companion reference. Each pass includes captured input/output artifacts, pinned instructions, a verifiable reference to the completed execution and a judgment whose execution output matches its recorded findings. For a tool-neutral exchange, run `npx tsx scripts/capture-article-execution.ts structured <import-id> <selection.json>`. The selection identifies the configured `exporterId` and the original `contextId` and `exchangeId`. The capture command invokes the exporter and retains its completed exchange. Preserve the original context identity across model or tool changes. Use a fresh reviewer context for the independent review. The five-argument comparison receipt alone cannot advance automation. Do not fabricate pass histories or model families.

## Authority and scope

User directive, 27 October 2026: replace the previous one-pass cleanup with a mandatory full-article rewrite based on SlopMonster. Source authority remains D07 Ã‚Â§32 Editorial Quality Standard (D07-S-761a1d533ac1) and D10 Ã‚Â§9.4 Content and editorial quality (D10-S-574481d73201). This adapter pins SlopMonster commit `8bf609edfaeed844f1d03bb6b69f80dc21728c8b`. It adds no publication authority. See `UPSTREAM.json` and `LICENSE` for provenance.
