import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { decisionSetV2Schema, fingerprintDecisionSetSources, loadDecisionSetsFromDirectory } from "../src/lib/decision-journey/sets";

const source = {
  documentId: "D07",
  heading: "Intent Discovery",
  sectionUid: "D07-S-example",
  contentHash: "a".repeat(64),
  reviewedAt: "2026-09-02",
};

function blocks(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `section-${index + 1}`,
    title: `Section ${index + 1}`,
    summary: `Decision guidance ${index + 1}.`,
    claims: [{
      statement: `Source-bound statement ${index + 1}.`,
      evidenceState: "validated" as const,
      sources: [source],
    }],
  }));
}

function page(pageType: "decision-hub" | "solution-hub" | "scenario", slug: string, count: number) {
  const segment = pageType === "scenario" ? "scenarios" : pageType;
  return {
    version: 2 as const,
    pageType,
    canonicalPath: `/${segment}/${slug}`,
    headline: `A ${pageType} answer`,
    decisionContext: "A bounded public decision question.",
    evidenceState: "validated" as const,
    sourceFingerprint: fingerprintDecisionSetSources([source]),
    reviewDate: "2026-09-02",
    blocks: blocks(count),
    motionBrief: {
      majorPatterns: ["decision progression", "evidence emphasis", "next action"],
      reducedMotion: "All content remains complete and readable without animation.",
    },
    presentation: {
      compositionFamily: pageType === "decision-hub" ? "diagnostic-split" as const : pageType === "solution-hub" ? "fit-map" as const : "constraint-bento" as const,
      catalogueReferences: pageType === "decision-hub"
        ? ["Tailblocks Classic Light Split Hero", "UI Layouts Condition Grid"] as const
        : pageType === "solution-hub"
          ? ["Preline Hero with Client Logo Row", "UI Layouts Condition Grid"] as const
          : ["daisyUI Hero with Figure", "UI Layouts Stats Bento"] as const,
      artDirection: "Use the approved composition to clarify the decision.",
    },
    connectedRoutes: [
      `/decision-hub/${slug}`,
      `/solution-hub/${slug}`,
      `/scenarios/${slug}`,
    ].filter((route) => route !== `/${segment}/${slug}`),
  };
}

function validSet() {
  const slug = "example-decision";
  const sourceFingerprint = fingerprintDecisionSetSources([source]);
  return {
    version: 2 as const,
    slug,
    title: "Example software decision",
    userProblem: "A five-person team needs to choose a maintainable software approach.",
    publishedAt: "2026-09-02",
    reviewDate: "2026-09-02",
    evidenceState: "validated" as const,
    sourceFingerprint,
    sourceReferences: [source],
    pages: {
      decisionHub: page("decision-hub", slug, 12),
      solutionHub: page("solution-hub", slug, 7),
      scenario: page("scenario", slug, 12),
    },
    report: {
      version: 1 as const,
      context: "Five-person professional-services team.",
      evidenceState: "validated" as const,
      conditions: ["The workflow is documented."],
      limitations: ["No universal vendor ranking is implied."],
      fullReasoningPath: `/decision-hub/${slug}`,
    },
  };
}

test("DecisionSetV2 accepts one complete connected 12/7/12 page set", () => {
  const result = decisionSetV2Schema.parse(validSet());
  assert.equal(result.pages.decisionHub.blocks.length, 12);
  assert.equal(result.pages.solutionHub.blocks.length, 7);
  assert.equal(result.pages.scenario.blocks.length, 12);
});

test("DecisionSetV2 rejects unsafe slugs and route mismatches", () => {
  assert.throws(() => decisionSetV2Schema.parse({ ...validSet(), slug: "../escape" }));
  const mismatched = validSet();
  mismatched.pages.scenario.canonicalPath = "/scenarios/wrong";
  assert.throws(() => decisionSetV2Schema.parse(mismatched));
});

test("DecisionSetV2 rejects a source fingerprint that is not derived from its source records", () => {
  assert.throws(() => decisionSetV2Schema.parse({ ...validSet(), sourceFingerprint: "c".repeat(64) }), /Source fingerprint/i);
});

test("the set loader discovers JSON directly and binds each filename to its slug", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "decision-sets-"));
  try {
    await writeFile(path.join(directory, "example-decision.json"), JSON.stringify(validSet()), "utf8");
    const loaded = loadDecisionSetsFromDirectory(directory);
    assert.deepEqual(loaded.map((set) => set.slug), ["example-decision"]);

    await writeFile(path.join(directory, "wrong-name.json"), JSON.stringify(validSet()), "utf8");
    assert.throws(() => loadDecisionSetsFromDirectory(directory), /filename must match/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
