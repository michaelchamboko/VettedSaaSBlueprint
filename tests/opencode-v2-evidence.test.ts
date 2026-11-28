import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractOpenCodeExecution, proseProjectionDigest, sha256, storeEvidence, validateExecutionEvidence } from "../src/lib/article-import/execution-evidence";
import { normalizeOpenCodeVersion, openCodeExecutable, openCodeExportArgs } from "../src/lib/article-import/opencode-runtime";

const input = { artifact: "complete synthetic artifact" }, output = { judgment: "synthetic judgment" };
const selected = { version: "2.2.5", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId: "a".repeat(64), pass: "review", input, output, families: { "provider/model": "family" } };
function fixture() {
  const model = { providerID: "provider", id: "model", variant: "default" };
  return { info: { id: "session", model, outcome: "succeeded" }, messages: [
    { id: "user", type: "user", text: JSON.stringify({ packetId: selected.packetId, pass: selected.pass, prose: input, digest: proseProjectionDigest(input), instructions: [] }), time: { created: 1 } },
    { id: "answer", type: "assistant", model, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", content: [{ type: "reasoning", text: "private reasoning" }, { type: "text", text: JSON.stringify(output) }] },
    { id: "idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
  ] };
}

test("2.2.5 CLI and API dedicated exchanges retain exact identities and exclude reasoning", () => {
  for (const raw of [fixture(), { data: fixture() }]) {
    const result = extractOpenCodeExecution(raw, selected);
    assert.equal(result.toolVersion, "2.2.5");
    assert.equal(result.kind, "opencode");
    assert.equal(JSON.stringify(result).includes("private reasoning"), false);
    if (result.kind === "opencode") { assert.equal(result.providerId, "provider"); assert.equal(result.modelId, "model"); assert.deepEqual(result.input, input); }
  }
});

test("2.2.5 rejects extra history, tools, attachments, synthetic text and incomplete sessions", () => {
  const mutations: ((raw: ReturnType<typeof fixture>) => void)[] = [
    raw => { raw.messages.push(raw.messages[0]); },
    raw => { raw.messages.pop(); },
    raw => { raw.messages[2].outcome = "failed"; },
    raw => { raw.info.outcome = "running"; },
    raw => { raw.messages[1].finish = "length"; },
    raw => { raw.messages[1].time.completed = 0; },
    raw => { raw.messages[1].content!.push({ type: "tool", text: "hidden tool" }); },
    raw => { Object.assign(raw.messages[0], { attachments: ["hidden"] }); },
    raw => { Object.assign(raw.messages[1].content![1], { synthetic: true }); },
    raw => { Object.assign(raw.info, { model: { providerID: "other", id: "model" } }); },
    raw => { Object.assign(raw.info, { parentID: "parent-session" }); },
    raw => { Object.assign(raw.info, { fork: { sessionID: "source-session" } }); },
    raw => { Object.assign(raw.info, { revert: { messageID: "old-message" } }); },
  ];
  for (const mutate of mutations) { const raw = fixture(); mutate(raw); assert.throws(() => extractOpenCodeExecution(raw, selected)); }
});

test("2.2.5 rejects unmatched selection, identity, prose, instructions and future versions", () => {
  for (const change of [{ sessionId: "other" }, { userMessageId: "other" }, { assistantMessageId: "other" }, { families: {} }, { input: { artifact: "changed" } }, { packetId: "b".repeat(64) }, { version: "2.2.7" }, { instructions: [{ path: "skill.md", sha256: "c".repeat(64), text: "unseen" }] }]) {
    assert.throws(() => extractOpenCodeExecution(fixture(), { ...selected, ...change }));
  }
});

test("runtime resolves explicit executable and only exact supported version output", () => {
  const previous = process.env.OPENCODE_EXECUTABLE;
  try { process.env.OPENCODE_EXECUTABLE = "C:/tools/opencode-cli.exe"; assert.equal(openCodeExecutable(), "C:/tools/opencode-cli.exe"); }
  finally { if (previous === undefined) delete process.env.OPENCODE_EXECUTABLE; else process.env.OPENCODE_EXECUTABLE = previous; }
  assert.equal(openCodeExecutable({ env: { OPENCODE_EXECUTABLE: "D:/trusted/custom.exe" }, execPath: "C:/node.exe", platform: "win32", exists: () => false }), "D:/trusted/custom.exe");
  assert.equal(openCodeExecutable({ env: {}, execPath: "D:/tools/opencode.exe", platform: "win32", exists: () => false }), "D:/tools/opencode.exe");
  assert.equal(openCodeExecutable({ env: { APPDATA: "C:/Users/test/AppData/Roaming" }, execPath: "C:/node.exe", platform: "win32", exists: () => true }), path.normalize("C:/Users/test/AppData/Roaming/npm/node_modules/@opencode/cli/bin/opencode.exe"));
  assert.equal(openCodeExecutable({ env: {}, execPath: "/usr/bin/node", platform: "linux", exists: () => false }), "opencode");
  assert.equal(normalizeOpenCodeVersion("opencode v2.2.5\n"), "2.2.5");
  assert.equal(normalizeOpenCodeVersion("1.19.4"), "1.19.4");
  assert.equal(normalizeOpenCodeVersion("opencode v2.2.6"), "2.2.6");
  assert.equal(normalizeOpenCodeVersion("2.2.6"), "2.2.6");
  assert.equal(normalizeOpenCodeVersion("opencode v2.3.0"), "2.3.0");
  assert.equal(normalizeOpenCodeVersion("2.3.0"), "2.3.0");
  for (const version of ["2.2.5-preview", "prefix 2.2.5", "opencode v1.19.4", "opencode v2.2.7", "opencode v2.3.1", "3.0.0"]) assert.throws(() => normalizeOpenCodeVersion(version));
  assert.deepEqual(openCodeExportArgs("2.2.5", "session"), ["session", "export", "session"]);
  assert.deepEqual(openCodeExportArgs("2.2.6", "session"), ["session", "export", "session"]);
  assert.deepEqual(openCodeExportArgs("2.3.0", "session"), ["session", "export", "session"]);
  assert.deepEqual(openCodeExportArgs("1.19.4", "session"), ["export", "session"]);
});

test("genuine 2.3.0 dedicated export is accepted and excludes reasoning", async () => {
  const source = JSON.parse(await readFile("tests/fixtures/opencode-2.3.0-dedicated-export.json", "utf8"));
  const selection = {
    version: "2.3.0" as const,
    sessionId: "ses_ddd62413fffe3A5i5Q0p1nhYZ6",
    userMessageId: "msg_2229dcc7c001pAnrOPz7gP6iUX",
    assistantMessageId: "msg_2229de296001P5r72TZim2jw9s",
    packetId: "a".repeat(64),
    pass: "review",
    input: { artifact: "genuine OpenCode 2.3 synthetic fixture" },
    output: { judgment: "genuine OpenCode 2.3 synthetic fixture" },
    families: { "opencode-go/beam-free": "reflection-beam" },
  };
  const result = extractOpenCodeExecution(source, selection);
  assert.equal(result.toolVersion, "2.3.0");
  assert.equal(JSON.stringify(result).includes("Synthetic reasoning"), false);
});

test("2.2.6 synthetic export shape is accepted and reasoning is excluded", () => {
  const input = { artifact: "complete synthetic artifact" }, output = { judgment: "synthetic judgment" };
  const selected = { version: "2.2.6", sessionId: "ses_real", userMessageId: "msg_user", assistantMessageId: "msg_assistant", packetId: "a".repeat(64), pass: "review", input, output, families: { "opencode-go/beam-free": "reflection-beam" } };
  const raw = { info: { id: "ses_real", model: { providerID: "opencode-go", id: "beam-free", variant: "default" }, outcome: "succeeded", projectID: "p", cost: 0, tokens: { input: 1, output: 1, reasoning: 1, cache: { read: 0, write: 0 } }, time: { created: 1, updated: 2, idle: 3 } }, messages: [
    { id: "msg_user", type: "user", text: JSON.stringify({ packetId: selected.packetId, pass: selected.pass, prose: input, digest: proseProjectionDigest(input), instructions: [] }), files: [], time: { created: 1 } },
    { id: "msg_assistant", type: "assistant", agent: "build", model: { providerID: "opencode-go", id: "beam-free", variant: "default" }, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", rawFinish: "stop", cost: 0, tokens: { input: 1, output: 1, reasoning: 1, cache: { read: 0, write: 0 } }, snapshot: { start: "abc", end: "abc", files: [] }, content: [{ type: "reasoning", text: "private reasoning", native: { reasoningField: "reasoning_content" }, time: { created: 2, completed: 3 } }, { type: "text", text: JSON.stringify(output) }] },
    { id: "msg_idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
  ] };
  const result = extractOpenCodeExecution(raw, selected);
  assert.equal(result.toolVersion, "2.2.6");
  assert.equal(result.providerId, "opencode-go");
  assert.equal(result.modelId, "beam-free");
  assert.equal(JSON.stringify(result).includes("private reasoning"), false);
});

test("2.2.6 real-shaped nonempty files array is rejected", () => {
  const input = { artifact: "complete synthetic artifact" }, output = { judgment: "synthetic judgment" };
  const selected = { version: "2.2.6", sessionId: "ses_real", userMessageId: "msg_user", assistantMessageId: "msg_assistant", packetId: "a".repeat(64), pass: "review", input, output, families: { "opencode-go/beam-free": "reflection-beam" } };
  const raw = { info: { id: "ses_real", model: { providerID: "opencode-go", id: "beam-free", variant: "default" }, outcome: "succeeded" }, messages: [
    { id: "msg_user", type: "user", text: JSON.stringify({ packetId: selected.packetId, pass: selected.pass, prose: input, digest: proseProjectionDigest(input), instructions: [] }), files: [{ path: "hidden.txt", content: "unbound input" }], time: { created: 1 } },
    { id: "msg_assistant", type: "assistant", model: { providerID: "opencode-go", id: "beam-free", variant: "default" }, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", content: [{ type: "text", text: JSON.stringify(output) }] },
    { id: "msg_idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
  ] };
  assert.throws(() => extractOpenCodeExecution(raw, selected));
});

test("2.2.6 absent or empty files array remains valid", () => {
  const input = { artifact: "complete synthetic artifact" }, output = { judgment: "synthetic judgment" };
  const selected = { version: "2.2.6", sessionId: "ses_real2", userMessageId: "msg_user2", assistantMessageId: "msg_assistant2", packetId: "b".repeat(64), pass: "review", input, output, families: { "opencode-go/beam-free": "reflection-beam" } };
  for (const files of [undefined, []]) {
    const raw = { info: { id: "ses_real2", model: { providerID: "opencode-go", id: "beam-free", variant: "default" }, outcome: "succeeded" }, messages: [
      { id: "msg_user2", type: "user", text: JSON.stringify({ packetId: selected.packetId, pass: selected.pass, prose: input, digest: proseProjectionDigest(input), instructions: [] }), ...(files === undefined ? {} : { files }), time: { created: 1 } },
      { id: "msg_assistant2", type: "assistant", model: { providerID: "opencode-go", id: "beam-free", variant: "default" }, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", content: [{ type: "text", text: JSON.stringify(output) }] },
      { id: "msg_idle2", type: "idle", outcome: "succeeded", time: { created: 5 } },
    ] };
    const result = extractOpenCodeExecution(raw, selected);
    assert.equal(result.toolVersion, "2.2.6");
  }
});

test("visual review binds the ordered native PNG attachments while legacy text exchanges stay strict", () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WsAAAAASUVORK5CYII=", "base64");
  const digest = sha256(png);
  const image = {path: "proof/" + digest + ".png", sha256:digest};
  const visual = {...selected,version:"2.2.6",pass:"design:critique",imageRefs:[image],inputRefs:[image]};
  const raw = fixture();
  const user = raw.messages[0];
  user.text = JSON.stringify({packetId:visual.packetId,pass:visual.pass,prose:input,digest:proseProjectionDigest(input),instructions:[]});
  Object.assign(user,{files:[{name:digest + ".png",mime:"image/png",source:{type:"inline"},data:png.toString("base64")}]});
  const receipt = extractOpenCodeExecution(raw,visual);
  assert.equal(receipt.kind,"opencode");
  if (receipt.kind === "opencode") assert.deepEqual(receipt.imageRefs,[image]);
  assert.throws(() => extractOpenCodeExecution(raw,{...visual,imageRefs:[]}),/IMAGE_BINDING/);
  assert.throws(() => extractOpenCodeExecution(raw,{...visual,imageRefs:[{...image,sha256:"0".repeat(64)}]}),/IMAGE_BINDING/);
  assert.throws(() => extractOpenCodeExecution(raw,{...visual,pass:"content-assessment"}),/IMAGE_BINDING/);
});

function visualFixture(pass: string, bytes: Buffer, mime: "image/png" | "image/webp", extension: ".png" | ".webp") {
  const digest = sha256(bytes);
  const image = {path: `proof/${digest}${extension}`, sha256:digest};
  const visual = {...selected,version:"2.2.6",pass,imageRefs:[image],inputRefs:[image]};
  const raw = fixture();
  const user = raw.messages[0];
  user.text = JSON.stringify({packetId:visual.packetId,pass:visual.pass,prose:input,digest:proseProjectionDigest(input),instructions:[]});
  Object.assign(user,{files:[{name:path.basename(image.path),mime,source:{type:"inline"},data:bytes.toString("base64")} ]});
  return {raw, visual, image};
}

test("2.2.6 capture and replay bind the exact WebP hero and PNG visual-quality attachments", async t => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WsAAAAASUVORK5CYII=", "base64");
  const webp = await readFile(path.resolve("public/home-folios/dubbing-paper.webp"));
  const root = await mkdtemp(path.join(tmpdir(), "opencode-visual-replay-"));
  t.after(() => rm(root,{recursive:true,force:true}));
  await mkdir(path.join(root,"config"),{recursive:true});
  await writeFile(path.join(root,"config/article-workflow-capabilities.json"),JSON.stringify({schemaVersion:"ArticleWorkflowCapabilitiesV1",openCodeVersion:"2.2.6",modelFamilies:{"provider/model":"family"}}));

  for (const item of [
    visualFixture("hero-image-inspection",webp,"image/webp",".webp"),
    visualFixture("design:visual-quality",png,"image/png",".png"),
  ]) {
    await mkdir(path.dirname(path.join(root,item.image.path)),{recursive:true});
    const bytes = item.image.path.endsWith(".webp") ? webp : png;
    await writeFile(path.join(root,item.image.path),bytes);
    const receipt = extractOpenCodeExecution(item.raw,item.visual);
    assert.equal(receipt.kind,"opencode");
    if (receipt.kind !== "opencode") throw new Error("Expected OpenCode receipt");
    assert.deepEqual(receipt.imageRefs,[item.image]);
    const receiptRef = await storeEvidence(root,"article-11223344-abcd-abcd-abcd-0123456789ab",receipt);
    assert.equal((await validateExecutionEvidence(root,receiptRef)).pass,item.visual.pass);

    const corruptReplay = structuredClone(receipt) as typeof receipt & {replay:{export:{messages:Array<{files?:Array<{mime:string;data:string}>}>}}};
    const replayFile = corruptReplay.replay.export.messages[0].files![0];
    if (item.visual.pass === "hero-image-inspection") replayFile.mime = "image/png";
    else replayFile.data = Buffer.from("not-the-retained-png").toString("base64");
    const corruptRef = await storeEvidence(root,"article-11223344-abcd-abcd-abcd-0123456789ab",corruptReplay);
    await assert.rejects(validateExecutionEvidence(root,corruptRef),/IMAGE_BINDING/);
  }
});

test("2.2.6 visual attachments reject MIME, signature, bytes, name, reference and pass mismatches", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1WsAAAAASUVORK5CYII=", "base64");
  const webp = await readFile(path.resolve("public/home-folios/dubbing-paper.webp"));
  const hero = visualFixture("hero-image-inspection",webp,"image/webp",".webp");
  const visual = visualFixture("design:visual-quality",png,"image/png",".png");

  assert.doesNotThrow(() => extractOpenCodeExecution(hero.raw,hero.visual));
  assert.doesNotThrow(() => extractOpenCodeExecution(visual.raw,visual.visual));
  for (const mutate of [
    (raw: ReturnType<typeof fixture>) => { raw.messages[0].files![0].mime = "image/png"; },
    (raw: ReturnType<typeof fixture>) => { raw.messages[0].files![0].data = png.toString("base64"); },
    (raw: ReturnType<typeof fixture>) => { raw.messages[0].files![0].name = "other.webp"; },
  ]) {
    const raw = structuredClone(hero.raw); mutate(raw);
    assert.throws(() => extractOpenCodeExecution(raw,hero.visual),/IMAGE_BINDING/);
  }
  const wrongSignature = visualFixture("design:visual-quality",Buffer.from("not-png"),"image/png",".png");
  assert.throws(() => extractOpenCodeExecution(wrongSignature.raw,wrongSignature.visual),/IMAGE_BINDING/);
  assert.throws(() => extractOpenCodeExecution(visual.raw,{...visual.visual,imageRefs:[]}),/IMAGE_BINDING/);
  assert.throws(() => extractOpenCodeExecution(visual.raw,{...visual.visual,imageRefs:[{...visual.image,sha256:"0".repeat(64)}]}),/IMAGE_BINDING/);
  assert.throws(() => extractOpenCodeExecution(visual.raw,{...visual.visual,pass:"content-assessment"}),/IMAGE_BINDING/);
  assert.throws(() => extractOpenCodeExecution(visual.raw,{...visual.visual,pass:"hero-image-inspection"}),/IMAGE_BINDING/);
});
