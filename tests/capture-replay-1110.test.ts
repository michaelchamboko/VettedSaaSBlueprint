import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractOpenCodeExecution, validateExecutionEvidence, storeEvidence } from "../src/lib/article-import/execution-evidence";
import { proseProjectionDigest } from "../src/lib/article-import/execution-evidence";

const input = { artifact: "complete synthetic artifact" };
const output = { judgment: "synthetic judgment" };
const packetId = "a".repeat(64);

test("missing replay blocks validation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cr-"));
  try {
    await mkdir(path.join(root, "config"), { recursive: true });
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "1.19.4", modelFamilies: { "provider/model": "family" } }));
    const execution = extractOpenCodeExecution({ info: { id: "session" }, messages: [
      { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }) }] },
      { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 2 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
    ] }, { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } });
    const { replay: _r, ...withoutReplay } = execution;
    void _r;
    const ref = await storeEvidence(root, "article-00000000-0000-4000-8000-000000000001", withoutReplay);
    await assert.rejects(validateExecutionEvidence(root, ref), /EXECUTION_REPLAY_MISSING/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("genuine replay passes validation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cr-"));
  try {
    await mkdir(path.join(root, "config"), { recursive: true });
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "1.19.4", modelFamilies: { "provider/model": "family" } }));
    const execution = extractOpenCodeExecution({ info: { id: "session" }, messages: [
      { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }) }] },
      { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 2 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
    ] }, { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } });
    const ref = await storeEvidence(root, "article-00000000-0000-4000-8000-000000000001", execution);
    const validated = await validateExecutionEvidence(root, ref);
    assert.equal(validated.kind, "opencode");
    assert.equal(JSON.stringify(validated).includes("private reasoning"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("literal wrapper + file envelope is rejected", () => {
  const wrapped = 'Do not use any tools.\n<file name="envelope.json">\n{"packetId":"' + packetId + '"}\n</file>';
  assert.throws(() => extractOpenCodeExecution({ info: { id: "session" }, messages: [
    { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: wrapped }] },
    { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 2 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
  ] }, { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } }), /Unexpected token|SyntaxError/);
});

test("file attachments are rejected", () => {
  assert.throws(() => extractOpenCodeExecution({ info: { id: "session" }, messages: [
    { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "file", text: "hidden" }] },
    { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 2 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
  ] }, { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } }), /EVIDENCE_UNSUPPORTED/);
});

test("mismatched selected IDs are rejected", () => {
  assert.throws(() => extractOpenCodeExecution({ info: { id: "session" }, messages: [
    { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }) }] },
    { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 2 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
  ] }, { version: "1.19.4", sessionId: "session", userMessageId: "other", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } }), /EVIDENCE_UNSUPPORTED|EXECUTION_MESSAGE_MISMATCH|EXECUTION_SESSION_MISMATCH/);
});

test("incomplete finish/time is rejected", () => {
  assert.throws(() => extractOpenCodeExecution({ info: { id: "session" }, messages: [
    { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }) }] },
    { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 0 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
  ] }, { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } }), /EXECUTION_INCOMPLETE/);
});

