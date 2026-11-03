import { createHash } from "node:crypto";

export type ResearchGenerationBinding = {
  researchGeneration?: number;
  stageReceipts?: ReadonlyArray<{ stage: string; message: string }>;
};

export function researchRecoveryGeneration(binding: ResearchGenerationBinding): number {
  return binding.researchGeneration ?? binding.stageReceipts?.filter((receipt) =>
    receipt.stage === "RESEARCHING" && receipt.message.startsWith("RESEARCH_RECOVERY_REQUIRED:")
  ).length ?? 0;
}

export function importPacketId(binding: ResearchGenerationBinding & { importId: string; sourceFingerprint: string }, stage: string, strategy: string): string {
  const generation = researchRecoveryGeneration(binding);
  const suffix = generation ? `:research-recovery-${generation}` : "";
  return createHash("sha256").update(`${binding.importId}:${binding.sourceFingerprint}:${stage}:${strategy}${suffix}`).digest("hex");
}
