import assert from "node:assert/strict";
import test from "node:test";
import { extractOpenCodeExecution, proseProjectionDigest } from "../src/lib/article-import/execution-evidence";
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
  assert.equal(normalizeOpenCodeVersion("opencode v2.2.5\n"), "2.2.5");
  assert.equal(normalizeOpenCodeVersion("1.19.4"), "1.19.4");
  assert.equal(normalizeOpenCodeVersion("opencode v2.2.6"), "2.2.6");
  assert.equal(normalizeOpenCodeVersion("2.2.6"), "2.2.6");
  for (const version of ["2.2.5-preview", "prefix 2.2.5", "opencode v1.19.4", "opencode v2.2.7", "3.0.0"]) assert.throws(() => normalizeOpenCodeVersion(version));
  assert.deepEqual(openCodeExportArgs("2.2.5", "session"), ["session", "export", "session"]);
  assert.deepEqual(openCodeExportArgs("2.2.6", "session"), ["session", "export", "session"]);

test("2.2.6 real export shape is accepted and reasoning is excluded", () => {
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
  assert.deepEqual(openCodeExportArgs("1.19.4", "session"), ["export", "session"]);
});
