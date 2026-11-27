import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { createArticleImport, executePendingImport, loadImport, writeJsonAtomically } from "../src/lib/article-import/engine";
import { articleHeroPaths, fingerprintArticleHeroRendererArtifact } from "../src/lib/article-heroes";
import { createSupervisedImportExecutor } from "../src/lib/article-import/supervised-executor";
import { fingerprintEditorialArtifact } from "../src/lib/editorial/refinement";
import { pageBlueprintSchema } from "../src/lib/schemas/contracts";
import { prepareApprovalFixture } from "../tests/fixtures/article-content-approval";
import { persistFixture } from "../tests/fixtures/article-command";
import { samplePageBlueprint } from "../tests/fixtures/sample-page-blueprint";

async function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("LOOPBACK_PORT_UNAVAILABLE"));
      server.close(() => resolve(address.port));
    });
  });
}

async function copyRuntime(repositoryRoot: string, root: string) {
  await cp(path.join(repositoryRoot, "src"), path.join(root, "src"), { recursive: true });
  await cp(path.join(repositoryRoot, "public"), path.join(root, "public"), { recursive: true });
  for (const file of ["approved-urls.md", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "next.config.mjs", "postcss.config.mjs"]) {
    await cp(path.join(repositoryRoot, file), path.join(root, file)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function bindController(root: string) {
  await writeFile(path.join(root, "synthetic-readiness.md"), "# Synthetic readiness target\n\nThis isolated fixture never represents a real article or publication.\n");
  const created = await createArticleImport(root, "synthetic-readiness.md");
  const prepared = await prepareApprovalFixture(root, { ...created, stage: "REFINING", format: "direct-review" }, { currentPolicy: true, structuredEditorial: true });
  await persistFixture(root, {
    ...created,
    stage: "REFINING",
    format: "direct-review",
    artifactPath: prepared.artifactPath,
    evidenceRefs: prepared.evidenceRefs,
  });
  const issued = await executePendingImport(root, created.importId, createSupervisedImportExecutor(root));
  if (issued.continuation?.kind !== "work") throw new Error("READINESS_ACTIVITY_NOT_ISSUED");
  const packet = JSON.parse(await readFile(path.join(root, issued.continuation.workPath), "utf8"));
  await writeJsonAtomically(path.join(root, issued.continuation.resultPath), {
    idempotencyKey: issued.continuation.idempotencyKey,
    sourceFingerprint: issued.sourceFingerprint,
    summary: "Synthetic controller-only rejection; browser observations remain independent.",
    activity: {
      ...packet.activity,
      reviewer: "fixture-controller-reviewer",
      executionId: `${packet.activity.id}-${packet.activity.inputFingerprint.slice(0, 12)}-rejected`,
      outcome: "rejected",
      observation: "The supplied synthetic reviewer rejected this activity so the normal controller must retain the obligation; this verdict is not browser proof.",
    },
  });
  const rejected = await executePendingImport(root, created.importId, createSupervisedImportExecutor(root));
  return { record: rejected, artifactPath: prepared.artifactPath };
}

async function publishSyntheticCatalogue(root: string, artifactPath: string) {
  const directory = path.join(root, "src/generated/landing-pages");
  const sourceManifest = JSON.parse(await readFile(path.join(directory, "index.json"), "utf8")) as { pages: Array<Record<string, unknown>> };
  const targetBytes = await readFile(path.join(root, artifactPath));
  const target = JSON.parse(targetBytes.toString("utf8"));
  const targetSlug = target.metadata.url_slug;
  const dimensions = ["ownership", "permissions", "status clarity", "exception handling", "audit evidence", "handoff timing", "template fit", "notification load", "searchability", "export options", "recovery steps", "maintenance effort"];
  const situations = ["initial setup", "a routine handoff", "an overdue task", "an approval request", "a reassignment", "a failed integration", "a weekly review", "a new teammate", "a policy change", "a client exception", "a reporting cycle", "an archived project"];
  const paragraphs = Array.from({ length: 6 }, (_, paragraphIndex) => {
    const sentences = Array.from({ length: 24 }, (_, sentenceIndex) => {
      const index = paragraphIndex * 24 + sentenceIndex;
      const dimension = dimensions[index % dimensions.length];
      const situation = situations[Math.floor(index / dimensions.length) % situations.length];
      return `Checkpoint ${index + 1} examines ${dimension} during ${situation}. The synthetic evaluator records the expected owner, observable state, acceptable delay, and recovery note before comparing the result with the written rule.`;
    });
    return sentences.join(" ");
  });
  const controlSlug = "synthetic-readiness-control";
  const control = pageBlueprintSchema.parse({
    ...structuredClone(samplePageBlueprint),
    metadata: {
      ...samplePageBlueprint.metadata,
      url_slug: controlSlug,
      title_tag: "Synthetic workflow evaluation control",
      meta_description: "A frozen synthetic control for isolated article-renderer verification.",
      canonical_url: "https://example.invalid/synthetic-readiness-control",
      robots: "noindex,nofollow",
      motion_profile: "gsap_editorial",
    },
    hero: {
      ...samplePageBlueprint.hero,
      headline: "Synthetic control for a workflow evaluation",
      subheadline: "A fictional, non-commercial record with distinct evaluation prose, a local diagram, keyboard-operable questions, and a descriptive destination label.",
      primary_cta_label: "Open synthetic workflow notes",
      risk_reversal: "This loopback-only control does not describe or recommend a real product.",
    },
    problem_solution: {
      problem: "A fictional team cannot compare workflow behavior without a stable rubric.",
      agitation: "Changing the rubric between observations makes the target and control impossible to compare.",
      solution: "Freeze the synthetic control bytes, route, renderer, and observation procedure before testing target changes.",
    },
    benefits: paragraphs.map((description, index) => ({
      benefit_title: `Evaluation dimension ${index + 1}`,
      benefit_description: description,
      feature_supporting_it: `Synthetic rubric segment ${index + 1}`,
      source_reference_ids: [],
    })),
    how_it_works: [
      { step_number: 1, title: "Freeze the inputs", description: "Record the artifact, renderer, styles, assets, rules, route, and viewport before observation." },
      { step_number: 2, title: "Exercise the page", description: "Use pointer and keyboard input, sample elapsed motion, decode media, and inspect the initial viewport." },
      { step_number: 3, title: "Retain the result", description: "Hash the observations and screenshots, then state what the normal controller caught, missed, or did not exercise." },
    ],
    limitations: [
      { limitation: "The control is fictional", who_it_affects: "Reviewers looking for product claims", mitigation: "Use it only for isolated workflow and renderer verification." },
      { limitation: "The diagram is rendered from deterministic SVG source", who_it_affects: "Reviewers assessing ImageGen provenance", mitigation: "Treat generated-image proof as unavailable and separately required." },
    ],
    faq: [
      { question: "Why is this control synthetic?", answer: "It keeps real articles and production operations outside the verification boundary while exercising the normal renderer.", source_reference_ids: [] },
      { question: "What can this control establish?", answer: "It can establish route, layout, media decode, keyboard, accordion, and motion observations for these exact frozen bytes.", source_reference_ids: [] },
      { question: "What can this control not establish?", answer: "It cannot prove ImageGen provenance, real editorial quality, production publication, or an unexercised controller criterion.", source_reference_ids: [] },
    ],
    cta_blocks: [{ ...samplePageBlueprint.cta_blocks[0], label: "Open synthetic workflow notes", supporting_text: "The destination is an intercepted example.invalid URL used only to test CTA semantics." }],
  });
  const controlBytes = Buffer.from(JSON.stringify(control));
  const controlArtifact = `${controlSlug}.json`;
  await writeFile(path.join(directory, controlArtifact), controlBytes);
  const diagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" role="img" aria-labelledby="title desc"><title id="title">Synthetic workflow evaluation diagram</title><desc id="desc">Three connected panels show input checklist, observed state, and recovery note.</desc><rect width="1600" height="900" fill="#08111f"/><g fill="#e2e8f0" font-family="sans-serif" text-anchor="middle"><rect x="100" y="260" width="380" height="260" rx="36" fill="#15304a"/><text x="290" y="400" font-size="48">Input checklist</text><rect x="610" y="260" width="380" height="260" rx="36" fill="#17495a"/><text x="800" y="400" font-size="48">Observed state</text><rect x="1120" y="260" width="380" height="260" rx="36" fill="#39543b"/><text x="1310" y="400" font-size="48">Recovery note</text><path d="M480 390H610M990 390h130" stroke="#7dd3fc" stroke-width="18"/><text x="800" y="690" font-size="34">Synthetic loopback control, not product evidence</text></g></svg>`;
  const heroPaths = articleHeroPaths("direct-review", controlSlug);
  const heroBytes = await sharp(Buffer.from(diagramSvg)).webp({ quality: 90 }).toBuffer();
  await mkdir(path.dirname(path.join(root, heroPaths.assetFile)), { recursive: true });
  await writeFile(path.join(root, heroPaths.assetFile), heroBytes);
  await mkdir(path.dirname(path.join(root, heroPaths.publicationFile)), { recursive: true });
  await writeJsonAtomically(path.join(root, heroPaths.publicationFile), {
    schemaVersion: "ArticleHeroPublicationV1",
    format: "direct-review",
    slug: controlSlug,
    artifactFingerprint: fingerprintEditorialArtifact(control),
    rendererFingerprint: fingerprintArticleHeroRendererArtifact("direct-review", control),
    asset: {
      filePath: heroPaths.assetFile,
      publicPath: heroPaths.publicPath,
      sha256: createHash("sha256").update(heroBytes).digest("hex"),
      width: 1600,
      height: 900,
      alt: "Synthetic diagram linking an input checklist, observed workflow state, and recorded recovery note.",
    },
  });
  const controlEntry = {
    ...sourceManifest.pages[0],
    slug: controlSlug,
    title: "Synthetic readiness control",
    artifact: controlArtifact,
    path: `/landing-page-builders/${controlSlug}`,
    current_version_id: "issue-123-synthetic-control",
    release_receipt: `releases/${controlSlug}/release-receipt.json`,
  };
  const entries = [
    { ...sourceManifest.pages[0], slug: targetSlug, title: "Synthetic readiness target", artifact: `${targetSlug}.json`, path: `/landing-page-builders/${targetSlug}`, current_version_id: "issue-123-target", release_receipt: `releases/${targetSlug}/release-receipt.json` },
    controlEntry,
  ];
  const writeFixtureReceipt = async (entry: Record<string, unknown>, artifactBytes: Buffer, exactUrl: string, reviewedCommit: string) => {
    const receiptDirectory = path.join(directory, path.dirname(String(entry.release_receipt)));
    await mkdir(receiptDirectory, { recursive: true });
    const artifacts = { page: { path: String(entry.artifact), sha256: createHash("sha256").update(artifactBytes).digest("hex") } } as Record<string, { path: string; sha256: string }>;
    for (const label of ["product_evidence", "visual_review", "uniqueness_review", "compliance_review", "conversion_review", "quality_receipt"]) {
      const evidencePath = `${path.dirname(String(entry.release_receipt)).replaceAll("\\", "/")}/${label}.json`;
      const bytes = Buffer.from(JSON.stringify({ schemaVersion: "Issue123SyntheticCatalogueEvidenceV1", label, boundary: "loopback fixture only; not production approval" }));
      await writeFile(path.join(directory, evidencePath), bytes);
      artifacts[label] = { path: evidencePath, sha256: createHash("sha256").update(bytes).digest("hex") };
    }
    const urlFingerprint = createHash("sha256").update(exactUrl).digest("hex");
    await writeJsonAtomically(path.join(directory, String(entry.release_receipt)), {
      schema_version: "LandingReleaseReceiptV1",
      slug: entry.slug,
      path: entry.path,
      exact_affiliate_url: exactUrl,
      url_fingerprint: urlFingerprint,
      authorization: { source: "approved-urls.md", exact_url: exactUrl, url_fingerprint: urlFingerprint },
      artifacts,
      checks: { product_evidence: true, visual: true, uniqueness: true, compliance: true, conversion: true, quality: true, exact_cta: true, disclosure: true, preview: true, clean_build: true },
      release: { reviewed_commit: reviewedCommit, preview_url: `http://127.0.0.1${entry.path}`, verified_at: "2026-11-27T00:00:00.000Z" },
      claims_removed_or_softened: ["Synthetic loopback fixture. No real product claim or production approval."],
    });
  };
  const targetUrl = "https://example.invalid/synthetic-target-offer";
  const controlUrl = "https://example.invalid/synthetic-workflow-notes";
  await writeFile(path.join(root, "approved-urls.md"), `${await readFile(path.join(root, "approved-urls.md"), "utf8")}\n- ${targetUrl}\n- ${controlUrl}\n`);
  await writeFixtureReceipt(entries[0], targetBytes, targetUrl, "a".repeat(40));
  await writeFixtureReceipt(controlEntry, controlBytes, controlUrl, "b".repeat(40));
  await writeJsonAtomically(path.join(directory, "index.json"), { generated_at: new Date().toISOString(), pages: entries });
  return {
    targetRoute: entries[0].path,
    controlRoute: entries[1].path,
    targetSha256: createHash("sha256").update(targetBytes).digest("hex"),
    controlSha256: createHash("sha256").update(controlBytes).digest("hex"),
    targetFingerprint: fingerprintEditorialArtifact(target),
  };
}

async function waitForRoute(server: ChildProcess, url: string) {
  const deadline = Date.now() + 120_000;
  let lastObservation = "no response";
  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) throw new Error(`NEXT_FIXTURE_EXITED_${server.exitCode ?? server.signalCode}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (response.status === 200) return;
      lastObservation = `${response.status} ${(await response.text()).slice(0, 500)}`;
    } catch (error) {
      lastObservation = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`NEXT_FIXTURE_TIMEOUT: ${lastObservation}`);
}

async function main() {
  const repositoryRoot = process.cwd();
  const root = path.join(repositoryRoot, ".scratch", "article-recovery-123-runtime");
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  await copyRuntime(repositoryRoot, root);
  const controller = await bindController(root);
  const catalogue = await publishSyntheticCatalogue(root, controller.artifactPath);
  const port = await availablePort();
  const next = path.join(path.dirname(require.resolve("next/package.json")), "dist/bin/next");
  const server = spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  server.stdout?.pipe(process.stderr);
  server.stderr?.pipe(process.stderr);
  await waitForRoute(server, `http://127.0.0.1:${port}${catalogue.targetRoute}`);
  const record = await loadImport(root, controller.record.importId);
  const manifest = {
    schemaVersion: 1,
    boundary: "isolated synthetic fixture; no real article or release operation",
    root,
    importId: record.importId,
    controller: {
      entryPoint: "executePendingImport",
      stage: record.stage,
      continuation: record.continuation?.kind,
      sourceFingerprint: record.sourceFingerprint,
      testedRevision: process.env.ARTICLE_RECOVERY_TESTED_REVISION ?? "uncommitted",
    },
    artifact: { path: controller.artifactPath, sha256: catalogue.targetSha256, fingerprint: catalogue.targetFingerprint },
    targetUrl: `http://127.0.0.1:${port}${catalogue.targetRoute}`,
    controlUrl: `http://127.0.0.1:${port}${catalogue.controlRoute}`,
    controlSha256: catalogue.controlSha256,
  };
  await mkdir(path.join(repositoryRoot, "build-pack/repairs/article-recovery-123/browser"), { recursive: true });
  await writeJsonAtomically(path.join(repositoryRoot, "build-pack/repairs/article-recovery-123/browser/fixture-manifest.json"), manifest);
  process.stdout.write(`${JSON.stringify(manifest)}\n`);

  const close = () => { if (server.exitCode === null) server.kill("SIGTERM"); };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
  await new Promise<void>((resolve) => server.once("close", () => resolve()));
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

