import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { editorialOperation } from "../src/lib/article-import/worker-editorial";
import { importPacketId } from "../src/lib/article-import/packet-binding";
import { artifactProseProjection, editorialJudgmentReviewInput, editorialPassReviewInput, validateEditorialExecution } from "../src/lib/article-import/workflow-evidence";
import { editorialProsePaths, fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { evidenceReference, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { WORKFLOW_REVISION, workflowRequirements } from "../src/lib/article-import/workflow-requirements";
import { fullRewriteNotes, rewriteAllProse } from "./fixtures/article-content-approval";
import { samplePageBlueprint as blueprint } from "./fixtures/sample-page-blueprint";
import { validateEditorialActivityOutputRefs } from "../src/lib/article-import/activity-checkpoints";

test("fresh packet produces five independently replayable editorial passes and checker receipts", async t => {
  const samplePageBlueprint = {...blueprint, metadata:{...blueprint.metadata,canonical_url:"https://vettedsaasblueprint.online/workflow-tools-review"}};
  const root = await mkdtemp(path.join(tmpdir(), "orch01-editorial-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of [".agents/skills/eleanor-editorial", "config/article-workflow-capabilities.json"]) {
    await cp(path.resolve(file), path.join(root, file), { recursive: true });
  }
  const capabilitiesPath = path.join(root, "config/article-workflow-capabilities.json");
  const capabilities = JSON.parse(await readFile(capabilitiesPath, "utf8"));
  capabilities.modelFamilies["other/outer-worker"] = "fixture-family";
  const exporter = path.resolve("tests/fixtures/structured-execution-exporter.mjs");
  const exportMap = path.join(root, "structured-exports");
  await mkdir(exportMap);
  capabilities.executionExporters = { fixture: { executable: process.execPath, versionArgs: [exporter, "--version"],
    toolName: "fixture-neutral", toolVersion: "fixture-exporter 1", exportArgs: [exporter, "export-map", exportMap, "{contextId}", "{exchangeId}"] } };
  await writeFile(capabilitiesPath, JSON.stringify(capabilities));
  const importId = "article-11223344-abcd-abcd-abcd-0123456789ab", sourceFingerprint = "b".repeat(64);
  const key = importPacketId({ importId, sourceFingerprint }, "REFINING", "fresh-rewrite");
  const packet = { root, importId, sourceFingerprint, key, requirementRevision: WORKFLOW_REVISION, stage: "REFINING" as const,
    format: "direct-review" as const, model: "other/outer-worker", executable: "fixture-opencode", executionExporterId: "fixture" };
  const base = path.join(root, "build-pack/editorial", importId, key);
  await mkdir(base, { recursive: true });
  await writeFile(path.join(base, "before.json"), JSON.stringify(samplePageBlueprint));
  await writeFile(path.join(root, "draft.json"), await readFile(path.join(base, "before.json")));
  const controllerDraftRef = await evidenceReference(root, "draft.json");
  const revised = rewriteAllProse("landing", samplePageBlueprint);
  await writeFile(path.join(base, "after.json"), JSON.stringify(revised));
  const paths = editorialProsePaths("landing", revised);
  const claim = "A synthetic source describes the workflow.";
  const snapshot = await storeEvidence(root,importId,{source:claim});
  const research = await storeEvidence(root,importId,{schemaVersion:"ResearchEvidenceV2", id:"fixture", createdAt:new Date().toISOString(),importId,sourceFingerprint,
    requirementRevision:WORKFLOW_REVISION,sources:[{id:"source",url:"https://example.test",retrievedAt:new Date().toISOString(),snapshotRef:snapshot}],
    claims:[{id:"claim",text:claim,sourceIds:["source"],excerptLocations:[{sourceId:"source",quote:claim}],limitations:["Synthetic fixture."]}],freshness:"Synthetic snapshot."});
  const assessment = { format:packet.format, schemaRevision:"PageBlueprintV1", artifactFingerprint:fingerprintEditorialArtifact(revised), sourceFingerprint,
    requirementRevision:WORKFLOW_REVISION,researchRef:research, intent:{audience:"Buyers",decision:"Choose a workflow",query:"workflow tools",pageType:"review"},
    claimCoverage:[{claimId:"claim",artifactPaths:[paths[0]]}],ruleResults:workflowRequirements.map(rule=>({ruleId:rule.id,revision:WORKFLOW_REVISION,status:"pass",rationale:"Synthetic evidence covers this rule.",evidenceRefs:[research]})),findings:[] };
  let exports = 0, raw = {};
  const native = async (exe: string, argv: string[], cwd: string, stdin?: string) => {
    assert.equal(exe, packet.executable);
    if (argv[0] === "--version") return "opencode v2.2.6";
    if (argv[0] === "session") return JSON.stringify(raw);
    const profile = JSON.parse(await readFile(path.join(cwd, "opencode.json"), "utf8"));
    assert.equal(profile.default_agent, "editorial");
    assert.ok(!argv.includes("--agent"));
    assert.deepEqual(profile.agents.editorial.permissions, [{action:"*",resource:"*",effect:"deny"}]);
    const envelope = JSON.parse(stdin!);
    const output = envelope.pass === "content-assessment" ? {assessment:JSON.stringify(assessment)} : envelope.pass.endsWith("-judgment") ? { judgment: JSON.stringify({
      pass: envelope.pass.replace("-judgment", ""), beforeFingerprint: fingerprintEditorialArtifact(JSON.parse(envelope.prose.beforeArtifact)),
      afterFingerprint: fingerprintEditorialArtifact(revised), coveredPaths: paths, verdict: "pass", findings: [],
      semanticNotes: "The synthetic reviewer confirmed all protected fields.", meaningPreserved: true, protectedFieldsPreserved: true,
    }) } : artifactProseProjection(packet.format, revised);
    const id = "ses_fixture" + ++exports;
    const selected = argv[argv.indexOf("--model") + 1].split("/");
    const model = { providerID:selected[0], id:selected.slice(1).join("/") };
    raw = { info: { id, model, outcome:"succeeded" }, messages:[
      { id:"u", type:"user", text:stdin, time:{created:1} },
      { id:"a", type:"assistant", model, time:{created:2,streamed:3,completed:4}, finish:"stop", content:[{type:"text",text:JSON.stringify(output)}] },
      { id:"i", type:"idle", outcome:"succeeded", time:{created:5} },
    ]};
    return JSON.stringify({sessionID:id,type:"step_finish",part:{reason:"stop"}});
  };
  const call = (name: string, args: unknown) => editorialOperation(packet, name, args, native);
  await assert.rejects(call("check", {artifact:"../unscoped.json"}));
  await assert.rejects(editorialOperation({...packet, stage:"TRANSFORMING"}, "exchange", {pass:"independentReview",before:"before.json"}, native));
  await assert.rejects(call("assess", {format:"direct-review", artifact:"before.json"}), /ASSESSMENT_PACKET_BINDING/);
  assert.match((await call("check", {artifact:"before.json"}) as {stdout:string}).stdout, /score /);
  const instructionFiles = ["SKILL.md", "references/principles.md", "references/signs-of-ai-writing.md", "references/dr-eleanor-hayes.md", "prompts/cleanse.txt"];
  const independentInstructions = await Promise.all(instructionFiles.map(async name => {
    const relative = `.agents/skills/eleanor-editorial/${name}`;
    return { ...await evidenceReference(root, relative), text: await readFile(path.join(root, relative), "utf8") };
  }));
  const saveStructuredExport = async (contextId: string, exchangeId: string, pass: string, input: Record<string,string>, output: Record<string,string>, inputRefs: {path:string;sha256:string}[]) => {
    await writeFile(path.join(exportMap, `${contextId}--${exchangeId}.json`), JSON.stringify({
      schemaVersion: "StructuredExecutionExportV1", exporterId: "fixture", tool: {name:"fixture-neutral",version:"fixture-exporter 1"},
      contextId, exchangeId, startedAt:"2026-11-26T00:00:00.000Z",completedAt:"2026-11-26T00:00:01.000Z",status:"succeeded",
      providerId:"fixture-provider",modelId:"fixture-model",packetId:key,pass,input,output,instructions:independentInstructions,
      inputRefs:[...inputRefs,...independentInstructions.map(({path,sha256})=>({path,sha256}))],outputRefs:[],
    }));
  };
  const passes = [];
  const activityIds = ["purpose-and-structure", "meaning-and-evidence", "wording-and-rhythm", "independent-review", "final-fidelity-review"];
  let before = "before.json";
  for (const [index, name] of ["purposeAndStructure","meaningAndEvidence","wordingAndRhythm","independentReview","finalFidelityReview"].entries()) {
    let rewriteArgs: Record<string,unknown> = {pass:name,before};
    let judgmentArgs: Record<string,unknown> = {pass:name,before,after:"after.json"};
    if (name === "independentReview") {
      const beforeArtifact = JSON.parse(await readFile(path.join(base,before),"utf8"));
      const beforeRef = await evidenceReference(root,path.relative(root,path.join(base,before)));
      const afterRef = await evidenceReference(root,path.relative(root,path.join(base,"after.json")));
      const reviewOutput = artifactProseProjection(packet.format,revised);
      const judgmentOutput = {judgment:JSON.stringify({pass:name,beforeFingerprint:fingerprintEditorialArtifact(beforeArtifact),afterFingerprint:fingerprintEditorialArtifact(revised),coveredPaths:paths,verdict:"pass",findings:[],semanticNotes:"The synthetic reviewer confirmed all protected fields.",meaningPreserved:true,protectedFieldsPreserved:true})};
      await saveStructuredExport("independent-rewrite", "rewrite", name, editorialPassReviewInput(beforeArtifact), reviewOutput, [beforeRef]);
      await saveStructuredExport("independent-judgment", "judgment", `${name}-judgment`, editorialJudgmentReviewInput(beforeArtifact,revised), judgmentOutput, [beforeRef,afterRef]);
      rewriteArgs = {...rewriteArgs,capture:{exporterId:"fixture",contextId:"independent-rewrite",exchangeId:"rewrite"}};
      judgmentArgs = {...judgmentArgs,capture:{exporterId:"fixture",contextId:"independent-judgment",exchangeId:"judgment"}};
    }
    const rewrite = await call("exchange", rewriteArgs) as Record<string,unknown>;
    const judgment = await call("exchange", judgmentArgs) as Record<string,unknown>;
    const pass = {name, inputRef:rewrite.inputRef,outputRef:judgment.outputRef, instructionRefs:rewrite.instructionRefs,executionRef:rewrite.executionRef,judgmentRef:judgment.judgmentRef};
    passes.push(pass);
    const dependencies = index === 0 ? [controllerDraftRef] : [controllerDraftRef, passes[index - 1].inputRef, passes[index - 1].outputRef, passes[index - 1].executionRef, passes[index - 1].judgmentRef] as {path:string;sha256:string}[];
    await validateEditorialActivityOutputRefs(root, activityIds[index], [pass.inputRef, pass.outputRef, pass.executionRef, pass.judgmentRef] as {path:string;sha256:string}[], dependencies);
    before = "after.json";
  }
  assert.equal(exports, 8);
  const revertedRewrite = await call("exchange", {pass:"meaningAndEvidence",before:"before.json"}) as Record<string,unknown>;
  const revertedJudgment = await call("exchange", {pass:"meaningAndEvidence",before:"before.json",after:"after.json"}) as Record<string,unknown>;
  await assert.rejects(validateEditorialActivityOutputRefs(root, "meaning-and-evidence", [revertedRewrite.inputRef, revertedJudgment.outputRef, revertedRewrite.executionRef, revertedJudgment.judgmentRef] as {path:string;sha256:string}[], [controllerDraftRef, passes[0].inputRef, passes[0].outputRef, passes[0].executionRef, passes[0].judgmentRef] as {path:string;sha256:string}[]), /ACTIVITY_EDITORIAL_OUTPUTS_INVALID/);
  await assert.rejects(editorialOperation({...packet,research,stage:"TRANSFORMING"},"assess",
    {artifact:"after.json",format:packet.format,capture:{exporterId:"fixture",contextId:"assessment",exchangeId:"transforming"}},native), /ASSESSMENT_CAPTURE_STAGE_REQUIRED/);
  const assessed = await editorialOperation({...packet, research},"assess",{artifact:"after.json",format:packet.format},native) as {path:string};
  const saved = JSON.parse(await readFile(path.join(root,assessed.path),"utf8"));
  assert.equal(saved.artifactFingerprint, assessment.artifactFingerprint);
  const independentNotes = { ...fullRewriteNotes, passes: {
    purposeAndStructure: true as const, meaningAndEvidence: true as const, wordingAndRhythm: true as const,
    independentReview: true as const, finalFidelityReview: true as const,
  } };
  await writeFile(path.join(base,"notes.json"),JSON.stringify(independentNotes));
  await writeFile(path.join(base,"manifest.json"),JSON.stringify({schemaVersion:"EditorialExecutionV1",id:"fixture",createdAt:new Date().toISOString(),
    importId, sourceFingerprint, requirementRevision:WORKFLOW_REVISION,format:packet.format,schemaRevision:"PageBlueprintV1",eligibleProsePaths:paths,passes}));
  const result = await call("compare",{before:"before.json",after:"after.json",notes:"notes.json",manifest:"manifest.json"}) as {editorialExecutionRef:{path:string;sha256:string}};
  await validateEditorialExecution(root,result.editorialExecutionRef,{...packet,artifactPath:path.relative(root,path.join(base,"after.json"))});
});
