import { z } from "zod";
import { EvidenceState } from "./daily-run";

export type { EvidenceState } from "./daily-run";

export const ModuleContractInputSchema = z.object({
  requiredFields: z.array(z.string()),
  optionalFields: z.array(z.string()),
  schemaVersion: z.string(),
  maxInputSize: z.number().int().positive(),
  allowedEvidenceStates: z.array(z.union([
    z.literal("validated"),
    z.literal("partial"),
    z.literal("insufficient"),
    z.literal("conflicting"),
  ])),
  requiredProvenance: z.array(z.string()),
});

export const ModuleContractOutputSchema = z.object({
  requiredFields: z.array(z.string()),
  allowedEnumerations: z.record(z.string(), z.array(z.string())),
  evidenceReferences: z.boolean(),
  confidenceData: z.boolean(),
  errorFallbackState: z.string(),
  schemaVersion: z.string(),
});

export const ModuleContractValidationSchema = z.object({
  syntacticChecks: z.array(z.string()),
  semanticChecks: z.array(z.string()),
  traceabilityChecks: z.array(z.string()),
  deterministicCalculations: z.array(z.string()),
  negativeConditions: z.array(z.string()),
  completenessThreshold: z.number().min(0).max(1),
});

export const ModuleContractRetrySchema = z.object({
  maxAttempts: z.number().int().positive(),
  retryableErrors: z.array(z.string()),
  nonRetryableErrors: z.array(z.string()),
  backoffPolicy: z.enum(["exponential", "linear", "fixed"]),
  escalationThreshold: z.number().int().nonnegative(),
});

export const ModuleContractModelPolicySchema = z.object({
  lowestQualifiedModel: z.string(),
  fallbackModel: z.string(),
  premiumEscalationCondition: z.string(),
  qualificationFixtureVersion: z.string(),
  maxAcceptableCost: z.number().nonnegative(),
});

export const ModuleContractAuditOutputSchema = z.object({
  startEndTimes: z.boolean(),
  workerIdentity: z.boolean(),
  modelIdentity: z.boolean(),
  inputOutputVersions: z.boolean(),
  validationResult: z.boolean(),
  cost: z.boolean(),
  retryCount: z.boolean(),
  finalStatus: z.boolean(),
});

export const ModuleContractSchema = z.object({
  purpose: z.string().min(1),
  input: ModuleContractInputSchema,
  output: ModuleContractOutputSchema,
  validation: ModuleContractValidationSchema,
  retry: ModuleContractRetrySchema,
  idempotency: z.string().min(1),
  modelPolicy: ModuleContractModelPolicySchema,
  auditOutput: ModuleContractAuditOutputSchema,
});

export type ModuleContract = z.infer<typeof ModuleContractSchema>;
export type ModuleContractInput = z.infer<typeof ModuleContractInputSchema>;
export type ModuleContractOutput = z.infer<typeof ModuleContractOutputSchema>;
export type ModuleContractValidation = z.infer<typeof ModuleContractValidationSchema>;
export type ModuleContractRetry = z.infer<typeof ModuleContractRetrySchema>;
export type ModuleContractModelPolicy = z.infer<typeof ModuleContractModelPolicySchema>;
export type ModuleContractAuditOutput = z.infer<typeof ModuleContractAuditOutputSchema>;

export interface ModuleExecutionContext {
  runId: string;
  stage: string;
  evidenceVersion: string;
  modelGateway: ModelGateway;
  services: DeterministicServices;
  auditLogger: AuditLogger;
}

export interface ModuleResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  evidenceReferences: string[];
  confidence?: number;
  modelCalls: ModelCall[];
  validationResults: ValidationCheck[];
  retryable: boolean;
  idempotencyKey: string;
}

export interface ModelCall {
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
}

export interface ValidationCheck {
  checkName: string;
  passed: boolean;
  details: string;
  severity: "error" | "warning" | "info";
  autoRepairable: boolean;
}

