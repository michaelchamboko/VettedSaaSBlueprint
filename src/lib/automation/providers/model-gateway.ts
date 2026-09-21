import { ModelGateway, ModelCallParams, ModelCallResult, ModelRouteDecision } from "../module-contract";

export interface ModelProvider {
  name: string;
  call(params: ModelCallParams): Promise<ModelCallResult>;
  estimateCost(model: string, inputTokens: number, outputTokens: number): number;
  listModels(): string[];
}

export interface ModelProviderConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  defaultModel: string;
  models: Record<string, { maxTokens: number; costPer1kInput: number; costPer1kOutput: number }>;
}

export class OpenAIProvider implements ModelProvider {
  name = "openai";
  private config: ModelProviderConfig;

  constructor(config: ModelProviderConfig) {
    this.config = config;
  }

  async call(params: ModelCallParams): Promise<ModelCallResult> {
    const startTime = Date.now();
    const url = `${this.config.baseUrl || "https://api.openai.com/v1"}/chat/completions`;

    const body: Record<string, unknown> = {
      model: params.model,
      messages: [
        ...(params.systemPrompt ? [{ role: "system", content: params.systemPrompt }] : []),
        { role: "user", content: params.prompt },
      ],
      temperature: params.temperature ?? 0.1,
      max_tokens: params.maxTokens ?? 4000,
    };

    if (params.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(this.config.organization ? { "OpenAI-Organization": this.config.organization } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const content = data.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    if (params.responseFormat === "json") {
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = content;
      }
    }

    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;
    const costUsd = this.estimateCost(params.model, inputTokens, outputTokens);

    return {
      content,
      parsed,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
    };
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelConfig = this.config.models[model];
    if (!modelConfig) return 0;
    return (inputTokens / 1000) * modelConfig.costPer1kInput + (outputTokens / 1000) * modelConfig.costPer1kOutput;
  }

  listModels(): string[] {
    return Object.keys(this.config.models);
  }
}

export class AnthropicProvider implements ModelProvider {
  name = "anthropic";
  private config: ModelProviderConfig;

  constructor(config: ModelProviderConfig) {
    this.config = config;
  }

  async call(params: ModelCallParams): Promise<ModelCallResult> {
    const startTime = Date.now();
    const url = `${this.config.baseUrl || "https://api.anthropic.com/v1"}/messages`;

    const body: Record<string, unknown> = {
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      max_tokens: params.maxTokens ?? 4000,
      temperature: params.temperature ?? 0.1,
      system: params.systemPrompt,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const content = data.content?.[0]?.text ?? "";
    let parsed: unknown;
    if (params.responseFormat === "json") {
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = content;
      }
    }

    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;
    const costUsd = this.estimateCost(params.model, inputTokens, outputTokens);

    return {
      content,
      parsed,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
    };
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelConfig = this.config.models[model];
    if (!modelConfig) return 0;
    return (inputTokens / 1000) * modelConfig.costPer1kInput + (outputTokens / 1000) * modelConfig.costPer1kOutput;
  }

  listModels(): string[] {
    return Object.keys(this.config.models);
  }
}

export class GenericProvider implements ModelProvider {
  name = "generic";
  private config: ModelProviderConfig;
  private endpoint: string;

  constructor(config: ModelProviderConfig, endpoint: string) {
    this.config = config;
    this.endpoint = endpoint;
  }

