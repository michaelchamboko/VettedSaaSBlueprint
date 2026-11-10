import { executionEvidenceSchema, extractOpenCodeExecution } from "../../src/lib/article-import/execution-evidence";

export function recaptureStoredExchange(
  value: unknown,
  inputRefs: Array<{ path: string; sha256: string }>,
  outputRefs: Array<{ path: string; sha256: string }>,
) {
  const execution = executionEvidenceSchema.parse(value);
  if (execution.kind !== "opencode") throw new Error("Expected a captured model exchange");
  return extractOpenCodeExecution(
    { info: { id: execution.sessionId }, messages: [
      { info: { id: execution.userMessageId, role: "user", sessionID: execution.sessionId }, parts: [{ type: "text", text: JSON.stringify({ packetId: execution.packetId, pass: execution.pass, prose: execution.input, digest: execution.inputDigest, instructions: execution.instructions }) }] },
      { info: { id: execution.assistantMessageId, role: "assistant", sessionID: execution.sessionId, parentID: execution.userMessageId, providerID: execution.providerId, modelID: execution.modelId, time: { created: Date.parse(execution.startedAt), completed: Date.parse(execution.completedAt) }, finish: "stop" }, parts: [{ type: "text", text: JSON.stringify(execution.output) }] },
    ] },
    { version: execution.toolVersion, sessionId: execution.sessionId, userMessageId: execution.userMessageId, assistantMessageId: execution.assistantMessageId, packetId: execution.packetId, pass: execution.pass, input: execution.input, output: execution.output, instructions: execution.instructions, families: { [`${execution.providerId}/${execution.modelId}`]: execution.family }, inputRefs, outputRefs },
  );
}