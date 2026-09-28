import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { decisionSetV2Schema, fingerprintDecisionSetSources, listDecisionSets, loadDecisionSetsFromDirectory } from "../src/lib/decision-journey/sets";

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

// The shipped sets are the publication input for three live routes each, so their identity
// is checked here rather than only in the per-page renderer tests.
test("every shipped decision set keeps its structure, routes, and derived source identity", () => {
  const sets = listDecisionSets();
  assert.ok(sets.length >= 1);

  for (const set of sets) {
    assert.equal(set.pages.decisionHub.blocks.length, 12, `${set.slug} decision hub`);
    assert.equal(set.pages.solutionHub.blocks.length, 7, `${set.slug} solution hub`);
    assert.equal(set.pages.scenario.blocks.length, 12, `${set.slug} scenario`);

    assert.equal(set.pages.decisionHub.canonicalPath, `/decision-hub/${set.slug}`);
    assert.equal(set.pages.solutionHub.canonicalPath, `/solution-hub/${set.slug}`);
    assert.equal(set.pages.scenario.canonicalPath, `/scenarios/${set.slug}`);
    assert.deepEqual(set.pages.decisionHub.connectedRoutes.slice().sort(), [`/scenarios/${set.slug}`, `/solution-hub/${set.slug}`]);
    assert.deepEqual(set.pages.solutionHub.connectedRoutes.slice().sort(), [`/decision-hub/${set.slug}`, `/scenarios/${set.slug}`]);
    assert.deepEqual(set.pages.scenario.connectedRoutes.slice().sort(), [`/decision-hub/${set.slug}`, `/solution-hub/${set.slug}`]);
    assert.equal(set.report.fullReasoningPath, `/decision-hub/${set.slug}`);

    assert.equal(
      fingerprintDecisionSetSources(set.sourceReferences),
      set.sourceFingerprint,
      `${set.slug} fingerprint must be reproducible from its declared sources`,
    );
    for (const page of Object.values(set.pages)) {
      assert.equal(page.sourceFingerprint, set.sourceFingerprint, `${set.slug} ${page.pageType}`);
      assert.equal(page.evidenceState, set.evidenceState, `${set.slug} ${page.pageType}`);
      assert.deepEqual(page.motionBrief.majorPatterns.length <= 3, true);
    }

    const declaredUids = new Set(set.sourceReferences.map((reference) => reference.sectionUid));
    for (const page of Object.values(set.pages)) {
      for (const block of page.blocks) {
        for (const claim of block.claims) {
          assert.ok(claim.sources.length > 0, `${set.slug} ${page.pageType}/${block.id} needs a source-bound claim`);
          for (const source of claim.sources) {
            assert.ok(declaredUids.has(source.sectionUid), `${set.slug} claim cites an undeclared source: ${source.sectionUid}`);
            assert.match(source.contentHash, /^[a-f0-9]{64}$/);
          }
        }
      }
    }
  }
});

test("every shipped set discloses its conditions and limits", () => {
  for (const set of listDecisionSets()) {
    assert.ok(set.report.limitations.length >= 3, `${set.slug} needs disclosed limitations`);
    assert.ok(set.report.conditions.length >= 3, `${set.slug} needs stated conditions`);
    assert.equal(set.report.evidenceState, set.evidenceState, `${set.slug} report must carry the set evidence state`);
  }
});

// D08 "11. Source Hierarchy": vendor documentation is a statement about intent, not
// independent proof, so a claim resting only on vendor documentation cannot be validated.
test("no shipped claim is marked validated on vendor documentation alone", () => {
  const vendorDocuments = new Set(["MS-LEARN-COPILOT-CONTROLS", "MS-LEARN-COPILOT-PRIVACY", "BW-ORGANIZATIONS-DOCS"]);

  for (const set of listDecisionSets()) {
    for (const page of Object.values(set.pages)) {
      for (const block of page.blocks) {
        for (const claim of block.claims) {
          const documents = new Set(claim.sources.map((source) => source.documentId));
          const vendorOnly = [...documents].every((document) => vendorDocuments.has(document));
          if (vendorOnly) {
            assert.notEqual(claim.evidenceState, "validated", `${set.slug} ${page.pageType}/${block.id} rests only on vendor documentation`);
          }
        }
      }
    }
  }
});

test("external source hashes in each shipped set are reproducible from its evidence ledger", () => {
  const ledgerDirectory = path.join("docs", "research");
  const ledgers = readdirSync(ledgerDirectory)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(ledgerDirectory, name), "utf8")) as { sources?: Record<string, string>[] });
  assert.ok(ledgers.length >= 1, "at least one evidence ledger must exist under docs/research");

  for (const set of listDecisionSets()) {
    const external = set.sourceReferences.filter((reference) => !reference.sectionUid.startsWith("D"));
    assert.ok(external.length > 0, `${set.slug} must cite at least one external source`);

    for (const reference of external) {
      const record = ledgers
        .flatMap((ledger) => ledger.sources ?? [])
        .find((source) => source.documentId === reference.documentId);
      assert.ok(record, `${set.slug} cites ${reference.documentId} with no ledger record`);
      assert.equal(
        createHash("sha256").update(JSON.stringify(record), "utf8").digest("hex"),
        reference.contentHash,
        `${set.slug} ${reference.documentId} content hash must equal sha256(its ledger record)`,
      );
    }
  }
});

test("internal source hashes in each shipped set match the generated document inventory", () => {
  const manifest = JSON.parse(readFileSync(path.join("docs", "document-intelligence", "SOURCE_MANIFEST.json"), "utf8")) as unknown;
  const sections = new Map<string, string>();
  const collect = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const record = node as { stable_uid?: string; content_sha256?: string };
    if (typeof record.stable_uid === "string" && typeof record.content_sha256 === "string") {
      sections.set(record.stable_uid, record.content_sha256);
    }
    for (const value of Object.values(node)) collect(value);
  };
  collect(manifest);

  for (const set of listDecisionSets()) {
    for (const reference of set.sourceReferences.filter((item) => item.sectionUid.startsWith("D"))) {
      assert.equal(
        sections.get(reference.sectionUid),
        reference.contentHash,
        `${set.slug} cites ${reference.sectionUid} with a hash that is not the inventory content hash`,
      );
    }
  }
});
