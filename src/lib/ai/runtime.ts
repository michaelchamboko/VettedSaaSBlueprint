import { OpenAiCompatibleStructuredLlm, type StructuredLlmService } from "./structured-llm";

export function createStructuredLlmService(config: {
  provider: "openai_compatible";
  apiKey: string;
  baseUrl: string;
}): StructuredLlmService {
  if (config.provider === "openai_compatible") {
    return new OpenAiCompatibleStructuredLlm({ apiKey: config.apiKey, baseUrl: config.baseUrl });
  }

  const exhaustive: never = config.provider;
  throw new Error(`Unsupported structured LLM provider: ${exhaustive}.`);
}
