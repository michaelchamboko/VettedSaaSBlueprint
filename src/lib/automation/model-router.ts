import { ModelGateway, ModelRouteDecision, ModelCallParams, ModelCallResult } from "./module-contract";
import { ModelProvider, ModelProviderConfig, OpenAIProvider, AnthropicProvider, GenericProvider, DEFAULT_OPENAI_CONFIG, DEFAULT_ANTHROPIC_CONFIG } from "./providers";

export interface RoutingRule {
  taskPattern: RegExp;
  model: string;
  provider: string;
  requiresPremium: boolean;
  maxCostPerCall: number;
  fallback?: RoutingRule;
}

export interface QualificationFixture {
  id: string;
  task: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  requiredModel: string;
  qualityThreshold: number;
}

export interface QualificationResult {
  fixtureId: string;
  model: string;
  provider: string;
  passed: boolean;
  score: number;
  actualOutput: Record<string, unknown>;
  costUsd: number;
  latencyMs: number;
  errors: string[];
}

export class ModelRouter implements ModelGateway {
  private providers: Map<string, ModelProvider> = new Map();
  private routingRules: RoutingRule[] = [];
  private qualificationFixtures: QualificationFixture[] = [];
  private costTracker: Map<string, { totalCost: number; callCount: number; totalLatency: number }> = new Map();
  private premiumModel: string;
  private premiumProvider: string;

