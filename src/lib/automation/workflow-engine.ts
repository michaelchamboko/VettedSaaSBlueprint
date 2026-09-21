import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { DailyRunV1, DailyRunState, DailyRunStage, createInitialDailyRun, saveDailyRun, loadDailyRun, advanceDailyRun, recordModelCall, recordValidation, recordDeployment, triggerRescue, listDailyRuns } from "./daily-run";
import { nextDailyRunState, canTransitionDailyRun, DailyRunState as DailyRunStateType, WorkflowEvent, getStageForState } from "./state-machine";
import { ModuleContract, ModuleExecutionContext, ModuleResult, AutomationModule, ModelGateway, DeterministicServices, AuditLogger, ModelCall, ValidationCheck } from "./module-contract";

export interface WorkflowEngineConfig {
  repositoryRoot: string;
  evidenceRoot: string;
  modelGateway: ModelGateway;
  services: DeterministicServices;
  auditLogger: AuditLogger;
  modules: Map<string, AutomationModule>;
}

export interface Checkpoint {
  runId: string;
  state: DailyRunState;
  stage: DailyRunStage;
  completedModules: string[];
  moduleOutputs: Record<string, unknown>;
  timestamp: string;
}

export class WorkflowEngine {
  private config: WorkflowEngineConfig;
  private currentRun: DailyRunV1 | null = null;
  private checkpoints: Map<string, Checkpoint> = new Map();

  constructor(config: WorkflowEngineConfig) {
    this.config = config;
  }

  async startNewRun(scope: DailyRunV1["scope"]): Promise<DailyRunV1> {
    const run = createInitialDailyRun(scope);
    this.currentRun = run;
    await saveDailyRun(this.config.repositoryRoot, run);
    this.createCheckpoint(run, [], {});
    return run;
  }

  async resumeRun(runId: string): Promise<DailyRunV1 | null> {
    const run = await loadDailyRun(this.config.repositoryRoot, runId);
    if (run) {
      this.currentRun = run;
      this.loadCheckpoints(runId);
    }
    return run;
  }

