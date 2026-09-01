import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import { OpenAiCompatibleStructuredLlm } from "@/lib/ai/structured-llm";

test("OpenAI-compatible adapter parses only schema-valid structured output", async () => {
  const client = new OpenAiCompatibleStructuredLlm({
    apiKey: "test-key",
    baseUrl: "https://provider.example/v1",
    fetchImpl: async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"title":"Draft"}' } }] }), {
        status: 200,
      }),
  });

  const result = await client.generate({
    model: "test-model",
    schemaName: "landing_draft",
    schema: z.object({ title: z.string() }),
    system: "Return JSON only.",
    user: "Draft a title.",
  });

  assert.deepEqual(result, { title: "Draft" });
});

test("OpenAI-compatible adapter rejects output that does not satisfy the contract", async () => {
  const client = new OpenAiCompatibleStructuredLlm({
    apiKey: "test-key",
    baseUrl: "https://provider.example/v1",
    fetchImpl: async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"title":7}' } }] }), {
        status: 200,
      }),
  });

  await assert.rejects(
    client.generate({
      model: "test-model",
      schemaName: "landing_draft",
      schema: z.object({ title: z.string() }),
      system: "Return JSON only.",
      user: "Draft a title.",
    }),
  );
});