  constructor(
    providerConfigs: Map<string, ModelProviderConfig>,
    premiumModel: string = "gpt-5.6-sol",
    premiumProvider: string = "openai",
  ) {
    this.premiumModel = premiumModel;
    this.premiumProvider = premiumProvider;

    for (const [name, config] of providerConfigs) {
      let provider: ModelProvider;
      switch (name) {
        case "openai":
          provider = new OpenAIProvider(config);
          break;
        case "anthropic":
          provider = new AnthropicProvider(config);
          break;
        default:
          provider = new GenericProvider(config, config.baseUrl ?? "");
      }
      this.providers.set(name, provider);
    }

    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.routingRules = [
      {
        taskPattern: /rescue|critical|conflict|recommendation|decision/i,
        model: this.premiumModel,
        provider: this.premiumProvider,
        requiresPremium: true,
        maxCostPerCall: 2.00,
      },
      {
        taskPattern: /validate|verify|check|audit/i,
        model: "gpt-4o",
        provider: this.premiumProvider,
        requiresPremium: false,
        maxCostPerCall: 0.50,
        fallback: {
          taskPattern: /validate|verify|check|audit/i,
          model: "claude-3-5-sonnet-20241022",
          provider: "anthropic",
          requiresPremium: false,
          maxCostPerCall: 0.50,
        },
      },
      {
        taskPattern: /format|extract|classify|normalize|parse/i,
        model: "gpt-4o-mini",
        provider: this.premiumProvider,
        requiresPremium: false,
        maxCostPerCall: 0.05,
        fallback: {
          taskPattern: /format|extract|classify|normalize|parse/i,
          model: "claude-3-5-haiku-20241022",
          provider: "anthropic",
          requiresPremium: false,
          maxCostPerCall: 0.05,
        },
      },
      {
        taskPattern: /score|calculate|compute/i,
        model: "gpt-4o",
        provider: this.premiumProvider,
        requiresPremium: false,
        maxCostPerCall: 0.30,
      },
      {
        taskPattern: /assemble|compose|generate|write/i,
        model: "gpt-4o",
        provider: this.premiumProvider,
        requiresPremium: false,
        maxCostPerCall: 0.75,
      },
      {
        taskPattern: /.*/,
        model: "gpt-4o",
        provider: this.premiumProvider,
        requiresPremium: false,
        maxCostPerCall: 1.00,
      },
    ];
  }

  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.unshift(rule);
  }

  addQualificationFixture(fixture: QualificationFixture): void {
    this.qualificationFixtures.push(fixture);
  }

  async call(params: ModelCallParams): Promise<ModelCallResult> {
    const provider = this.providers.get(params.provider);
    if (!provider) {
      throw new Error(`Provider ${params.provider} not configured`);
    }

    const result = await provider.call(params);
    this.trackCost(params.model, result.costUsd, result.latencyMs);
    return result;
  }

  route(task: string, context: Record<string, unknown>): ModelRouteDecision {
    for (const rule of this.routingRules) {
      if (rule.taskPattern.test(task)) {
        const provider = this.providers.get(rule.provider);
        const estimatedCost = provider?.estimateCost(rule.model, 3000, 1500) ?? 0;

        if (estimatedCost > rule.maxCostPerCall && rule.fallback) {
          const fallbackProvider = this.providers.get(rule.fallback.provider);
          const fallbackCost = fallbackProvider?.estimateCost(rule.fallback.model, 3000, 1500) ?? 0;
          if (fallbackCost <= rule.fallback.maxCostPerCall) {
            return {
              model: rule.fallback.model,
              provider: rule.fallback.provider,
              reason: `Primary model exceeds cost limit, using fallback`,
              estimatedCost: fallbackCost,
              requiresPremium: rule.fallback.requiresPremium,
            };
          }
        }

        return {
          model: rule.model,
          provider: rule.provider,
          reason: `Matched rule for task: ${task}`,
          estimatedCost,
          requiresPremium: rule.requiresPremium,
        };
      }
    }

    const defaultRule = this.routingRules[this.routingRules.length - 1];
    const provider = this.providers.get(defaultRule.provider);
    return {
      model: defaultRule.model,
      provider: defaultRule.provider,
      reason: "Default routing rule",
      estimatedCost: provider?.estimateCost(defaultRule.model, 3000, 1500) ?? 0,
      requiresPremium: defaultRule.requiresPremium,
    };
  }

  trackCost(model: string, costUsd: number, latencyMs: number = 0): void {
    const entry = this.costTracker.get(model) ?? { totalCost: 0, callCount: 0, totalLatency: 0 };
    entry.totalCost += costUsd;
    entry.callCount += 1;
    entry.totalLatency += latencyMs;
    this.costTracker.set(model, entry);
  }

  getCostSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const [model, data] of this.costTracker) {
      summary[model] = data.totalCost;
    }
    return summary;
  }

  getDetailedCostSummary(): Record<string, { totalCost: number; callCount: number; avgLatencyMs: number }> {
    const summary: Record<string, { totalCost: number; callCount: number; avgLatencyMs: number }> = {};
    for (const [model, data] of this.costTracker) {
      summary[model] = {
        totalCost: data.totalCost,
        callCount: data.callCount,
        avgLatencyMs: data.callCount > 0 ? data.totalLatency / data.callCount : 0,
      };
    }
    return summary;
  }

  async runQualification(fixture: QualificationFixture, model: string, provider: string): Promise<QualificationResult> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      throw new Error(`Provider ${provider} not configured`);
    }

    const startTime = Date.now();
    const prompt = JSON.stringify(fixture.input);
    const systemPrompt = `You are a precise automation worker. Output only valid JSON matching the expected schema.`;

    try {
      const result = await providerInstance.call({
        model,
        provider,
        prompt,
        systemPrompt,
        responseFormat: "json",
        temperature: 0,
      });

      const score = this.compareOutputs(fixture.expectedOutput, result.parsed as Record<string, unknown>);
      const passed = score >= fixture.qualityThreshold;

      return {
        fixtureId: fixture.id,
        model,
        provider,
        passed,
        score,
        actualOutput: (result.parsed as Record<string, unknown>) ?? {},
        costUsd: result.costUsd,
        latencyMs: result.latencyMs,
        errors: passed ? [] : [`Score ${score} below threshold ${fixture.qualityThreshold}`],
      };
    } catch (error) {
      return {
        fixtureId: fixture.id,
        model,
        provider,
        passed: false,
        score: 0,
        actualOutput: {},
        costUsd: 0,
        latencyMs: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  async runFullQualificationSuite(model: string, provider: string): Promise<QualificationResult[]> {
    const results: QualificationResult[] = [];
    for (const fixture of this.qualificationFixtures) {
      if (fixture.requiredModel === model || fixture.requiredModel === "*") {
        results.push(await this.runQualification(fixture, model, provider));
      }
    }
    return results;
  }

  private compareOutputs(expected: Record<string, unknown>, actual: Record<string, unknown>): number {
    const expectedKeys = Object.keys(expected);
    if (expectedKeys.length === 0) return 1;

    let matches = 0;
    for (const key of expectedKeys) {
      if (this.deepEqual(expected[key], actual[key])) {
        matches++;
      }
    }
    return matches / expectedKeys.length;
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== "object") return false;

    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const keysA = Object.keys(aObj);
    const keysB = Object.keys(bObj);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!this.deepEqual(aObj[key], bObj[key])) return false;
    }
    return true;
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProvider(name: string): ModelProvider | undefined {
    return this.providers.get(name);
  }

  estimateTaskCost(task: string, context: Record<string, unknown>): { model: string; provider: string; estimatedCost: number } {
    const decision = this.route(task, context);
    return {
      model: decision.model,
      provider: decision.provider,
      estimatedCost: decision.estimatedCost,
    };
  }
}

export function createModelRouter(
  openaiApiKey?: string,
  anthropicApiKey?: string,
  premiumModel: string = "gpt-5.6-sol",
  premiumProvider: string = "openai",
): ModelRouter {
  const configs = new Map<string, ModelProviderConfig>();

  if (openaiApiKey) {
    configs.set("openai", { ...DEFAULT_OPENAI_CONFIG, apiKey: openaiApiKey });
  }
  if (anthropicApiKey) {
    configs.set("anthropic", { ...DEFAULT_ANTHROPIC_CONFIG, apiKey: anthropicApiKey });
  }

  if (configs.size === 0) {
    throw new Error("At least one model provider API key must be provided");
  }

  return new ModelRouter(configs, premiumModel, premiumProvider);
}