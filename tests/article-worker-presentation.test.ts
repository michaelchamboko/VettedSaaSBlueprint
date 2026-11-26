import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { presentationOperation, presentationTool } from "../src/lib/article-import/worker-presentation";
import { captureRenderingInputs } from "../src/lib/article-import/rendering-inputs";
import { fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { samplePageBlueprint } from "./fixtures/sample-page-blueprint";
import { WORKFLOW_REVISION } from "../src/lib/article-import/workflow-requirements";
import { importPacketId } from "../src/lib/article-import/packet-binding";
import { readEvidence } from "../src/lib/article-import/execution-evidence";
import { candidatePreviewPath } from "../src/lib/article-import/candidate-route";

test("V3 present tool exposes complete collector receipts only to observed visual reviews", async () => {
  const ref = (name: string) => ({path:`proof/${name}.json`,sha256:"a".repeat(64)});
  const observations = {desktop:ref("desktop"),mobile:ref("mobile"),"reduced-motion":ref("reduced")};
  assert.deepEqual(presentationTool.parse({rule:"visual-quality",observations}),{rule:"visual-quality",observations});
  assert.deepEqual(presentationTool.parse({rule:"hero-image"}),{rule:"hero-image"});
  assert.throws(() => presentationTool.parse({rule:"visual-quality"}));
  assert.throws(() => presentationTool.parse({rule:"critique",observations:{desktop:ref("desktop"),mobile:ref("mobile")}}));
  assert.throws(() => presentationTool.parse({rule:"hero-image",observations}));

  const capabilities = JSON.parse(await readFile("config/article-workflow-capabilities.json","utf8"));
  assert.equal(capabilities.openCodeVersion,"2.2.6");
  assert.equal(typeof capabilities.visualReviewModel,"string");
  assert.equal(typeof capabilities.modelFamilies[capabilities.visualReviewModel],"string");
});

test("validation tools require the approved artifact and retain the render and route bindings", async t => {
  const root = await mkdtemp(path.join(tmpdir(),"orch01-validation-test-"));
  t.after(() => rm(root,{recursive:true,force:true}));
  const importId = "article-12345678-abcd-abcd-abcd-0123456789ab", sourceFingerprint = "a".repeat(64);
  const artifact = {...samplePageBlueprint,metadata:{...samplePageBlueprint.metadata,canonical_url:"https://vettedsaasblueprint.online/workflow-tools-review"}};
  for (const file of ["src/components/landing/DirectReviewPage.tsx","src/app/landing-page-previews/[slug]/page.tsx","src/app/layout.tsx","src/app/globals.css"]) {
    await mkdir(path.dirname(path.join(root,file)),{recursive:true});
    await writeFile(path.join(root,file),"/* fixture renderer */");
  }
  for (const file of ["config/article-workflow-capabilities.json",".agents/skills/impeccable/reference/craft-floor.md",".agents/skills/impeccable/SKILL.md",".agents/skills/impeccable/reference/critique.md",".agents/skills/external-article-import/references/design-judgment.md"]) {
    await cp(path.resolve(file),path.join(root,file));
  }
  const artifactPath = "fixture.json";
  await writeFile(path.join(root,artifactPath),JSON.stringify(artifact));
  const rendering = await captureRenderingInputs(root,importId);
  const packet = {root,importId,key:importPacketId({importId,sourceFingerprint},"VALIDATING","targeted-repair"),sourceFingerprint,requirementRevision:WORKFLOW_REVISION,
    approvedFingerprint:fingerprintEditorialArtifact(artifact),format:"direct-review" as const,stage:"VALIDATING" as const,artifactPath,rendering,model:"outer/custom",executable:"opencode"};
  const render = await readEvidence(root,rendering) as {digest:string};
  let exchanges = 0;
  const exchange:Parameters<typeof presentationOperation>[2] = async (pass, input, refs, instructions, _prompt, model) => {
    assert.equal(pass,"design:context");
    assert.equal(model,"opencode-go/beam-free");
    assert.equal(input.artifact,JSON.stringify(artifact));
    assert.deepEqual(refs[1],rendering);
    assert.equal(instructions.length,3);
    exchanges++;
    return {output:{designReview:JSON.stringify({rule:"context",artifactFingerprint:packet.approvedFingerprint,routes:[candidatePreviewPath(artifact.metadata.url_slug)],renderInputsRef:rendering,renderingDigest:render.digest,
      verdict:"insufficient-evidence",findings:[],notes:"The fixture has no finished design."})},executionRef:refs[0]};
  };
  await assert.rejects(presentationOperation({...packet,stage:"REFINING"},{rule:"critique"},exchange),/APPROVAL_REQUIRED/);
  await assert.rejects(presentationOperation({...packet,approvedFingerprint:"0".repeat(64)},{rule:"critique"},exchange),/ARTIFACT_MISMATCH/);
  await assert.rejects(presentationOperation(packet,{rule:"critique"},exchange));
  const scoped = await presentationOperation(packet,{rule:"context"},exchange);
  assert.equal(scoped.judgment?.verdict,"insufficient-evidence");
  assert.equal(exchanges,1);
});
