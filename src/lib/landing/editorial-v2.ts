import type { PageBlueprint } from "@/lib/schemas/contracts";

export function isEditorialV2Blueprint(blueprint: PageBlueprint): boolean {
  return blueprint.metadata.design_profile === "editorial_v2";
}

export function validateEditorialV2Copy(input: { answerSnippet: string; ctaLabel: string }): { valid: boolean; reasonCodes: string[] } {
  const answerWordCount = input.answerSnippet.trim().split(/\s+/).filter(Boolean).length;
  const reasonCodes = [
    ...(answerWordCount < 40 || answerWordCount > 60 ? ["answer_snippet_word_count"] : []),
    ...(input.ctaLabel.length > 32 ? ["cta_label_too_long"] : []),
  ];

  return { valid: reasonCodes.length === 0, reasonCodes };
}