  async executeModule<ModuleName extends string>(
    moduleName: ModuleName,
    input: unknown,
    expectedState: DailyRunState,
    nextEvent: WorkflowEvent,
  ): Promise<ModuleResult> {
    if (!this.currentRun) {
      throw new Error("No active run. Call startNewRun or resumeRun first.");
    }

    if (this.currentRun.state !== expectedState) {
      throw new Error(`Run is in state ${this.currentRun.state}, expected ${expectedState}`);
    }

    const moduleDefinition = this.config.modules.get(moduleName);
    if (!moduleDefinition) {
      throw new Error(`Module ${moduleName} not registered`);
    }

    const context: ModuleExecutionContext = {
      runId: this.currentRun.run_id,
      stage: this.currentRun.stage,
      evidenceVersion: this.currentRun.evidence.evidenceVersion,
      modelGateway: this.config.modelGateway,
      services: this.config.services,
      auditLogger: this.config.auditLogger,
    };

    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId: this.currentRun.run_id,
      stage: this.currentRun.stage,
      event: `module_start:${moduleName}`,
      details: { module: moduleName, inputKeys: Object.keys(input as Record<string, unknown>) },
    });

    const idempotencyKey = moduleDefinition.getIdempotencyKey(input);
    const existingCheckpoint = this.checkpoints.get(`${this.currentRun.run_id}:${idempotencyKey}`);
    if (existingCheckpoint) {
      this.config.auditLogger.log({
        timestamp: new Date().toISOString(),
        runId: this.currentRun.run_id,
        stage: this.currentRun.stage,
        event: `module_skip_cached:${moduleName}`,
        details: { module: moduleName, idempotencyKey },
      });
      return {
        success: true,
        data: existingCheckpoint.moduleOutputs[moduleName],
        evidenceReferences: [],
        confidence: 1.0,
        modelCalls: [],
        validationResults: [],
        retryable: false,
        idempotencyKey,
      };
    }

    let attempt = 0;
      const maxAttempts = moduleDefinition.contract.retry.maxAttempts;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        const result = await moduleDefinition.execute(input, context);

        if (result.success) {
          this.config.auditLogger.log({
            timestamp: new Date().toISOString(),
            runId: this.currentRun.run_id,
            stage: this.currentRun.stage,
            event: `module_success:${moduleName}`,
            details: { module: moduleName, attempt, idempotencyKey, cost: result.modelCalls.reduce((sum, c) => sum + c.costUsd, 0) },
          });

          this.updateRunWithModuleResult(moduleName, result, nextEvent);
          return result;
        }

        const retryable = result.retryable && attempt < maxAttempts;
        if (!retryable || !moduleDefinition.contract.retry.retryableErrors.some(e => result.error?.includes(e))) {
          this.config.auditLogger.log({
            timestamp: new Date().toISOString(),
            runId: this.currentRun.run_id,
            stage: this.currentRun.stage,
            event: `module_failed:${moduleName}`,
            details: { module: moduleName, attempt, error: result.error, retryable },
          });
          throw new Error(`Module ${moduleName} failed: ${result.error}`);
        }

        const backoff = this.calculateBackoff(attempt, moduleDefinition.contract.retry);
        this.config.auditLogger.log({
          timestamp: new Date().toISOString(),
          runId: this.currentRun.run_id,
          stage: this.currentRun.stage,
          event: `module_retry:${moduleName}`,
          details: { module: moduleName, attempt, backoffMs: backoff, error: result.error },
        });

        await this.sleep(backoff);
      } catch (error) {
        if (attempt >= maxAttempts) {
          this.config.auditLogger.log({
            timestamp: new Date().toISOString(),
            runId: this.currentRun.run_id,
            stage: this.currentRun.stage,
            event: `module_error:${moduleName}`,
            details: { module: moduleName, attempt, error: error instanceof Error ? error.message : String(error) },
          });
          throw error;
        }
        const backoff = this.calculateBackoff(attempt, moduleDefinition.contract.retry);
        await this.sleep(backoff);
      }
    }

    throw new Error(`Module ${moduleName} exhausted retries`);
  }

  private calculateBackoff(attempt: number, retryConfig: ModuleContract["retry"]): number {
    const base = 1000;
    switch (retryConfig.backoffPolicy) {
      case "exponential":
        return base * Math.pow(2, attempt - 1);
      case "linear":
        return base * attempt;
      case "fixed":
      default:
        return base;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateRunWithModuleResult(
    moduleName: string,
    result: ModuleResult,
    nextEvent: WorkflowEvent,
  ): void {
    if (!this.currentRun) return;

    for (const call of result.modelCalls) {
      this.currentRun = recordModelCall(this.currentRun, call);
    }

    for (const validation of result.validationResults) {
      this.currentRun = recordValidation(this.currentRun, validation);
    }

    const nextState = nextDailyRunState(this.currentRun.state, nextEvent);
    const nextStage = getStageForState(nextState);
    this.currentRun = advanceDailyRun(this.currentRun, {
      kind: nextEvent.kind,
      description: `Module ${moduleName} completed, advancing to ${nextState}`,
      targetStage: nextStage,
      newState: nextState,
      payload: { module: moduleName, idempotencyKey: result.idempotencyKey },
    });

    this.createCheckpoint(this.currentRun, [moduleName], { [moduleName]: result.data });
    this.saveCurrentRun();
  }

  private createCheckpoint(run: DailyRunV1, completedModules: string[], moduleOutputs: Record<string, unknown>): void {
    const checkpoint: Checkpoint = {
      runId: run.run_id,
      state: run.state,
      stage: run.stage,
      completedModules,
      moduleOutputs,
      timestamp: new Date().toISOString(),
    };
    this.checkpoints.set(`${run.run_id}:${run.state}`, checkpoint);
    this.persistCheckpoint(checkpoint);
  }

  private async persistCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const checkpointDir = path.join(
      path.resolve(this.config.repositoryRoot),
      ".stage2",
      "daily-runs",
      checkpoint.runId,
      "checkpoints",
    );
    await mkdir(checkpointDir, { recursive: true });
    const checkpointFile = path.join(checkpointDir, `${checkpoint.state}.json`);
    const temporaryFile = `${checkpointFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(checkpoint, null, 2), "utf8");
    await rename(temporaryFile, checkpointFile);
  }

  private async loadCheckpoints(runId: string): Promise<void> {
    const checkpointDir = path.join(
      path.resolve(this.config.repositoryRoot),
      ".stage2",
      "daily-runs",
      runId,
      "checkpoints",
    );
    try {
      const entries = readdirSync(checkpointDir);
      for (const file of entries) {
        if (file.endsWith(".json")) {
          const content = await readFile(path.join(checkpointDir, file), "utf8");
          const checkpoint = JSON.parse(content) as Checkpoint;
          this.checkpoints.set(`${checkpoint.runId}:${checkpoint.state}`, checkpoint);
        }
      }
    } catch {
      // No checkpoints directory, start fresh
    }
  }

  private async saveCurrentRun(): Promise<void> {
    if (this.currentRun) {
      await saveDailyRun(this.config.repositoryRoot, this.currentRun);
    }
  }

  async runFullCycle(scope: DailyRunV1["scope"]): Promise<DailyRunV1> {
    await this.startNewRun(scope);

    const workflow: Array<{
      module: string;
      input: (run: DailyRunV1) => unknown;
      expectedState: DailyRunState;
      nextEvent: WorkflowEvent;
    }> = [
      { module: "discover_questions", input: () => ({ scope: this.currentRun!.scope }), expectedState: "scope_selected", nextEvent: { kind: "questions_discovered" } },
      { module: "create_source_plan", input: (run) => ({ questions: run.evidence.questions, scope: run.scope }), expectedState: "questions_discovered", nextEvent: { kind: "source_plan_created" } },
      { module: "retrieve_evidence", input: (run) => ({ sourcePlan: run.evidence.sourcePlan }), expectedState: "source_plan_created", nextEvent: { kind: "evidence_retrieved" } },
      { module: "normalize_evidence", input: (run) => ({ rawEvidence: run.evidence.rawEvidence }), expectedState: "evidence_retrieved", nextEvent: { kind: "evidence_normalised" } },
      { module: "calculate_scores", input: (run) => ({ evidence: run.evidence.normalizedEvidence }), expectedState: "evidence_normalised", nextEvent: { kind: "calculations_completed" } },
      { module: "assemble_pages", input: (run) => ({ calculations: run.evidence.calculations, scope: run.scope }), expectedState: "calculations_completed", nextEvent: { kind: "pages_assembled" } },
      { module: "validate_pages", input: (run) => ({ pages: run.pages }), expectedState: "pages_assembled", nextEvent: { kind: "validation_passed" } },
      { module: "render_preview", input: (run) => ({ pages: run.pages }), expectedState: "validation_completed", nextEvent: { kind: "preview_verified" } },
      { module: "deploy_production", input: (run) => ({ pages: run.pages, previewUrl: run.deployment.previewUrl }), expectedState: "preview_rendered", nextEvent: { kind: "deploy_production" } },
      { module: "verify_production", input: (run) => ({ deployment: run.deployment }), expectedState: "production_deployed", nextEvent: { kind: "production_verified" } },
      { module: "verify_release", input: (run) => ({ productionUrl: run.deployment.productionUrl }), expectedState: "release_verified", nextEvent: { kind: "release_verified" } },
      { module: "schedule_improvements", input: (run) => ({ run }), expectedState: "improvements_scheduled", nextEvent: { kind: "improvements_scheduled" } },
    ];

    for (const step of workflow) {
      if (!this.currentRun) break;
      if (isTerminalState(this.currentRun.state)) break;

      await this.executeModule(step.module, step.input(this.currentRun), step.expectedState, step.nextEvent);
    }

    return this.currentRun!;
  }

  async triggerRescue(reason: string, actionsTaken: string[], scopeReductions: string[]): Promise<DailyRunV1> {
    if (!this.currentRun) throw new Error("No active run");

    this.currentRun = triggerRescue(this.currentRun, reason, actionsTaken, scopeReductions);
    await this.saveCurrentRun();

    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId: this.currentRun.run_id,
      stage: "rescue",
      event: "rescue_triggered",
      details: { reason, actionsTaken, scopeReductions },
    });

    return this.currentRun;
  }

  getCurrentRun(): DailyRunV1 | null {
    return this.currentRun;
  }

  listRuns(): string[] {
    return listDailyRuns(this.config.repositoryRoot);
  }
}

function isTerminalState(state: DailyRunState): boolean {
  return ["improvements_scheduled", "failed"].includes(state);
}

export function createWorkflowEngine(config: WorkflowEngineConfig): WorkflowEngine {
  return new WorkflowEngine(config);
}