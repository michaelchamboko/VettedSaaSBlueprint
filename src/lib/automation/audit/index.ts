import { AuditLogger, AuditLogEntry } from "../module-contract";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface MetricsCollector {
  recordDailyDelivery(runId: string, pagesDeployed: number, deadlineMet: boolean, rescueTriggered: boolean): void;
  recordAutomation(premiumInterventions: number, retries: number, moduleSuccesses: number, moduleFailures: number): void;
  recordModelEconomics(model: string, task: string, costUsd: number, latencyMs: number, accepted: boolean): void;
  recordQuality(claimsWithEvidence: number, unsupportedClaims: number, corrections: number): void;
  recordProduction(deploymentSuccess: boolean, rollback: boolean, urlRegressions: number): void;
  getDailyDeliveryMetrics(): DailyDeliveryMetrics;
  getAutomationMetrics(): AutomationMetrics;
  getModelEconomicsMetrics(): ModelEconomicsMetrics;
  getQualityMetrics(): QualityMetrics;
  getProductionMetrics(): ProductionMetrics;
}

export interface DailyDeliveryMetrics {
  completePageSets: number;
  deadlineMetPercentage: number;
  productionUrlsVerified: number;
  avgTimeToProduction: number;
  rescueCount: number;
  externallyBlockedDays: number;
}

export interface AutomationMetrics {
  premiumInterventionPercentage: number;
  premiumInterventionsByTask: Record<string, number>;
  successfulRetries: number;
  failedModules: string[];
  fallbackFrequency: number;
  avgCheckpointRecoveryTime: number;
  duplicatePreventionIncidents: number;
}

export interface ModelEconomicsMetrics {
  acceptedOutputCostByTask: Record<string, Record<string, number>>;
  premiumModelCostPerPageSet: number;
  lowerCostModelAcceptanceRate: number;
  repairCostPerModel: Record<string, number>;
  tokenTrends: Record<string, number>;
  latencyTrends: Record<string, number>;
}

export interface QualityMetrics {
  materialClaimsWithEvidence: number;
  explicitInsufficientEvidence: number;
  unsupportedClaimRate: number;
  conditionalRecommendationCompliance: number;
  pagesWithNotForGuidance: number;
  brokenLinks: number;
  accessibilityFailures: number;
  postPublicationCorrections: number;
}

export interface ProductionMetrics {
  deploymentSuccessRate: number;
  previewSmokeCheckPassRate: number;
  productionSmokeCheckPassRate: number;
  rollbackFrequency: number;
  urlRedirectRegressions: number;
  indexingConfigFailures: number;
}

export function createAuditLogger(repositoryRoot: string): AuditLogger {
  const auditDir = path.join(repositoryRoot, ".stage2", "audit");
  const logs: AuditLogEntry[] = [];

  return {
    async log(entry: AuditLogEntry): Promise<void> {
      logs.push(entry);
      await persistEntry(auditDir, entry);
    },

    getRunLog(runId: string): AuditLogEntry[] {
      return logs.filter(e => e.runId === runId);
    },
  };
}

async function persistEntry(auditDir: string, entry: AuditLogEntry): Promise<void> {
  const date = new Date(entry.timestamp).toISOString().split("T")[0];
  const runDir = path.join(auditDir, date, entry.runId);
  await fs.mkdir(runDir, { recursive: true });

  const logFile = path.join(runDir, "audit.jsonl");
  const line = JSON.stringify(entry) + "\n";

  try {
    await fs.appendFile(logFile, line);
  } catch {
    // Ignore append errors
  }
}

