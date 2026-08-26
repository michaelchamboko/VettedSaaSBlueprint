import { z } from "zod";

export type StructuredLlmRequest = {
  model: string;
  system: string;
  user: string;
  schemaName: string;
  schema: z.ZodType;
};

export interface StructuredLlmService {
  generate<T>(request: StructuredLlmRequest & { schema: z.ZodType<T> }): Promise<T>;
}

export type OpenAiCompatibleStructuredLlmOptions = {
  apiKey: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

/**
 * Provider-specific HTTP mapping stays here. Application code uses
 * only StructuredLlmService and never import a provider SDK.
 */
export class OpenAiCompatibleStructuredLlm implements StructuredLlmService {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenAiCompatibleStructuredLlmOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate<T>(request: StructuredLlmRequest & { schema: z.ZodType<T> }): Promise<T> {
    const response = await this.fetchImpl(`${this.options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: z.toJSONSchema(request.schema),
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Structured LLM request failed with HTTP ${response.status}.`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Structured LLM response did not include JSON content.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Structured LLM response was not valid JSON.");
    }

    return request.schema.parse(parsed);
  }
}
