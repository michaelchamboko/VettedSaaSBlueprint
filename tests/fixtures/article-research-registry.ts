import {
  createResearchRegistryPlan,
  researchRegistryCandidateSchema,
  type ArticleResearchRegistry,
  type ResearchRegistryCandidate,
  type ResearchRegistryCommitInput,
  type ResearchRegistryCommitResult,
} from "../../src/lib/article-import/research-registry";

export function createInMemoryResearchRegistry(initial: ResearchRegistryCandidate[] = []) {
  const candidates = new Map(initial.map((candidate) => [`${candidate.claimId}:${candidate.snapshotId}:${candidate.productContext}`, researchRegistryCandidateSchema.parse(candidate)]));
  const bindings = new Map<string, { digest: string; result: ResearchRegistryCommitResult }>();
  const commits: Array<{ input: ResearchRegistryCommitInput; result: ResearchRegistryCommitResult }> = [];
  return {
    commits,
    invalidateSnapshot(snapshotId: string) {
      for (const [key, candidate] of candidates) if (candidate.snapshotId === snapshotId) candidates.delete(key);
    },
    async prepare(input: { importId: string; sourceFingerprint: string; sourceText: string; now: string }) {
      void input.sourceText;
      return createResearchRegistryPlan({ importId: input.importId, sourceFingerprint: input.sourceFingerprint, generatedAt: input.now, candidates: [...candidates.values()], legacyLeads: [] });
    },
    async commit(input: ResearchRegistryCommitInput): Promise<ResearchRegistryCommitResult> {
      const key = `${input.importId}:${input.idempotencyKey}`;
      const digest = `${input.sourceFingerprint}:${input.plan.planFingerprint}:${input.decisionSha256}:${input.writebackSha256 ?? ""}:${input.research.evidenceSha256}`;
      const existing = bindings.get(key);
      if (existing) {
        if (existing.digest !== digest) throw new Error("CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_REPLAY_MISMATCH");
        return { ...existing.result, replayed: true };
      }
      for (const claim of input.decision.claims) for (const match of claim.registryMatches) {
        if (!candidates.has(`${match.claimId}:${match.snapshotId}:${match.productContext}`)) throw new Error("RESEARCH_REGISTRY_PLAN_STALE");
      }
      const result = { bindingId: crypto.randomUUID(), replayed: false };
      bindings.set(key, { digest, result });
      commits.push({ input, result });
      return result;
    },
  } satisfies ArticleResearchRegistry & {
    commits: Array<{ input: ResearchRegistryCommitInput; result: ResearchRegistryCommitResult }>;
    invalidateSnapshot(snapshotId: string): void;
  };
}
