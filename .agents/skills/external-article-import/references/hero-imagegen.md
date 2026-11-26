# Article hero ImageGen review

Retain the built-in ImageGen result's generated-image source path and output hint in `ArticleHeroProviderOutputV1`, bound to the original PNG SHA-256 and referenced by generation evidence. This preserves the actual handoff record available to the supervisor. The built-in interface does not provide a signed provider receipt, so tool-call identity remains a supervised trust boundary; never describe it as cryptographic proof from OpenAI.

This review applies to the exact WebP bytes attached to the exchange. Do not infer from the prompt, filename, provenance receipt, or page source.

Return `pass`, `fail`, or `insufficient-evidence` for both checks:

1. `noPeople`: pass only when the visible image contains no people, faces, silhouettes, hands, limbs, or other human body parts. Ambiguous human-like shapes are not a pass.
2. `brandFit`: pass only when the image visibly fits the established VettedSaaSBlueprint editorial system: restrained warm palette, evidence-led decision context, legible composition at hero crop, no generic neon-AI symbolism, no readable generated text, no product UI, no watermark, and no claim of documenting real use.

Describe concrete visible observations for each check. A Boolean, restatement of the prompt, clean source scan, or provenance claim is not visual evidence. Any failed or insufficient check keeps the import in validation. Record every visible defect as an unresolved finding.
