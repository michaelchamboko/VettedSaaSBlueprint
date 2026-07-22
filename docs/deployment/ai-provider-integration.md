# AI Provider Integration

AI provider integration must use a decoupled wrapper architecture. The application core, Hermes job logic, page drafting logic, and optimization workflows must not import or call provider SDKs directly.

## Required Shape

- Define a generic LLM service contract, such as `ILLMService`, for the capabilities the system needs.
- Keep app and Hermes core code dependent only on the generic service contract.
- Place each provider in its own isolated wrapper, such as `OpenAIWrapper`, `GeminiWrapper`, or `MiniMaxWrapper`.
- Keep provider SDK imports, HTTP calls, OAuth or API-key handling, model names, request payloads, response parsing, retry details, and provider-specific errors inside the provider wrapper.
- Normalize provider responses into app-owned result types before returning to core code.
- Select and inject the provider wrapper at startup or job initialization. Provider selection must be configuration-driven, not hard-coded into business logic.

## Required Checks

- Switching from one provider/model to another must not require app core or Hermes job logic changes.
- Provider SDK imports must appear only in provider wrapper modules.
- Runtime AI output remains structured JSON only. Approved code renders pages.
- Provider credentials must stay out of logs, chat, generated artifacts, and non-secret configuration.
- ChatGPT account OAuth must not be used as a backend worker credential. Backend provider calls require approved provider credentials, such as an OpenAI Platform API key, stored through the approved secret path.

## Suggested Module Boundary

```text
src/lib/ai/llm-service.ts          # generic interface and app-owned result types
src/lib/ai/providers/openai.ts     # OpenAI-specific implementation
src/lib/ai/providers/gemini.ts     # Gemini-specific implementation, if added
src/lib/ai/providers/minimax.ts    # MiniMax-specific implementation, if retained
src/lib/ai/provider-factory.ts     # configuration-driven provider selection
```

Hermes may use an equivalent worker-local folder if its runtime is separated from the Next.js source tree, but the same interface/wrapper/injection rule applies.
