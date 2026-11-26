import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { approveImportContent, advanceImport, createArticleImport, ensureImportContentApproval } from "../src/lib/article-import/engine";
import { evidenceReference, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { importPacketId } from "../src/lib/article-import/packet-binding";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { editorialOperation } from "../src/lib/article-import/worker-editorial";
import { WORKFLOW_REVISION, workflowRequirements } from "../src/lib/article-import/workflow-requirements";
import { artifactProseProjection, editorialExecutionSchema, validateEditorialExecution } from "../src/lib/article-import/workflow-evidence";
import { countVisibleArticleWords } from "../src/lib/editorial/article-visible-word-count";
import { editorialProsePaths, fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { persistFixture } from "./fixtures/article-command";
import { fullRewriteNotes, rewriteAllProse } from "./fixtures/article-content-approval";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";

const affiliateUrl = "https://start.switcherstudio.com/anme6fqvgdx9";

function longFormArtifacts(targetWords = 1_800) {
  const before = structuredClone(samplePageBlueprint);
  before.metadata.canonical_url = "https://vettedsaasblueprint.online/imported-guide";
  before.hero.headline = "This product fits teams that need one accountable workflow";
  before.hero.subheadline = "The supported advantage is a clearer handoff between evidence and accountable decisions.";
  before.hero.risk_reversal = "Open the approved destination to verify the current product terms before committing.";
  before.benefits[0].benefit_description = "The strongest reason to choose it is the documented workflow support for this buyer's actual job.";
  before.limitations[0].limitation = "Choose another product when the buyer needs a capability the retained evidence does not support.";

  let after = rewriteAllProse("landing", before);
  const needed = targetWords - countVisibleArticleWords("direct-review", after).wordCount;
  assert.ok(needed > 0);
  before.hero.subheadline += " " + Array.from({ length: needed }, (_, index) => `buyercontext${index + 1}`).join(" ");
  after = rewriteAllProse("landing", before);
  assert.equal(countVisibleArticleWords("direct-review", after).wordCount, targetWords);
  return { before, after };
}

function lengthStatus(wordCount: number) {
  return wordCount < 1_800 ? "needs-expansion" as const : wordCount > 2_300 ? "needs-reduction" as const : "pass" as const;
}

test("eligible affiliate approval binds the worker review, invalidates edits, and rejects independently found padding", async (t) => {
  const scratch = path.join(process.cwd(), ".scratch");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, "long-form-approval-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(path.resolve(".agents/skills/eleanor-editorial"), path.join(root, ".agents/skills/eleanor-editorial"), { recursive: true });
  await mkdir(path.join(root, "config"), { recursive: true });
  const capabilities = JSON.parse(await readFile("config/article-workflow-capabilities.json", "utf8"));
  capabilities.modelFamilies["fixture/writer"] = "fixture-writer-family";
  capabilities.modelFamilies["fixture/reviewer"] = "fixture-reviewer-family";
  await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify(capabilities));
  await writeFile(path.join(root, "approved-urls.md"), `- ${affiliateUrl}\n`);
  await writeFile(path.join(root, "article.md"), `---\naffiliate_name: Example\naffiliate_url: ${affiliateUrl}\n---\nA synthetic source article with a specific buyer decision and retained evidence.`);

  const initial = await createArticleImport(root, "article.md");
  const { before, after } = longFormArtifacts();
  const key = importPacketId(initial, "REFINING", "fresh-rewrite");
  const base = path.join(root, "build-pack/editorial", initial.importId, key);
  await mkdir(base, { recursive: true });
  await writeFile(path.join(base, "before.json"), JSON.stringify(before));
  await writeFile(path.join(base, "after.json"), JSON.stringify(after));

  const claim = "Synthetic retained evidence supports the scoped workflow advantage and limitation.";
  const snapshot = await storeEvidence(root, initial.importId, { source: claim });
  const research = await storeEvidence(root, initial.importId, {
    schemaVersion: "ResearchEvidenceV2", id: "fixture-research", createdAt: new Date().toISOString(),
    importId: initial.importId, sourceFingerprint: initial.sourceFingerprint, requirementRevision: WORKFLOW_REVISION,
    sources: [{ id: "source", url: "https://example.test/source", retrievedAt: new Date().toISOString(), snapshotRef: snapshot }],
    claims: [{ id: "claim", text: claim, sourceIds: ["source"], excerptLocations: [{ sourceId: "source", quote: claim }], limitations: ["Synthetic fixture only."] }],
    freshness: "Fixed synthetic evidence for the acceptance test.",
  });
  const brief = {
    reader: "A team choosing a workflow product for an evidence-led operating process",
    purchaseDecision: "Whether this product fits the team's accountable handoff workflow",
    strongestEvidencedAdvantage: "The retained evidence supports a clearer accountable workflow",
    disqualifyingCondition: "The buyer needs a capability the retained evidence does not support",
    affiliateNextStep: "Verify current product terms at the approved destination",
  };
  const passages = {
    fit: { artifactPath: "hero.headline", quote: after.hero.headline, explanation: "This identifies the buyer fit." },
    rationale: { artifactPath: "benefits.0.benefit_description", quote: after.benefits[0].benefit_description, explanation: "This gives the supported reason to choose." },
    alternative: { artifactPath: "limitations.0.limitation", quote: after.limitations[0].limitation, explanation: "This states when to choose something else." },
    nextStep: { artifactPath: "hero.risk_reversal", quote: after.hero.risk_reversal!, explanation: "This accurately states the approved next step." },
  };
  const paths = editorialProsePaths("landing", after);
  let negativeIndependentReview = false;
  let assessmentArtifact = before;
  let sessions = 0;
  const rawBySession = new Map<string, unknown>();

  const assessmentFor = (artifact: typeof before) => {
    const wordCount = countVisibleArticleWords("direct-review", artifact).wordCount;
    return {
      format: "direct-review", schemaRevision: "PageBlueprintV1", artifactFingerprint: fingerprintEditorialArtifact(artifact),
      sourceFingerprint: initial.sourceFingerprint, requirementRevision: WORKFLOW_REVISION, researchRef: research,
      intent: { audience: brief.reader, decision: brief.purchaseDecision, query: "accountable workflow product", pageType: "direct-review" },
      longFormAffiliate: { artifactFingerprint: fingerprintEditorialArtifact(artifact), wordCount, approvedAffiliateUrl: affiliateUrl, brief,
        lengthStatus: lengthStatus(wordCount), draftingFeedback: wordCount < 1_800 ? "Answer another evidence-supported buyer question." : "The visible length is ready for final review." },
      claimCoverage: [{ claimId: "claim", artifactPaths: ["benefits.0.benefit_description", "limitations.0.limitation"] }],
      ruleResults: workflowRequirements.map((rule) => ({ ruleId: rule.id, revision: WORKFLOW_REVISION, status: "pass", rationale: "Synthetic retained evidence covers this rule.", evidenceRefs: [research] })),
      findings: [],
    };
  };

  const invoke = async (_executable: string, argv: string[], _cwd: string, stdin?: string) => {
    if (argv[0] === "--version") return `opencode v${capabilities.openCodeVersion}`;
    if (argv[0] === "session") return JSON.stringify(rawBySession.get(argv.at(-2)!)!);
    const envelope = JSON.parse(stdin!);
    const modelName = argv[argv.indexOf("--model") + 1];
    const [providerID, ...modelParts] = modelName.split("/");
    const model = { providerID, id: modelParts.join("/") };
    let output: Record<string, string>;
    if (envelope.pass === "content-assessment") {
      output = { assessment: JSON.stringify(assessmentFor(assessmentArtifact)) };
    } else if (envelope.pass.endsWith("-judgment")) {
      const pass = envelope.pass.replace("-judgment", "");
      const beforeArtifact = JSON.parse(envelope.prose.beforeArtifact);
      const independent = pass === "independentReview";
      const judgment = {
        pass, beforeFingerprint: fingerprintEditorialArtifact(beforeArtifact), afterFingerprint: fingerprintEditorialArtifact(after),
        coveredPaths: paths, verdict: independent && negativeIndependentReview ? "fail" : "pass",
        findings: independent && negativeIndependentReview ? [{ description: "The added paragraph pads the count without helping the decision.", disposition: "unresolved" }] : [],
        semanticNotes: "The synthetic independent context reviewed the complete final article and protected fields.", meaningPreserved: true, protectedFieldsPreserved: true,
        ...(independent && { longFormAffiliateReview: {
          artifactFingerprint: fingerprintEditorialArtifact(after), wordCount: countVisibleArticleWords("direct-review", after).wordCount,
          approvedAffiliateUrl: affiliateUrl, passages,
          checks: { padding: negativeIndependentReview ? "fail" : "pass", unsupportedClaims: "pass", misleadingCta: "pass", unresolvedObjections: "pass" },
          findings: negativeIndependentReview ? [{ category: "padding", description: "The added paragraph pads the count without helping the decision.", artifactPath: "hero.subheadline", quote: after.hero.subheadline.slice(0, 80), disposition: "unresolved" }] : [],
        } }),
      };
      output = { judgment: JSON.stringify(judgment) };
    } else {
      output = artifactProseProjection("direct-review", after);
    }
    const session = `ses_fixture${++sessions}`;
    const raw = { info: { id: session, model, outcome: "succeeded" }, messages: [
      { id: "user", type: "user", text: stdin, time: { created: 1 } },
      { id: "assistant", type: "assistant", model, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", content: [{ type: "text", text: JSON.stringify(output) }] },
      { id: "idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
    ] };
    rawBySession.set(session, raw);
    return JSON.stringify({ sessionID: session, type: "step_finish", part: { reason: "stop" } });
  };

  const transformingKey = importPacketId(initial, "TRANSFORMING", "field-repair");
  const transformingPacket = { root, importId: initial.importId, sourceFingerprint: initial.sourceFingerprint, key: transformingKey,
    requirementRevision: WORKFLOW_REVISION, stage: "TRANSFORMING" as const, format: "direct-review" as const,
    model: "fixture/writer", executable: "fixture-opencode", research, affiliateUrl };
  const transformingBase = path.join(root, "build-pack/editorial", initial.importId, transformingKey);
  await mkdir(transformingBase, { recursive: true });
  await writeFile(path.join(transformingBase, "before.json"), JSON.stringify(before));
  const transformAssessment = await editorialOperation(transformingPacket, "assess", { artifact: "before.json", format: "direct-review" }, invoke) as { path: string; sha256: string };

  const packet = { ...transformingPacket, key, stage: "REFINING" as const, assessment: transformAssessment, independentReviewModel: "fixture/reviewer" };
  const call = (name: string, args: unknown) => editorialOperation(packet, name, args, invoke);
  const checker = await call("check", { artifact: "after.json" }) as { stdout: string };
  assert.match(checker.stdout, /score\s+5\/5\s+CLEAN/i);

  const passes = [];
  let prior = "before.json";
  for (const name of ["purposeAndStructure", "meaningAndEvidence", "wordingAndRhythm", "independentReview", "finalFidelityReview"] as const) {
    const rewrite = await call("exchange", { pass: name, before: prior }) as Record<string, unknown>;
    const judgment = await call("exchange", { pass: name, before: prior, after: "after.json" }) as Record<string, unknown>;
    passes.push({ name, inputRef: rewrite.inputRef, outputRef: judgment.outputRef, instructionRefs: rewrite.instructionRefs,
      executionRef: rewrite.executionRef, judgmentRef: judgment.judgmentRef });
    prior = "after.json";
  }

  assessmentArtifact = after;
  const finalAssessment = await call("assess", { artifact: "after.json", format: "direct-review" }) as { path: string; sha256: string };
  const notes = { ...fullRewriteNotes, writerModelFamily: undefined, cleanseModelFamily: undefined,
    passes: { purposeAndStructure: true, meaningAndEvidence: true, wordingAndRhythm: true, independentReview: true, finalFidelityReview: true } };
  await writeFile(path.join(base, "notes.json"), JSON.stringify(notes));
  await writeFile(path.join(base, "manifest.json"), JSON.stringify({ schemaVersion: "EditorialExecutionV1", id: "long-form-fixture", createdAt: new Date().toISOString(),
    importId: initial.importId, sourceFingerprint: initial.sourceFingerprint, requirementRevision: WORKFLOW_REVISION, format: "direct-review",
    schemaRevision: "PageBlueprintV1", eligibleProsePaths: paths, passes }));
  const compared = await call("compare", { before: "before.json", after: "after.json", notes: "notes.json", manifest: "manifest.json" }) as {
    receipt: { path: string; sha256: string }; editorialExecutionRef: { path: string; sha256: string };
  };
  const artifactPath = path.relative(root, path.join(base, "after.json")).replaceAll("\\", "/");
  const formatQualityPath = "build-pack/article-import/long-form-quality.json";
  await mkdir(path.dirname(path.join(root, formatQualityPath)), { recursive: true });
  await writeFile(path.join(root, formatQualityPath), JSON.stringify({ format: "direct-review", artifactFingerprint: fingerprintEditorialArtifact(after), passed: true, gate: "landing:quality:candidate" }));
  const refining = await persistFixture(root, { ...initial, stage: "REFINING", format: "direct-review", artifactPath,
    evidenceRefs: { research, transformAssessment, assessment: finalAssessment, editorial: compared.editorialExecutionRef } });
  const approved = await approveImportContent(root, refining, { artifactPath, editorialEvidencePath: compared.receipt.path, formatQualityPath });
  const validating = await advanceImport(root, approved, "Long-form content approved.");
  assert.equal(validating.stage, "VALIDATING");
  assert.equal(validating.contentApproval?.longFormAffiliate?.wordCount, 1_800);
  assert.equal(validating.contentApproval?.longFormAffiliate?.approvedAffiliateUrl, affiliateUrl);

  const changed = structuredClone(after);
  changed.benefits[0].benefit_description += " One unreviewed paragraph change.";
  await writeFile(path.join(root, artifactPath), JSON.stringify(changed));
  const invalidated = await ensureImportContentApproval(root, validating);
  assert.equal(invalidated.stage, "REFINING");
  assert.equal(invalidated.contentApproval, undefined);
  await writeFile(path.join(root, artifactPath), JSON.stringify(after));

  negativeIndependentReview = true;
  const negativeJudgment = await call("exchange", { pass: "independentReview", before: "after.json", after: "after.json" }) as Record<string, unknown>;
  const negativeJudgmentValue = JSON.parse(await readFile(path.join(root, (negativeJudgment.judgmentRef as { path: string }).path), "utf8"));
  assert.equal(negativeJudgmentValue.longFormAffiliateReview.checks.padding, "fail");
  assert.equal(negativeJudgmentValue.longFormAffiliateReview.findings[0].category, "padding");
  assert.equal(negativeJudgmentValue.longFormAffiliateReview.findings[0].disposition, "unresolved");
  const negativePasses = passes.map((pass) => pass.name === "independentReview" ? { ...pass, judgmentRef: negativeJudgment.judgmentRef } : pass);
  const positiveExecution = editorialExecutionSchema.parse(JSON.parse(await readFile(path.join(root, compared.editorialExecutionRef.path), "utf8")));
  const negativeExecutionRef = await storeEvidence(root, initial.importId, { ...positiveExecution, id: "padded-fixture", passes: negativePasses });
  await assert.rejects(
    validateEditorialExecution(root, negativeExecutionRef, { ...packet, artifactPath }),
    /EDITORIAL_JUDGMENT_FAILED|LONG_FORM_AFFILIATE_(?:REVIEW_FAILED|UNRESOLVED_FINDING)/,
  );
  assert.match((await call("check", { artifact: "after.json" }) as { stdout: string }).stdout, /score\s+5\/5\s+CLEAN/i);

  const commercialTransform = { ...initial, stage: "TRANSFORMING" as const, format: "direct-review" as const };
  const executor = createSupervisedImportExecutor(root);
  const runTransform = (record: typeof commercialTransform, idempotencyKey: string) => executor({ record, idempotencyKey, assertLease: async () => {} });
  const pending = await runTransform(commercialTransform, "a".repeat(64));
  assert.equal(pending.continuation?.kind, "work");
  if (pending.continuation?.kind !== "work") throw new Error("Expected transforming work continuation.");
  await writeFile(path.join(root, pending.continuation.resultPath), JSON.stringify({ idempotencyKey: pending.continuation.idempotencyKey,
    sourceFingerprint: initial.sourceFingerprint, summary: "Relabelled output", work: { stage: "TRANSFORMING", artifactPath, assessmentPath: finalAssessment.path, format: "blog" } }));
  await assert.rejects(runTransform(commercialTransform, "a".repeat(64)), /LONG_FORM_AFFILIATE_FORMAT_MISMATCH/);

  const neutral = { ...commercialTransform, format: "blog" as const, transformation: { commercialMode: "none" as const, reason: "No approved affiliate destination." } };
  const neutralPending = await runTransform(neutral, "b".repeat(64));
  if (neutralPending.continuation?.kind !== "work") throw new Error("Expected neutral transforming work continuation.");
  await writeFile(path.join(root, neutralPending.continuation.resultPath), JSON.stringify({ idempotencyKey: neutralPending.continuation.idempotencyKey,
    sourceFingerprint: initial.sourceFingerprint, summary: "Neutral format output", work: { stage: "TRANSFORMING", artifactPath, assessmentPath: finalAssessment.path, format: "visibility" } }));
  await assert.rejects(runTransform(neutral, "b".repeat(64)), (error: unknown) => {
    assert.doesNotMatch(String(error), /LONG_FORM_AFFILIATE_FORMAT_MISMATCH/);
    return true;
  });
});
