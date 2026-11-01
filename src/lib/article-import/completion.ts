import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { externalArticleImportSchema, type ExternalArticleImportV1 } from "./contracts";

export type CompletionStatus = "WORK" | "REPAIR" | "WAIT" | "BLOCKED" | "COMPLETE";
export type CompletionInspection = {
  status: CompletionStatus;
  importId: string;
  stage: ExternalArticleImportV1["stage"];
  continuation?: ExternalArticleImportV1["continuation"];
  nextAction: string;
  blockerScope?: "article" | "shared";
  resumptionRequirement?: string;
  workPath?: string;
  resultPath?: string;
};

function packetPaths(nextAction: string): { workPath?: string; resultPath?: string } {
  const match = nextAction.match(/execute\s+(\S+\.work\.json),\s+write\s+its\s+result\s+to\s+(\S+\.result\.json)/i);
  return match ? { workPath: match[1], resultPath: match[2] } : {};
}

export async function inspectImportCompletion(repositoryRoot: string, importId: string): Promise<CompletionInspection> {
  const file = path.join(repositoryRoot, ".automation", "article-imports", `${importId}.json`);
  const record = externalArticleImportSchema.parse(JSON.parse(await readFile(file, "utf8")));
  const paths = packetPaths(record.nextAction);
  if (record.stage === "LIVE" || record.stage === "QUARANTINED") return { status: "COMPLETE", importId, stage: record.stage, continuation: record.continuation, nextAction: record.nextAction, ...paths };
  if (record.continuation?.kind === "blocked") return { status: "BLOCKED", importId, stage: record.stage, continuation: record.continuation, nextAction: record.nextAction, blockerScope: record.continuation.scope, resumptionRequirement: record.continuation.resumptionRequirement, ...paths };
  if (record.stage === "WAITING_EXTERNAL" || record.continuation?.kind === "wait") return { status: "WAIT", importId, stage: record.stage, continuation: record.continuation, nextAction: record.nextAction, ...paths };
  if (record.stage === "REPAIRING" || record.continuation?.kind === "repair" || record.stageReceipts.at(-1)?.status === "failed") return { status: "REPAIR", importId, stage: record.stage, continuation: record.continuation, nextAction: record.nextAction, ...paths };
  if (paths.resultPath) {
    try { await access(path.resolve(repositoryRoot, paths.resultPath)); } catch { return { status: "WORK", importId, stage: record.stage, continuation: record.continuation, nextAction: record.nextAction, ...paths }; }
  }
  return { status: "WORK", importId, stage: record.stage, continuation: record.continuation, nextAction: record.nextAction, ...paths };
}