export function createMetricsCollector(): MetricsCollector {
  const dailyDelivery: DailyDeliveryMetrics = {
    completePageSets: 0,
    deadlineMetPercentage: 0,
    productionUrlsVerified: 0,
    avgTimeToProduction: 0,
    rescueCount: 0,
    externallyBlockedDays: 0,
  };

  const automation: AutomationMetrics = {
    premiumInterventionPercentage: 0,
    premiumInterventionsByTask: {},
    successfulRetries: 0,
    failedModules: [],
    fallbackFrequency: 0,
    avgCheckpointRecoveryTime: 0,
    duplicatePreventionIncidents: 0,
  };

  const modelEconomics: ModelEconomicsMetrics = {
    acceptedOutputCostByTask: {},
    premiumModelCostPerPageSet: 0,
    lowerCostModelAcceptanceRate: 0,
    repairCostPerModel: {},
    tokenTrends: {},
    latencyTrends: {},
  };

  const quality: QualityMetrics = {
    materialClaimsWithEvidence: 0,
    explicitInsufficientEvidence: 0,
    unsupportedClaimRate: 0,
    conditionalRecommendationCompliance: 0,
    pagesWithNotForGuidance: 0,
    brokenLinks: 0,
    accessibilityFailures: 0,
    postPublicationCorrections: 0,
  };

  const production: ProductionMetrics = {
    deploymentSuccessRate: 0,
    previewSmokeCheckPassRate: 0,
    productionSmokeCheckPassRate: 0,
    rollbackFrequency: 0,
    urlRedirectRegressions: 0,
    indexingConfigFailures: 0,
  };

  let totalRuns = 0;
  let deadlineMetRuns = 0;
  const totalTimeToProduction = 0;
  let totalAutomationTasks = 0;
  let premiumInterventions = 0;
  let totalModelCalls = 0;
  let acceptedModelCalls = 0;
  let lowerCostModelCalls = 0;
  let acceptedLowerCostCalls = 0;
  let totalPremiumCost = 0;
  let pageSets = 0;

  return {
    recordDailyDelivery(runId: string, pagesDeployed: number, deadlineMet: boolean, rescueTriggered: boolean): void {
      totalRuns++;
      if (deadlineMet) deadlineMetRuns++;
      if (rescueTriggered) dailyDelivery.rescueCount++;
      if (pagesDeployed >= 3) dailyDelivery.completePageSets++;

      dailyDelivery.deadlineMetPercentage = totalRuns > 0 ? (deadlineMetRuns / totalRuns) * 100 : 0;
    },

    recordAutomation(premiumInterventionsReceived: number, retries: number, moduleSuccesses: number, moduleFailures: number): void {
      totalAutomationTasks += moduleSuccesses + moduleFailures;
      premiumInterventions += premiumInterventionsReceived;

      automation.premiumInterventionPercentage = totalAutomationTasks > 0
        ? (premiumInterventions / totalAutomationTasks) * 100
        : 0;
      automation.successfulRetries += retries;
      automation.fallbackFrequency = totalAutomationTasks > 0
        ? (premiumInterventions / totalAutomationTasks) * 100
        : 0;
    },

    recordModelEconomics(model: string, task: string, costUsd: number, latencyMs: number, accepted: boolean): void {
      totalModelCalls++;
      if (accepted) acceptedModelCalls++;

      if (!modelEconomics.acceptedOutputCostByTask[task]) {
        modelEconomics.acceptedOutputCostByTask[task] = {};
      }
      if (accepted) {
        modelEconomics.acceptedOutputCostByTask[task][model] =
          (modelEconomics.acceptedOutputCostByTask[task][model] ?? 0) + costUsd;
      }

      if (model.includes("premium") || model.includes("gpt-5") || model.includes("opus")) {
        totalPremiumCost += costUsd;
      } else {
        lowerCostModelCalls++;
        if (accepted) acceptedLowerCostCalls++;
      }

      modelEconomics.lowerCostModelAcceptanceRate = lowerCostModelCalls > 0
        ? (acceptedLowerCostCalls / lowerCostModelCalls) * 100
        : 0;

      modelEconomics.tokenTrends[model] = (modelEconomics.tokenTrends[model] ?? 0) + 1;
      modelEconomics.latencyTrends[model] =
        ((modelEconomics.latencyTrends[model] ?? 0) + latencyMs) / (modelEconomics.tokenTrends[model] ?? 1);
    },

    recordQuality(claimsWithEvidence: number, unsupportedClaims: number, corrections: number): void {
      quality.materialClaimsWithEvidence += claimsWithEvidence;
      quality.unsupportedClaimRate = (claimsWithEvidence + unsupportedClaims) > 0
        ? (unsupportedClaims / (claimsWithEvidence + unsupportedClaims)) * 100
        : 0;
      quality.postPublicationCorrections += corrections;
    },

    recordProduction(deploymentSuccess: boolean, rollback: boolean, urlRegressions: number): void {
      pageSets++;
      production.deploymentSuccessRate = pageSets > 0
        ? ((production.deploymentSuccessRate * (pageSets - 1)) + (deploymentSuccess ? 1 : 0)) / pageSets
        : 0;
      if (rollback) production.rollbackFrequency++;
      production.urlRedirectRegressions += urlRegressions;
    },

    getDailyDeliveryMetrics(): DailyDeliveryMetrics {
      return { ...dailyDelivery };
    },

    getAutomationMetrics(): AutomationMetrics {
      return { ...automation };
    },

    getModelEconomicsMetrics(): ModelEconomicsMetrics {
      if (pageSets > 0) {
        modelEconomics.premiumModelCostPerPageSet = totalPremiumCost / pageSets;
      }
      return { ...modelEconomics };
    },

    getQualityMetrics(): QualityMetrics {
      return { ...quality };
    },

    getProductionMetrics(): ProductionMetrics {
      return { ...production };
    },
  };
}