export interface ModelGateway {
  call(params: ModelCallParams): Promise<ModelCallResult>;
  route(task: string, context: Record<string, unknown>): ModelRouteDecision;
  trackCost(model: string, costUsd: number): void;
  getCostSummary(): Record<string, number>;
}

export interface ModelCallParams {
  model: string;
  provider: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json" | "text";
  schema?: Record<string, unknown>;
}

export interface ModelCallResult {
  content: string;
  parsed?: unknown;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
}

export interface ModelRouteDecision {
  model: string;
  provider: string;
  reason: string;
  estimatedCost: number;
  requiresPremium: boolean;
}

export interface DeterministicServices {
  sourceEligibility: SourceEligibilityService;
  evidenceConfidence: EvidenceConfidenceService;
  evidenceConflict: EvidenceConflictService;
  productScoring: ProductScoringService;
  fitScoring: FitScoringService;
  recommendationEval: RecommendationEvalService;
  affiliateSeparation: AffiliateSeparationService;
  pageCompleteness: PageCompletenessService;
  publicationEligibility: PublicationEligibilityService;
}

export interface SourceEligibilityService {
  check(source: { url: string; type: string; tier: string }): EligibilityResult;
  classifyRecency(date: string): RecencyClass;
}

export interface EligibilityResult {
  eligible: boolean;
  reason: string;
  tier: string;
}

export type RecencyClass = "current" | "recent" | "aging" | "stale" | "unknown";

export interface EvidenceConfidenceService {
  calculate(evidence: { source: string; quote: string; recency: RecencyClass; corroboration: number }): number;
}

export interface EvidenceConflictService {
  detect(evidence: Array<{ statement: string; source: string; confidence: number }>): ConflictResult[];
}

export interface ConflictResult {
  statement: string;
  sources: Array<{ source: string; position: string; confidence: number }>;
  resolution: "corroborated" | "conflicting" | "insufficient";
  confidence: number;
}

export interface ProductScoringService {
  calculate(product: { criteria: Record<string, number>; weights: Record<string, number> }): number;
}

export interface FitScoringService {
  calculate(context: { audience: string; constraints: string[]; product: { capabilities: string[] } }): number;
}

export interface RecommendationEvalService {
  evaluate(params: { conditions: string[]; evidence: EvidenceState; scores: Record<string, number> }): RecommendationResult;
}

export interface RecommendationResult {
  recommended: boolean;
  conditions: string[];
  confidence: number;
  notFor: string[];
}

export interface AffiliateSeparationService {
  check(params: { productScore: number; affiliateAvailable: boolean; commissionRate?: number }): SeparationResult;
}

export interface SeparationResult {
  independent: boolean;
  scoreAdjusted: number;
  reason: string;
}

export interface PageCompletenessService {
  check(page: { pageType: string; blocks: Array<{ heading: string; evidence: EvidenceState[] }> }): CompletenessResult;
}

export interface CompletenessResult {
  complete: boolean;
  missingBlocks: string[];
  evidenceGaps: string[];
}

export interface PublicationEligibilityService {
  check(page: { disclosure: string; evidenceState: EvidenceState; validations: ValidationCheck[] }): EligibilityResult;
}

export interface AuditLogger {
  log(entry: AuditLogEntry): void;
  getRunLog(runId: string): AuditLogEntry[];
}

export interface AuditLogEntry {
  timestamp: string;
  runId: string;
  stage: string;
  event: string;
  details: Record<string, unknown>;
  workerId?: string;
  modelId?: string;
  costUsd?: number;
}

export interface AutomationModule<TInput = unknown, TOutput = unknown> {
  contract: ModuleContract;
  execute(input: TInput, context: ModuleExecutionContext): Promise<ModuleResult<TOutput>>;
  validateInput(input: TInput): ValidationCheck[];
  validateOutput(output: TOutput): ValidationCheck[];
  getIdempotencyKey(input: TInput): string;
}