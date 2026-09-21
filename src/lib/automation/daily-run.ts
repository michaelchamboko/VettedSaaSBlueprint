import { createHash, randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type EvidenceState = "validated" | "partial" | "insufficient" | "conflicting";

export type EvidenceReference = {
  source: string;
  section?: string;
  quote?: string;
  url?: string;
  accessedAt: string;
};

export type DecisionEvidence = {
  statement: string;
  state: EvidenceState;
  sources: EvidenceReference[];
  confidence: number;
};

export type DecisionBlock = {
  heading: string;
  summary: string;
  evidence: DecisionEvidence[];
};

export type DecisionPageRecord = {
  pageType: "Decision Hub" | "Solution Hub" | "Decision Scenario";
  canonicalPath: string;
  headline: string;
  objective: string;
  context: string;
  constraints: string[];
  blocks: DecisionBlock[];
  previousPath?: string;
  nextPath?: string;
  reviewDate: string;
  disclosure: string;
  evidenceVersion: string;
};

export type DailyRunScope = {
  customerProblem: string;
  desiredOutcome: string;
  targetAudience: string;
  relevantCategory: string;
  initialProducts: string[];
  affiliateAvailability: Record<string, boolean>;
  targetProductionDate: string;
};

export type DailyRunState =
  | "scope_selected"
  | "questions_discovered"
  | "source_plan_created"
  | "evidence_retrieved"
  | "evidence_normalised"
  | "calculations_completed"
  | "pages_assembled"
  | "validation_completed"
  | "preview_rendered"
  | "production_deployed"
  | "release_verified"
  | "improvements_scheduled"
  | "rescue_active"
  | "blocked"
  | "failed";

export type DailyRunStage =
  | "scope_selection"
  | "research"
  | "authoring"
  | "quality"
  | "preview"
  | "release"
  | "production_verification"
  | "complete"
  | "rescue";

export type ModelCall = {
  model: string;
  provider: string;
  task: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  timestamp: string;
  success: boolean;
  error?: string;
};

export type ValidationResult = {
  checkName: string;
  passed: boolean;
  details: string;
  severity: "error" | "warning" | "info";
  autoRepairable: boolean;
};

export type DeploymentResult = {
  previewUrl?: string;
  previewDeploymentId?: string;
  productionUrl?: string;
  productionDeploymentId?: string;
  productionCommit?: string;
  verifiedAt?: string;
  checks: Record<string, boolean>;
};

export type AuditEntry = {
  timestamp: string;
  event: string;
  details: Record<string, unknown>;
  runId: string;
  stage: DailyRunStage;
};

export type DailyRunV1 = {
  schema_version: "DailyRunV1";
  run_id: string;
  scope: DailyRunScope;
  state: DailyRunState;
  stage: DailyRunStage;
  pages: {
    decisionHub?: DecisionPageRecord;
    solutionHub?: DecisionPageRecord;
    decisionScenario?: DecisionPageRecord;
  };
  evidence: {
    questions: string[];
    sourcePlan: Record<string, unknown>;
    rawEvidence: Record<string, unknown>;
    normalizedEvidence: DecisionEvidence[];
    calculations: Record<string, unknown>;
    evidenceVersion: string;
  };
  modelCalls: ModelCall[];
  validations: ValidationResult[];
  deployment: DeploymentResult;
  auditLog: AuditEntry[];
  rescueTriggered: boolean;
  rescueDetails?: {
    triggeredAt: string;
    reason: string;
    actionsTaken: string[];
    scopeReductions: string[];
  };
  created_at: string;
  updated_at: string;
  next_action: {
    kind: string;
    description: string;
    targetStage?: DailyRunStage;
  };
};

type PlainEnglishEvidence = {
  summary: string;
  attempted: string;
  affected_field?: string;
};

function fingerprint(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function runFileFor(repositoryRoot: string, runId: string): string {
  return path.join(
    path.resolve(repositoryRoot),
    ".stage2",
    "daily-runs",
    runId,
    "run.json",
  );
}

async function persistRun(runFile: string, run: DailyRunV1): Promise<void> {
  await mkdir(path.dirname(runFile), { recursive: true });
  const temporaryFile = `${runFile}.${process.pid}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  await rename(temporaryFile, runFile);
}

export function createInitialDailyRun(scope: DailyRunScope): DailyRunV1 {
  const now = new Date().toISOString();
  const runId = `daily-${randomUUID()}`;
  return {
    schema_version: "DailyRunV1",
    run_id: runId,
    scope,
    state: "scope_selected",
    stage: "scope_selection",
    pages: {},
    evidence: {
      questions: [],
      sourcePlan: {},
      rawEvidence: {},
      normalizedEvidence: [],
      calculations: {},
      evidenceVersion: fingerprint(JSON.stringify(scope)),
    },
    modelCalls: [],
    validations: [],
    deployment: { checks: {} },
    auditLog: [{
      timestamp: now,
      event: "run_created",
      details: { scope: scope.customerProblem },
      runId,
      stage: "scope_selection",
    }],
    rescueTriggered: false,
    created_at: now,
    updated_at: now,
    next_action: {
      kind: "discover_questions",
      description: "Discover real customer questions and pain points for the selected problem",
      targetStage: "research",
    },
  };
}

export async function saveDailyRun(
  repositoryRoot: string,
  run: DailyRunV1,
): Promise<string> {
  const runFile = runFileFor(repositoryRoot, run.run_id);
  await persistRun(runFile, run);
  return runFile;
}

export async function loadDailyRun(
  repositoryRoot: string,
  runId: string,
): Promise<DailyRunV1 | null> {
  const runFile = runFileFor(repositoryRoot, runId);
  try {
    const content = await readFile(runFile, "utf8");
    return JSON.parse(content) as DailyRunV1;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

export function advanceDailyRun(
  run: DailyRunV1,
  event: {
    kind: string;
    description: string;
    targetStage?: DailyRunStage;
    newState?: DailyRunState;
    payload?: Record<string, unknown>;
  },
): DailyRunV1 {
  const now = new Date().toISOString();
  const updated: DailyRunV1 = {
    ...run,
    state: event.newState ?? run.state,
    stage: event.targetStage ?? run.stage,
    updated_at: now,
    next_action: {
      kind: event.kind,
      description: event.description,
      targetStage: event.targetStage,
    },
    auditLog: [
      ...run.auditLog,
      {
        timestamp: now,
        event: event.kind,
        details: event.payload ?? {},
        runId: run.run_id,
        stage: event.targetStage ?? run.stage,
      },
    ],
  };
  return updated;
}

export function recordModelCall(
  run: DailyRunV1,
  call: ModelCall,
): DailyRunV1 {
  return {
    ...run,
    modelCalls: [...run.modelCalls, call],
    updated_at: new Date().toISOString(),
  };
}

export function recordValidation(
  run: DailyRunV1,
  validation: ValidationResult,
): DailyRunV1 {
  return {
    ...run,
    validations: [...run.validations, validation],
    updated_at: new Date().toISOString(),
  };
}

export function recordDeployment(
  run: DailyRunV1,
  deployment: Partial<DeploymentResult>,
): DailyRunV1 {
  return {
    ...run,
    deployment: { ...run.deployment, ...deployment },
    updated_at: new Date().toISOString(),
  };
}

export function triggerRescue(
  run: DailyRunV1,
  reason: string,
  actionsTaken: string[],
  scopeReductions: string[],
): DailyRunV1 {
  const now = new Date().toISOString();
  return {
    ...run,
    state: "rescue_active",
    stage: "rescue",
    rescueTriggered: true,
    rescueDetails: {
      triggeredAt: now,
      reason,
      actionsTaken,
      scopeReductions,
    },
    updated_at: now,
    next_action: {
      kind: "rescue_publish",
      description: "Execute premium rescue: reduce scope, replace failed automation, deploy directly",
      targetStage: "release",
    },
    auditLog: [
      ...run.auditLog,
      {
        timestamp: now,
        event: "rescue_triggered",
        details: { reason, actionsTaken, scopeReductions },
        runId: run.run_id,
        stage: "rescue",
      },
    ],
  };
}

export function listDailyRuns(repositoryRoot: string): string[] {
  const runsDir = path.join(path.resolve(repositoryRoot), ".stage2", "daily-runs");
  try {
    const entries = readdirSync(runsDir, { withFileTypes: true });
    return entries
      .filter((e: { isDirectory: () => boolean }) => e.isDirectory())
      .map((e: { name: string }) => e.name)
      .sort()
      .reverse();
  } catch {
    return [];
  }
}