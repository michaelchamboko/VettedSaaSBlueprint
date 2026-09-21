import assert from "node:assert/strict";
import test from "node:test";

import {
  decisionJourneyCatalog,
  type DecisionJourneyRecordV1,
} from "../src/lib/decision-journey/catalogue";
import { journeyPresentations } from "../src/lib/decision-journey/presentation";
import { approvedJourneyCatalogueReferences, journeyCompositionFamilies } from "../src/lib/decision-journey/presentation-options";

const expectedBlocks = {
  "/decision-hub": [
    "opening", "relevance", "desired-outcome", "problem-landscape", "root-causes",
    "context-questions", "domain-questions", "criteria", "tradeoffs", "conditional-pathways",
    "methodology", "next-action",
  ],
  "/solution-hub": [
    "user-goal", "situation", "criteria", "best-fit-scenarios", "reasoning", "evidence", "next-step",
  ],
  "/scenarios": [
    "scenario", "assumptions", "hard-constraints", "viable-options", "disqualified-options", "criteria",
    "criterion-evidence", "tradeoffs", "uncertainty", "conditional-verdicts", "guidance", "next-action",
  ],
} as const;

test("the decision journey keeps the approved three-page structure and connected routes", () => {
  assert.deepEqual(Object.keys(decisionJourneyCatalog), Object.keys(expectedBlocks));

  for (const [path, expected] of Object.entries(expectedBlocks)) {
    const record = decisionJourneyCatalog[path] as DecisionJourneyRecordV1;
    assert.equal(record.version, 1);
    assert.equal(record.canonicalPath, path);
    assert.deepEqual(record.blocks.map((block) => block.id), expected);
    assert.ok(record.connectedRoutes.every((route) => route in decisionJourneyCatalog));
    assert.ok(record.motionBrief.majorPatterns.length <= 3);
  }
});

test("each journey page has a distinct, catalogue-traceable visual and motion brief", () => {
  for (const record of Object.values(decisionJourneyCatalog)) {
    const presentation = journeyPresentations[record.pageType];
    assert.ok(presentation.catalogueReferences.length >= 2);
    assert.ok(presentation.motionPurpose.length > 0);
    assert.ok(record.motionBrief.majorPatterns.length > 0);
    if (record.presentation) {
      assert.ok(journeyCompositionFamilies.includes(record.presentation.compositionFamily));
      assert.ok(record.presentation.catalogueReferences.every((reference) => approvedJourneyCatalogueReferences.includes(reference)));
    }
  }
});

test("every material journey statement has an allowed evidence state and stable source record", () => {
  const allowedStates = new Set(["validated", "partial", "insufficient", "conflicting"]);
  const claimRisk = /\b(?:\$|price|pricing|cheapest|best\s+vendor|top\s+vendor|affiliate|tested)\b/i;

  for (const record of Object.values(decisionJourneyCatalog)) {
    assert.match(record.headline, /five-person|five person/i);
    assert.match(record.sourceFingerprint, /^[a-f0-9]{64}$/);
    for (const block of record.blocks) {
      assert.ok(block.claims.length > 0, `${record.canonicalPath} ${block.id} needs a source-bound claim`);
      for (const claim of block.claims) {
        assert.ok(allowedStates.has(claim.evidenceState));
        assert.doesNotMatch(claim.statement, claimRisk);
        assert.ok(claim.sources.length > 0);
        for (const source of claim.sources) {
          assert.match(source.documentId, /^D0[45]$/);
          assert.match(source.sectionUid, /^D0[45]-S-[a-f0-9]+$/);
          assert.match(source.contentHash, /^[a-f0-9]{64}$/);
          assert.match(source.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
        }
      }
    }
  }
});
