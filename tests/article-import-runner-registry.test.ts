import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { executeImportRunnerCommand } from "../scripts/import-article";
import { createArticleImport, loadImport } from "../src/lib/article-import/engine";
import { declareGateHandoff } from "../src/lib/article-import/gate-handoff";
import type { ArticleReviewEvidenceRegistry } from "../src/lib/article-import/review-evidence-registry";
import type { ArticleResearchRegistry } from "../src/lib/article-import/research-registry";
import type { ArticleResearchRegistryTransport } from "../src/lib/article-import/research-registry-transport";
import { fixtureProbe, persistFixture, prepareCommandCheckout } from "./fixtures/article-command";
import { prepareApprovalFixture } from "./fixtures/article-content-approval";
import { createInMemoryResearchRegistry } from "./fixtures/article-research-registry";

async function runnerRoot(prefix: string): Promise<string> {
  await mkdir(path.join(process.cwd(), ".scratch"), { recursive: true });
  const root = await mkdtemp(path.join(process.cwd(), ".scratch", prefix));
  await writeFile(path.join(root, "approved-urls.md"), "");
  await writeFile(path.join(root, "article.md"), "# Registry runner\n\nA synthetic article with enough detail to enter the supervised research workflow.");
  await prepareCommandCheckout(root);
  return root;
}

function transport(registry: ArticleResearchRegistry, onClose: () => void): ArticleResearchRegistryTransport {
  return { registry, prepare: (input) => registry.prepare(input), async close() { onClose(); } };
}

test("runner injects research and review registries through normal dispatch options", async () => {
  const researchRoot = await runnerRoot("runner-research-registry-");
  try {
    const baseResearchRegistry = createInMemoryResearchRegistry();
    let prepares = 0;
    let closes = 0;
    const researchRegistry: ArticleResearchRegistry = {
      async prepare(input) { prepares += 1; return baseResearchRegistry.prepare(input); },
      commit: (input) => baseResearchRegistry.commit(input),
    };
    const created = await createArticleImport(researchRoot, "article.md");
    for (let step = 0; step < 2; step += 1) {
      await executeImportRunnerCommand(
        researchRoot,
        { kind: "resume", importId: created.importId },
        transport(researchRegistry, () => { closes += 1; }),
        {},
        fixtureProbe(researchRoot),
      );
    }
    assert.equal(prepares, 1);
    assert.equal(closes, 2);

    const researched = await loadImport(researchRoot, created.importId);
    const prepared = await prepareApprovalFixture(researchRoot, { ...researched, format: "direct-review" });
    const transforming = {
      ...researched,
      stage: "TRANSFORMING" as const,
      format: "direct-review" as const,
      artifactPath: prepared.artifactPath,
      activityProtocolVersion: 1 as const,
      continuation: undefined,
      evidenceRefs: {
        research: prepared.evidenceRefs.research,
        transformAssessment: prepared.evidenceRefs.assessment,
        assessment: prepared.evidenceRefs.assessment,
        editorial: prepared.evidenceRefs.editorial,
      },
    };
    const handoff = await declareGateHandoff(researchRoot, transforming, "TRANSFORMING", "REFINING");
    await persistFixture(researchRoot, {
      ...transforming,
      stage: "REFINING",
      gateHandoffs: [...(transforming.gateHandoffs ?? []), handoff],
    });
    const reviewEvidenceRegistry: ArticleReviewEvidenceRegistry = {
      async list() { throw new Error("REVIEW_REGISTRY_REACHED"); },
      async listAll() { return []; },
      async commit() { throw new Error("review registration is outside this regression"); },
    };
    const reviewResult = await executeImportRunnerCommand(
      researchRoot,
      { kind: "resume", importId: created.importId },
      transport(researchRegistry, () => { closes += 1; }),
      { reviewEvidenceRegistry },
      fixtureProbe(researchRoot),
    );
    assert.match(JSON.stringify(reviewResult), /REVIEW_REGISTRY_REACHED/);
    assert.equal(closes, 3);
  } finally {
    await rm(researchRoot, { recursive: true, force: true });
  }
});
