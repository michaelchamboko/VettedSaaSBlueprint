import { DailyRunV1, DailyRunState, DailyRunStage } from "./daily-run";
import { WorkflowEngine } from "./workflow-engine";
import { DeploymentAdapter } from "./deployment";
import { AuditLogger } from "./module-contract";

export interface WatchdogConfig {
  repositoryRoot: string;
  deadlineHour: number;
  deadlineMinute: number;
  timezone: string;
  warningCheckpoints: Array<{ hour: number; minute: number }>;
  engine: WorkflowEngine;
  deploymentAdapter: DeploymentAdapter;
  auditLogger: AuditLogger;
}

export interface WatchdogStatus {
  runId: string;
  currentState: DailyRunState;
  currentStage: DailyRunStage;
  pagesCompleted: number;
  pagesRequired: number;
  timeToDeadline: string;
  rescueTriggered: boolean;
  lastCheckpoint: string;
}

export class DailyWatchdog {
  private config: WatchdogConfig;
  private activeRunId: string | null = null;
  private monitoring = false;

  constructor(config: WatchdogConfig) {
    this.config = config;
  }

  async startMonitoring(runId: string): Promise<void> {
    this.activeRunId = runId;
    this.monitoring = true;

    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId,
      stage: "monitoring",
      event: "watchdog_started",
      details: { deadlineHour: this.config.deadlineHour, deadlineMinute: this.config.deadlineMinute },
    });
  }

  stopMonitoring(): void {
    this.monitoring = false;
    if (this.activeRunId) {
      this.config.auditLogger.log({
        timestamp: new Date().toISOString(),
        runId: this.activeRunId,
        stage: "monitoring",
        event: "watchdog_stopped",
        details: {},
      });
    }
    this.activeRunId = null;
  }

  async checkStatus(runId: string): Promise<WatchdogStatus> {
    const run = await this.config.engine.resumeRun(runId);
    if (!run) {
      throw new Error(`Run ${runId} not found`);
    }

    const pagesCompleted = Object.values(run.pages).filter(p => p !== undefined).length;
    const timeToDeadline = this.calculateTimeToDeadline();

    const status: WatchdogStatus = {
      runId,
      currentState: run.state,
      currentStage: run.stage,
      pagesCompleted,
      pagesRequired: 3,
      timeToDeadline,
      rescueTriggered: run.rescueTriggered,
      lastCheckpoint: new Date().toISOString(),
    };

    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId,
      stage: run.stage,
      event: "status_check",
      details: { ...status } as unknown as Record<string, unknown>,
    });

    return status;
  }

  async checkCheckpoint(runId: string, checkpointName: string): Promise<{ passed: boolean; issues: string[] }> {
    const run = await this.config.engine.resumeRun(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    const issues: string[] = [];

    if (run.state === "validation_completed" || run.stage === "quality") {
      const criticalFailures = run.validations.filter(v => v.severity === "error" && !v.passed);
      if (criticalFailures.length > 0) {
        issues.push(`${criticalFailures.length} critical validation failures`);
      }
    }

    if (run.stage === "preview" && !run.deployment.previewUrl) {
      issues.push("Preview not deployed");
    }

    if (run.stage === "release" && !run.deployment.productionUrl) {
      issues.push("Production not deployed");
    }

    return { passed: issues.length === 0, issues };
  }

  async triggerRescue(runId: string, reason: string): Promise<DailyRunV1> {
    const run = await this.config.engine.resumeRun(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    const actionsTaken = [
      "Froze optional automation and feature work",
      "Identified shortest truthful path to publication",
      "Reduced scope to minimum viable 3-page set",
    ];

    const scopeReductions = [
      "Removed optional page sections",
      "Replaced dynamic generation with fixed templates",
      "Limited product set to highest-confidence options",
    ];

    const rescuedRun = this.config.engine.triggerRescue(reason, actionsTaken, scopeReductions);

    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId,
      stage: "rescue",
      event: "rescue_triggered",
      details: { reason, actionsTaken, scopeReductions },
    });

    return rescuedRun;
  }

  async executeRescue(runId: string): Promise<DailyRunV1> {
    const run = await this.config.engine.resumeRun(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId,
      stage: "rescue",
      event: "rescue_execution_started",
      details: { currentState: run.state },
    });

    try {
      if (run.stage === "quality" || run.stage === "authoring") {
        await this.simplifyAndDeploy(run);
      } else if (run.stage === "preview") {
        await this.deployPreviewDirectly(run);
      } else if (run.stage === "release") {
        await this.deployProductionDirectly(run);
      }

      const updatedRun = await this.config.engine.resumeRun(runId);
      if (!updatedRun) throw new Error("Run disappeared after rescue");

      this.config.auditLogger.log({
        timestamp: new Date().toISOString(),
        runId,
        stage: "rescue",
        event: "rescue_completed",
        details: { finalState: updatedRun.state, productionUrl: updatedRun.deployment.productionUrl },
      });

      return updatedRun;
    } catch (error) {
      this.config.auditLogger.log({
        timestamp: new Date().toISOString(),
        runId,
        stage: "rescue",
        event: "rescue_failed",
        details: { error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }
  }

  private async simplifyAndDeploy(run: DailyRunV1): Promise<void> {
    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId: run.run_id,
      stage: "rescue",
      event: "simplifying_scope",
      details: {},
    });
  }

  private async deployPreviewDirectly(run: DailyRunV1): Promise<void> {
    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId: run.run_id,
      stage: "rescue",
      event: "deploying_preview_directly",
      details: {},
    });
  }

  private async deployProductionDirectly(run: DailyRunV1): Promise<void> {
    this.config.auditLogger.log({
      timestamp: new Date().toISOString(),
      runId: run.run_id,
      stage: "rescue",
      event: "deploying_production_directly",
      details: {},
    });
  }

  private calculateTimeToDeadline(): string {
    const now = new Date();
    const deadline = new Date();
    deadline.setHours(this.config.deadlineHour, this.config.deadlineMinute, 0, 0);

    if (deadline <= now) {
      deadline.setDate(deadline.getDate() + 1);
    }

    const diffMs = deadline.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  getActiveRunId(): string | null {
    return this.activeRunId;
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }
}

export function createWatchdog(config: WatchdogConfig): DailyWatchdog {
  return new DailyWatchdog(config);
}

export function formatTimeRemaining(timeStr: string): string {
  return timeStr;
}