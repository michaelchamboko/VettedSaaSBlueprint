import { readFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
if (args[0] === "--version") {
  process.stdout.write("fixture-exporter 1\n");
  process.exit(0);
}
if (args[0] === "export-map" && args[1] && args[2] && args[3]) {
  process.stdout.write(await readFile(path.join(args[1], `${args[2]}--${args[3]}.json`), "utf8"));
  process.exit(0);
}
if (args[0] !== "export" || !args[1] || !args[2]) throw new Error("Use export <context-id> <exchange-id>");
process.stdout.write(JSON.stringify({
  schemaVersion: "StructuredExecutionExportV1",
  exporterId: "fixture",
  tool: { name: "fixture-neutral", version: "fixture-exporter 1" },
  contextId: args[1], exchangeId: args[2],
  startedAt: "2026-11-26T00:00:00.000Z", completedAt: "2026-11-26T00:00:01.000Z",
  status: "succeeded", providerId: "fixture-provider", modelId: "fixture-model",
  packetId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  pass: "review", input: { artifact: "complete synthetic artifact" }, output: { judgment: "synthetic judgment" },
  instructions: [], inputRefs: [], outputRefs: [],
}));