test("tampered output with recomputed digest is rejected by replay", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "cr-"));
  try {
    await mkdir(path.join(root, "config"), { recursive: true });
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "1.19.4", modelFamilies: { "provider/model": "family" } }));
    const execution = extractOpenCodeExecution({ info: { id: "session" }, messages: [
      { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }) }] },
      { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 2 }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(output) }] },
    ] }, { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } });
    const tamperedOutput = { judgment: "tampered" };
    const tampered = { ...execution, output: tamperedOutput, outputDigest: proseProjectionDigest(tamperedOutput) };
    const ref = await storeEvidence(root, "article-00000000-0000-4000-8000-000000000001", tampered);
    await assert.rejects(validateExecutionEvidence(root, ref), /EXECUTION_PROSE_MISMATCH/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

// v2 roundtrip tests
const v2input = { artifact: "complete synthetic artifact" };
const v2output = { judgment: "synthetic judgment" };

function v2raw() {
  const model = { providerID: "opencode-go", id: "beam-free", variant: "default" };
  return { info: { id: "ses_real", model, outcome: "succeeded" }, messages: [
    { id: "msg_user", type: "user", text: JSON.stringify({ packetId, pass: "review", prose: v2input, digest: proseProjectionDigest(v2input), instructions: [] }), files: [], time: { created: 1 } },
    { id: "msg_assistant", type: "assistant", agent: "build", model, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", rawFinish: "stop", cost: 0, tokens: { input: 1, output: 1, reasoning: 1, cache: { read: 0, write: 0 } }, snapshot: { start: "abc", end: "abc", files: [] }, content: [{ type: "reasoning", text: "private reasoning", native: { reasoningField: "reasoning_content" }, time: { created: 2, completed: 3 } }, { type: "text", text: JSON.stringify(v2output) }] },
    { id: "msg_idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
  ] };
}

test("v2.2.6 capture -> extract(replay.export) -> validate roundtrip", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "v2rt-"));
  try {
    await mkdir(path.join(root, "config"), { recursive: true });
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "2.2.6", modelFamilies: { "opencode-go/beam-free": "reflection-beam" } }));
    const selected = { version: "2.2.6", sessionId: "ses_real", userMessageId: "msg_user", assistantMessageId: "msg_assistant", packetId, pass: "review", input: v2input, output: v2output, families: { "opencode-go/beam-free": "reflection-beam" } };
    const raw = v2raw();
    const captured = extractOpenCodeExecution(raw, selected);
    assert.ok(captured.replay);
    assert.equal(JSON.stringify(captured.replay!.export).includes("private reasoning"), false);
    const replayed = extractOpenCodeExecution(captured.replay!.export, { ...selected, inputRefs: captured.replay!.inputRefs, outputRefs: captured.replay!.outputRefs, instructions: captured.instructions });
    assert.equal(replayed.kind, "opencode");
    const ref = await storeEvidence(root, "article-00000000-0000-4000-8000-000000000001", captured);
    const validated = await validateExecutionEvidence(root, ref);
    assert.equal(validated.kind, "opencode");
    assert.equal(JSON.stringify(validated).includes("private reasoning"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
// Positive roundtrip: 1.19.4
test("1.19.4 capture -> extract(replay.export) -> validate roundtrip", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "v1rt-"));
  try {
    await mkdir(path.join(root, "config"), { recursive: true });
    await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: "1.19.4", modelFamilies: { "provider/model": "family" } }));
    const input = { artifact: "  spaced \n source text  " };
    const output = { judgment: "  retained output  " };
    const raw = { info: { id: "session", unrelatedMetadata: "must-not-survive" }, messages: [
      { info: { id: "other", role: "user", sessionID: "session" }, parts: [{ type: "text", text: "unrelated history" }] },
      { info: { id: "user", role: "user", sessionID: "session" }, parts: [{ type: "text", text: JSON.stringify({ packetId, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }) }] },
      { info: { id: "answer", role: "assistant", sessionID: "session", parentID: "user", providerID: "provider", modelID: "model", time: { created: 1, completed: 2 }, finish: "stop", unrelatedMetadata: "must-not-survive" }, parts: [{ type: "reasoning", text: "private reasoning" }, { type: "text", text: JSON.stringify(output) }] },
    ] };
    const selected = { version: "1.19.4", sessionId: "session", userMessageId: "user", assistantMessageId: "answer", packetId, pass: "review", input, output, families: { "provider/model": "family" } };
    const originalUserText = raw.messages[1].parts[0].text;
    const captured = extractOpenCodeExecution(raw, selected);
    assert.ok(captured.replay);
    assert.equal(captured.replay!.export.messages[0].parts[0].text, originalUserText);
    assert.equal(JSON.stringify(captured.replay!.export).includes("private reasoning"), false);
    assert.equal(JSON.stringify(captured.replay!.export).includes("unrelated history"), false);
    assert.equal(JSON.stringify(captured.replay!.export).includes("unrelatedMetadata"), false);
    const replayed = extractOpenCodeExecution(captured.replay!.export, { ...selected, inputRefs: captured.replay!.inputRefs, outputRefs: captured.replay!.outputRefs, instructions: captured.instructions });
    assert.equal(replayed.kind, "opencode");
    const ref = await storeEvidence(root, "article-00000000-0000-4000-8000-000000000001", captured);
    const validated = await validateExecutionEvidence(root, ref);
    assert.equal(validated.kind, "opencode");
    assert.equal(JSON.stringify(validated).includes("private reasoning"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

for (const version of ["2.2.5", "2.2.6"] as const) {
  for (const wrap of [false, true]) {
    test(`${version} ${wrap ? "API {data:raw}" : "raw"} capture -> extract(replay.export) -> validate roundtrip`, async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "v2rt-"));
      try {
        await mkdir(path.join(root, "config"), { recursive: true });
        await writeFile(path.join(root, "config/article-workflow-capabilities.json"), JSON.stringify({ schemaVersion: "ArticleWorkflowCapabilitiesV1", openCodeVersion: version, modelFamilies: { "opencode-go/beam-free": "reflection-beam" } }));
        const input = { artifact: "  spaced \n source text  " };
        const output = { judgment: "  retained output  " };
        const packet = "a".repeat(64);
        const model = { providerID: "opencode-go", id: "beam-free", variant: "default" };
        const rawInner = { info: { id: "ses_real", model, outcome: "succeeded", unrelatedMetadata: "must-not-survive" }, messages: [
          { id: "msg_user", type: "user", text: JSON.stringify({ packetId: packet, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }), files: [], time: { created: 1 } },
          { id: "msg_assistant", type: "assistant", agent: "build", model, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", rawFinish: "stop", cost: 0, tokens: { input: 1, output: 1, reasoning: 1, cache: { read: 0, write: 0 } }, snapshot: { start: "abc", end: "abc", files: [] }, content: [{ type: "reasoning", text: "private reasoning", native: { reasoningField: "reasoning_content" }, time: { created: 2, completed: 3 } }, { type: "text", text: JSON.stringify(output) }] },
          { id: "msg_idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
        ] };
        const raw = wrap ? { data: rawInner } : rawInner;
        const selected = { version, sessionId: "ses_real", userMessageId: "msg_user", assistantMessageId: "msg_assistant", packetId: packet, pass: "review", input, output, families: { "opencode-go/beam-free": "reflection-beam" } };
        const originalUserText = wrap
          ? (raw as { data: { messages: Array<{ text: string }> } }).data.messages[0].text
          : (raw as { messages: Array<{ text: string }> }).messages[0].text;
        const captured = extractOpenCodeExecution(raw, selected);
        assert.ok(captured.replay);
        assert.equal((captured.replay!.export as { messages: Array<{ text: string }> }).messages[0].text, originalUserText);
        assert.equal(JSON.stringify(captured.replay!.export).includes("private reasoning"), false);
        assert.equal(JSON.stringify(captured.replay!.export).includes("unrelatedMetadata"), false);
        const replayed = extractOpenCodeExecution(captured.replay!.export, { ...selected, inputRefs: captured.replay!.inputRefs, outputRefs: captured.replay!.outputRefs, instructions: captured.instructions });
        assert.equal(replayed.kind, "opencode");
        const ref = await storeEvidence(root, "article-00000000-0000-4000-8000-000000000001", captured);
        const validated = await validateExecutionEvidence(root, ref);
        assert.equal(validated.kind, "opencode");
        assert.equal(JSON.stringify(validated).includes("private reasoning"), false);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
}

test("capture-replay table-driven validator rejects", async () => {
  const version = "2.2.6";
  const packet = "a".repeat(64);
  const model = { providerID: "opencode-go", id: "beam-free", variant: "default" };
  const input = { artifact: "complete synthetic artifact" };
  const output = { judgment: "synthetic judgment" };
  function makeRaw() {
    return { info: { id: "ses_real", model, outcome: "succeeded" }, messages: [
      { id: "msg_user", type: "user", text: JSON.stringify({ packetId: packet, pass: "review", prose: input, digest: proseProjectionDigest(input), instructions: [] }), files: [], time: { created: 1 } },
      { id: "msg_assistant", type: "assistant", agent: "build", model, time: { created: 2, streamed: 3, completed: 4 }, finish: "stop", rawFinish: "stop", cost: 0, tokens: { input: 1, output: 1, reasoning: 1, cache: { read: 0, write: 0 } }, snapshot: { start: "abc", end: "abc", files: [] }, content: [{ type: "text", text: JSON.stringify(output) }] },
      { id: "msg_idle", type: "idle", outcome: "succeeded", time: { created: 5 } },
    ] };
  }
  const baseSelected = { version, sessionId: "ses_real", userMessageId: "msg_user", assistantMessageId: "msg_assistant", packetId, pass: "review", input, output, families: { "opencode-go/beam-free": "reflection-beam" } };

  const cases: Array<{ name: string; mutate: () => { raw: ReturnType<typeof makeRaw>; selected: typeof baseSelected }; pattern: RegExp }> = [
    { name: "changed session ID", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, sessionId: "other" } }), pattern: /SESSION_MISMATCH/ },
    { name: "changed user message ID", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, userMessageId: "other" } }), pattern: /MESSAGE_MISMATCH|UNSUPPORTED/ },
    { name: "changed assistant message ID", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, assistantMessageId: "other" } }), pattern: /MESSAGE_MISMATCH|UNSUPPORTED/ },
    { name: "changed model", mutate: () => {
      const raw = makeRaw();
      raw.messages[1].model = { providerID: "other", id: "model", variant: "default" };
      raw.info.model = { providerID: "other", id: "model", variant: "default" };
      return { raw, selected: { ...baseSelected, families: baseSelected.families } };
    }, pattern: /CAPABILITY_UNAVAILABLE/ },
    { name: "changed timestamps", mutate: () => {
      const raw = makeRaw();
      raw.messages[1].time.completed = 0;
      return { raw, selected: baseSelected };
    }, pattern: /INCOMPLETE/ },
    { name: "changed packet", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, packetId: "b".repeat(64) } }), pattern: /PROSE_MISMATCH/ },
    { name: "changed pass", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, pass: "other" } }), pattern: /PROSE_MISMATCH/ },
    { name: "changed input", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, input: { artifact: "changed" } } }), pattern: /PROSE_MISMATCH/ },
    { name: "changed output", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, output: { judgment: "changed" } } }), pattern: /PROSE_MISMATCH/ },
    { name: "changed instructions", mutate: () => ({ raw: makeRaw(), selected: { ...baseSelected, instructions: [{ path: "skill.md", sha256: "c".repeat(64), text: "unseen" }] } }), pattern: /INSTRUCTION_MISMATCH/ },
  ];
  for (const item of cases) {
    const { raw, selected } = item.mutate();
    assert.throws(() => extractOpenCodeExecution(raw, selected), item.pattern, item.name);
  }
  const apiRaw = { data: makeRaw() };
  assert.throws(() => extractOpenCodeExecution(apiRaw, { ...baseSelected, sessionId: "other" }), /SESSION_MISMATCH/);
});