export function createObservabilityLayer(repositoryRoot: string) {
  const auditLogger = createAuditLogger(repositoryRoot);
  const metricsCollector = createMetricsCollector();

  return {
    auditLogger,
    metricsCollector,
    async generateReport(): Promise<string> {
      const daily = metricsCollector.getDailyDeliveryMetrics();
      const automation = metricsCollector.getAutomationMetrics();
      const economics = metricsCollector.getModelEconomicsMetrics();
      const quality = metricsCollector.getQualityMetrics();
      const production = metricsCollector.getProductionMetrics();

      return `
# Vetted SaaS Automation Observability Report

## Daily Delivery Metrics
- Complete 3-page sets: ${daily.completePageSets}
- Deadline met: ${daily.deadlineMetPercentage.toFixed(1)}%
- Production URLs verified: ${daily.productionUrlsVerified}
- Rescue triggers: ${daily.rescueCount}
- Externally blocked days: ${daily.externallyBlockedDays}

## Automation Metrics
- Premium intervention %: ${automation.premiumInterventionPercentage.toFixed(1)}%
- Interventions by task: ${JSON.stringify(automation.premiumInterventionsByTask, null, 2)}
- Successful retries: ${automation.successfulRetries}
- Failed modules: ${automation.failedModules.join(", ") || "none"}
- Fallback frequency: ${automation.fallbackFrequency.toFixed(1)}%

## Model Economics
- Premium cost per page set: $${economics.premiumModelCostPerPageSet.toFixed(2)}
- Lower-cost model acceptance: ${economics.lowerCostModelAcceptanceRate.toFixed(1)}%
- Accepted output cost by task: ${JSON.stringify(economics.acceptedOutputCostByTask, null, 2)}

## Quality Metrics
- Claims with evidence: ${quality.materialClaimsWithEvidence}
- Unsupported claim rate: ${quality.unsupportedClaimRate.toFixed(1)}%
- Post-publication corrections: ${quality.postPublicationCorrections}

## Production Metrics
- Deployment success rate: ${production.deploymentSuccessRate.toFixed(1)}%
- Rollback frequency: ${production.rollbackFrequency}
- URL/redirect regressions: ${production.urlRedirectRegressions}
      `.trim();
    },
  };
}