  async call(params: ModelCallParams): Promise<ModelCallResult> {
    const startTime = Date.now();

    const body: Record<string, unknown> = {
      model: params.model,
      messages: [
        ...(params.systemPrompt ? [{ role: "system", content: params.systemPrompt }] : []),
        { role: "user", content: params.prompt },
      ],
      temperature: params.temperature ?? 0.1,
      max_tokens: params.maxTokens ?? 4000,
    };

    if (params.responseFormat === "json") {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Generic provider error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;

    const content = data.choices?.[0]?.message?.content ?? data.content?.[0]?.text ?? "";
    let parsed: unknown;
    if (params.responseFormat === "json") {
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = content;
      }
    }

    const inputTokens = data.usage?.prompt_tokens ?? data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? data.usage?.output_tokens ?? 0;
    const costUsd = this.estimateCost(params.model, inputTokens, outputTokens);

    return {
      content,
      parsed,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
    };
  }

  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelConfig = this.config.models[model];
    if (!modelConfig) return 0;
    return (inputTokens / 1000) * modelConfig.costPer1kInput + (outputTokens / 1000) * modelConfig.costPer1kOutput;
  }

  listModels(): string[] {
    return Object.keys(this.config.models);
  }
}

export function createModelGateway(providers: Map<string, ModelProvider>): ModelGateway {
  const costs: Record<string, number> = {};

  return {
    async call(params: ModelCallParams) {
      const provider = providers.get(params.provider);
      if (!provider) {
        throw new Error(`Provider ${params.provider} not configured`);
      }
      const result = await provider.call(params);
      costs[params.model] = (costs[params.model] ?? 0) + result.costUsd;
      return result;
    },

    route(task: string, context: Record<string, unknown>) {
      const taskLower = task.toLowerCase();

      if (taskLower.includes("rescue") || taskLower.includes("critical") || taskLower.includes("conflict")) {
        const model = "gpt-5.6-sol";
        const provider = providers.has("openai") ? "openai" : providers.keys().next().value;
        return {
          model,
          provider: provider ?? "openai",
          reason: "High-risk task requires premium model",
          estimatedCost: providers.get(provider ?? "openai")?.estimateCost(model, 5000, 2000) ?? 0,
          requiresPremium: true,
        };
      }

      if (taskLower.includes("format") || taskLower.includes("extract") || taskLower.includes("classify")) {
        const model = "gpt-4o-mini";
        const provider = providers.has("openai") ? "openai" : providers.keys().next().value;
        return {
          model,
          provider: provider ?? "openai",
          reason: "Low-risk formatting/extraction task",
          estimatedCost: providers.get(provider ?? "openai")?.estimateCost(model, 2000, 1000) ?? 0,
          requiresPremium: false,
        };
      }

      const model = "gpt-4o";
      const provider = providers.has("openai") ? "openai" : providers.keys().next().value;
      return {
        model,
        provider: provider ?? "openai",
        reason: "Medium-risk task - balanced model",
        estimatedCost: providers.get(provider ?? "openai")?.estimateCost(model, 3000, 1500) ?? 0,
        requiresPremium: false,
      };
    },

    trackCost(model: string, costUsd: number) {
      costs[model] = (costs[model] ?? 0) + costUsd;
    },

    getCostSummary() {
      return { ...costs };
    },
  };
}

export const DEFAULT_OPENAI_CONFIG: ModelProviderConfig = {
  apiKey: process.env.OPENAI_API_KEY ?? "",
  defaultModel: "gpt-4o",
  models: {
    "gpt-5.6-sol": { maxTokens: 128000, costPer1kInput: 0.03, costPer1kOutput: 0.06 },
    "gpt-4o": { maxTokens: 128000, costPer1kInput: 0.005, costPer1kOutput: 0.015 },
    "gpt-4o-mini": { maxTokens: 128000, costPer1kInput: 0.00015, costPer1kOutput: 0.0006 },
  },
};

export const DEFAULT_ANTHROPIC_CONFIG: ModelProviderConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  defaultModel: "claude-3-5-sonnet-20241022",
  models: {
    "claude-3-5-sonnet-20241022": { maxTokens: 8192, costPer1kInput: 0.003, costPer1kOutput: 0.015 },
    "claude-3-5-haiku-20241022": { maxTokens: 8192, costPer1kInput: 0.001, costPer1kOutput: 0.005 },
  },
};