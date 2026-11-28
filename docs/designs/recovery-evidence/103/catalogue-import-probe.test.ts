import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { renderToStaticMarkup } from "react-dom/server";

import { contentApprovalMatches, createContentApproval, type ContentApproval } from "../../../../src/lib/article-import/content-approval";
import { captureRenderingInputs, validateRenderingInputs } from "../../../../src/lib/article-import/rendering-inputs";
import { assertPublicationAuthorityBinding } from "../../../../src/lib/article-import/release";
import { createLocalReleaseOperations } from "../../../../src/lib/article-import/local-release-adapter";
import { importArtifactTarget } from "../../../../src/lib/article-import/format-validation";
import { assertProductionVerifierEvidence } from "../../../../src/lib/article-import/verification-evidence";
import { createEditorialEvidence, fingerprintEditorialArtifact } from "../../../../src/lib/editorial/refinement";
import { blogPostSchema, type BlogPost } from "../../../../src/lib/blog/contracts";
import { fullRewriteNotes, rewriteAllProse } from "../../../../tests/fixtures/article-content-approval";
import { createRecoveryEvidenceRun } from "../run-output";

const investigatedRevision = "f026bca8b53aecca829262e9a27820ac6d078892";
const TARGET_IMPORT = "article-00000000-0000-0000-0000-000000000103";
const CONTROL_IMPORT = "article-00000000-0000-0000-0000-000000000104";
const TARGET_SOURCE = "1".repeat(64);
const CONTROL_SOURCE = "2".repeat(64);
const require = createRequire(import.meta.url);
const runOutput = createRecoveryEvidenceRun(103);

type ApprovalFixture = {
  artifactPath: string;
  approval: ContentApproval;
  post: BlogPost;
  sourceFingerprint: string;
};

type ScopeObservation = {
  change: "content" | "shared-renderer" | "shared-styles" | "target-asset" | "shared-rule";
  changedPath: string;
  targetContentApprovalReusable: boolean;
  controlContentApprovalReusable: boolean;
  targetCatalogueAgrees: boolean;
  controlCatalogueAgrees: boolean;
  targetPresentationReusable: boolean;
  controlPresentationReusable: boolean;
  observedReason: string;
};

type ProbeObservation = {
  publicRoute: {
    route: string;
    renderMode: "public-route-component";
    httpObserved: false;
    title: string;
    servedApprovedRevision: boolean;
    independentOfMutableImport: boolean;
    renderedHtml: string;
  };
  httpRoute: {
    route: string;
    controlRoute: string;
    status: number;
    controlStatus: number;
    canonicalPath: string;
    canonicalUrl: string;
    controlCanonicalPath: string;
    controlCanonicalUrl: string;
    title: string;
    answerSummary: string;
    bodyEvidenceSha256: string;
    independentOfMutableImport: boolean;
  };
  scope: ScopeObservation[];
  reconciliation: Array<{
    disagreement: string;
    identities: Record<string, string>;
    evidenceKind: "runtime-validator" | "static-unreachable";
    actualResult: string;
    liveJustified: false;
    observedBehavior: string;
    resumptionRequirement: string;
  }>;
};

test("serves the approved synthetic catalogue article through the public route", { timeout: 300_000 }, async () => {
  const observed = await runCatalogueImportProbe();

  assert.equal(observed.publicRoute.httpObserved, false);
  assert.equal(observed.publicRoute.servedApprovedRevision, true);
  assert.equal(observed.publicRoute.independentOfMutableImport, true);
  assert.equal(observed.httpRoute.status, 200);
  assert.equal(observed.httpRoute.controlStatus, 200);
  assert.equal(observed.httpRoute.canonicalPath, observed.httpRoute.route);
  assert.equal(observed.httpRoute.controlCanonicalPath, observed.httpRoute.controlRoute);
  assert.equal(observed.httpRoute.independentOfMutableImport, true);
  assert.deepEqual(observed.scope.map((entry) => entry.change), [
    "content",
    "shared-renderer",
    "shared-styles",
    "target-asset",
    "shared-rule",
  ]);
  assert.equal(observed.scope[0].targetContentApprovalReusable, false);
  assert.equal(observed.scope[0].controlContentApprovalReusable, true);
  for (const shared of observed.scope.slice(1)) {
    assert.equal(shared.targetContentApprovalReusable, true);
    assert.equal(shared.controlContentApprovalReusable, true);
    assert.equal(shared.targetPresentationReusable, false);
    assert.equal(shared.controlPresentationReusable, false);
  }
  assert.equal(observed.reconciliation.every((entry) => entry.liveJustified === false), true);
  assert.equal(new Set(Object.values(observed.reconciliation.at(-1)!.identities)).size, 5);

  const { outputDirectory, testedCheckoutRevision } = await runOutput;
  const output = path.join(outputDirectory, "observations.json");
  await writeFile(output, `${JSON.stringify({ investigatedRevision, testedCheckoutRevision, syntheticOnly: true, observed }, null, 2)}\n`);

  console.log(`RECOVERY_103_OBSERVATION=${JSON.stringify(observed)}`);
  console.log(`RECOVERY_103_OUTPUT=${output}`);
});

async function runCatalogueImportProbe(): Promise<ProbeObservation> {
  const repositoryRoot = process.cwd();
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "recovery-103-approval-"));
  try {
    const sourcePosts = blogPostSchema.array().parse(JSON.parse(await readFile(path.join(repositoryRoot, "src/generated/blog-posts/posts.json"), "utf8")));
    const target = syntheticPost(sourcePosts[0], "synthetic-catalogue-target", 1);
    const control = syntheticPost(sourcePosts[1], "synthetic-catalogue-control", 2);
    const fixtures = await prepareApprovalFixture(fixtureRoot, target, control);
    const scope = await observeApprovalScope(fixtureRoot, fixtures.target, fixtures.control);
    const publicRoute = await observePublicRoute(repositoryRoot, fixtureRoot, fixtures.target);
    const httpRoute = await observeHttpRoute(repositoryRoot, fixtures.target.post, fixtures.control.post);
    const deploymentMismatch = await observeDeploymentCommitMismatch(fixtureRoot);
    const productionObservationMismatch = observeProductionObservationMismatch(fixtures.target.post);

    return {
      publicRoute,
      httpRoute,
      scope,
      reconciliation: [
        {
          disagreement: "served revision differs from the approved import artifact",
          identities: { servedRevision: "catalogue-revision-a", approvedRevision: "import-revision-b" },
          evidenceKind: "runtime-validator",
          actualResult: "BLOG_AUTHORITY_ARTIFACT_MISMATCH",
          liveJustified: false,
          observedBehavior: "The public route continues serving the immutable catalogue entry, while assertPublicationAuthorityBinding rejects the changed import artifact as BLOG_AUTHORITY_ARTIFACT_MISMATCH.",
          resumptionRequirement: "Reconcile the served catalogue entry and approved artifact to one exact revision, then obtain fresh affected evidence.",
        },
        {
          disagreement: "approved revision differs from the intended deployment commit",
          identities: { approvedRevision: "revision-a", intendedCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", deploymentCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
          evidenceKind: "runtime-validator",
          actualResult: deploymentMismatch,
          liveJustified: false,
          observedBehavior: "The current release contract binds catalogue content before deploy and separately binds deployment operations to a commit; no individual record can substitute for the missing agreement.",
          resumptionRequirement: "Establish the intended commit, bind the approval and catalogue authority to it, and verify that exact commit at the production assignment.",
        },
        {
          disagreement: "retained production observations identify a different revision or deployment",
          identities: { intendedCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", observationCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", observedDeployment: "dpl-observed", intendedDeployment: "dpl-intended" },
          evidenceKind: "runtime-validator",
          actualResult: productionObservationMismatch,
          liveJustified: false,
          observedBehavior: "Retained observations are evidence for the identity they captured only; changing content or rendering inputs invalidates reuse rather than rewriting the observation.",
          resumptionRequirement: "Retain the old observation historically and capture fresh production proof for the reconciled deployment and served revision.",
        },
        {
          disagreement: "terminal LIVE record disagrees with serving, approval, commit, or retained observations",
          identities: { servedRevision: "served-a", approvedRevision: "approved-b", intendedCommit: "commit-c", observationIdentity: "observation-d", terminalIdentity: "terminal-e" },
          evidenceKind: "static-unreachable",
          actualResult: "No unified validator accepts all five identities. inspectImportCompletion validates frozen terminal evidence but does not read the served catalogue route.",
          liveJustified: false,
          observedBehavior: "A terminal label does not repair the demonstrated authority mismatch. The historical record remains inspectable, but the publication requires reconciliation.",
          resumptionRequirement: "Treat LIVE as justified only when served article, approved revision, intended commit, retained production observations, and terminal record all agree.",
        },
      ],
    };
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

function syntheticPost(source: BlogPost, slug: string, cyclePosition: number): BlogPost {
  return blogPostSchema.parse({ ...structuredClone(source), slug, canonicalPath: `/blog/${slug}`, cyclePosition });
}

async function prepareApprovalFixture(root: string, target: BlogPost, control: BlogPost) {
  await put(root, "src/app/blog/[slug]/page.tsx", "export default function BlogArticlePage() { return <main>Fixture</main>; }\n");
  await put(root, "src/app/layout.tsx", "export default function Layout({ children }: { children: unknown }) { return children; }\n");
  await put(root, "src/app/globals.css", "body { color: black; background: white; }\n");
  await put(root, "src/components/public/PublicPageShell.tsx", "export function PublicPageShell({ children }: { children: unknown }) { return children; }\n");
  await put(root, "src/lib/blog/contracts.ts", "export const publicationRule = 'evidence-bound';\n");
  await put(root, `public${target.media.hero.path}`, Buffer.from("target-asset"));
  await put(root, `public${control.media.hero.path}`, Buffer.from("control-asset"));
  await put(root, "package.json", JSON.stringify({ private: true }));
  await put(root, "package-lock.json", JSON.stringify({ lockfileVersion: 3 }));

  const targetFixture = await approveBlog(root, target, "target", TARGET_SOURCE);
  const controlFixture = await approveBlog(root, control, "control", CONTROL_SOURCE);
  await writeCatalogue(root, [targetFixture.post, controlFixture.post]);
  await assertPublicationAuthorityBinding(root, "blog", targetFixture.artifactPath);
  await assertPublicationAuthorityBinding(root, "blog", controlFixture.artifactPath);
  return { target: targetFixture, control: controlFixture };
}

async function approveBlog(root: string, post: BlogPost, name: string, sourceFingerprint: string): Promise<ApprovalFixture> {
  const artifactPath = `src/generated/blog-posts/${name}.json`;
  const editorialEvidencePath = `build-pack/editorial/${name}.json`;
  const formatQualityPath = `build-pack/article-import/${name}-quality.json`;
  const before = structuredClone(post);
  const after = blogPostSchema.parse(rewriteAllProse("blog", before));
  const evidence = createEditorialEvidence("blog", before, after, fullRewriteNotes, { before: "score 4/5 needs a cleanse", after: "score 5/5 CLEAN" });
  await put(root, artifactPath, JSON.stringify(after));
  await put(root, editorialEvidencePath, JSON.stringify(evidence));
  await put(root, formatQualityPath, JSON.stringify({ format: "blog", artifactFingerprint: fingerprintEditorialArtifact(after), passed: true, gate: "blog:audit-post" }));
  const approval = await createContentApproval(root, { artifactPath, editorialEvidencePath, formatQualityPath, format: "blog", sourceFingerprint });
  return { artifactPath, approval, post: after, sourceFingerprint };
}

async function observeApprovalScope(root: string, target: ApprovalFixture, control: ApprovalFixture): Promise<ScopeObservation[]> {
  const targetRendering = await captureRenderingInputs(root, TARGET_IMPORT);
  const controlRendering = await captureRenderingInputs(root, CONTROL_IMPORT);
  const mutations: Array<{ change: ScopeObservation["change"]; path: string; mutate: (bytes: Buffer) => Buffer }> = [
    {
      change: "content",
      path: target.artifactPath,
      mutate: (bytes) => Buffer.from(JSON.stringify({ ...JSON.parse(bytes.toString("utf8")), answerSummary: `${target.post.answerSummary} Changed after approval.` })),
    },
    { change: "shared-renderer", path: "src/app/blog/[slug]/page.tsx", mutate: (bytes) => Buffer.concat([bytes, Buffer.from("\n// changed renderer\n")]) },
    { change: "shared-styles", path: "src/app/globals.css", mutate: (bytes) => Buffer.concat([bytes, Buffer.from("\narticle { max-width: 70ch; }\n")]) },
    { change: "target-asset", path: `public${target.post.media.hero.path}`, mutate: (bytes) => Buffer.concat([bytes, Buffer.from("-changed")]) },
    { change: "shared-rule", path: "src/lib/blog/contracts.ts", mutate: (bytes) => Buffer.concat([bytes, Buffer.from("\nexport const revisedRule = true;\n")]) },
  ];
  const observations: ScopeObservation[] = [];

  for (const mutation of mutations) {
    const absolute = path.join(root, mutation.path);
    const before = await readFile(absolute);
    await writeFile(absolute, mutation.mutate(before));
    const targetContentApprovalReusable = await contentApprovalMatches(root, target.approval, "blog", target.sourceFingerprint);
    const controlContentApprovalReusable = await contentApprovalMatches(root, control.approval, "blog", control.sourceFingerprint);
    const targetCatalogue = await settles(() => assertPublicationAuthorityBinding(root, "blog", target.artifactPath));
    const controlCatalogue = await settles(() => assertPublicationAuthorityBinding(root, "blog", control.artifactPath));
    const targetPresentation = await settles(() => validateRenderingInputs(root, targetRendering));
    const controlPresentation = await settles(() => validateRenderingInputs(root, controlRendering));
    observations.push({
      change: mutation.change,
      changedPath: mutation.path,
      targetContentApprovalReusable,
      controlContentApprovalReusable,
      targetCatalogueAgrees: targetCatalogue.ok,
      controlCatalogueAgrees: controlCatalogue.ok,
      targetPresentationReusable: targetPresentation.ok,
      controlPresentationReusable: controlPresentation.ok,
      observedReason: [targetCatalogue.error, targetPresentation.error].filter(Boolean).join("; "),
    });
    await writeFile(absolute, before);
    await validateRenderingInputs(root, targetRendering);
    await validateRenderingInputs(root, controlRendering);
  }
  return observations;
}

async function observePublicRoute(repositoryRoot: string, fixtureRoot: string, target: ApprovalFixture) {
  const previousCwd = process.cwd();
  process.chdir(fixtureRoot);
  try {
    const route = `/blog/${target.post.slug}`;
    const pageModule = await import("../../../../src/app/blog/[slug]/page");
    const initialHtml = renderToStaticMarkup(await pageModule.default({ params: Promise.resolve({ slug: target.post.slug }) }));
    await put(fixtureRoot, target.artifactPath, JSON.stringify({ ...target.post, answerSummary: `${target.post.answerSummary} Mutable import changed.` }));
    const authorityAfterMutation = await settles(() => assertPublicationAuthorityBinding(fixtureRoot, "blog", target.artifactPath));
    assert.equal(authorityAfterMutation.ok, false);
    assert.match(authorityAfterMutation.error, /BLOG_AUTHORITY_ARTIFACT_MISMATCH/);
    const afterHtml = renderToStaticMarkup(await pageModule.default({ params: Promise.resolve({ slug: target.post.slug }) }));
    const renderedText = textContent(initialHtml);
    const renderedPath = path.join(repositoryRoot, "docs/designs/recovery-evidence/103/served-catalogue.html");
    const retainedHtml = await readFile(renderedPath, "utf8");
    assert.equal(retainedHtml, `<!doctype html><html><body>${initialHtml}</body></html>`);
    assert.ok(renderedText.includes(target.post.title));
    return {
      route,
      renderMode: "public-route-component" as const,
      httpObserved: false as const,
      title: target.post.title,
      servedApprovedRevision: renderedText.includes(target.post.answerSummary),
      independentOfMutableImport: afterHtml === initialHtml && !afterHtml.includes("Mutable import changed"),
      renderedHtml: "docs/designs/recovery-evidence/103/served-catalogue.html",
    };
  } finally {
    process.chdir(previousCwd);
  }
}

async function observeHttpRoute(repositoryRoot: string, target: BlogPost, control: BlogPost): Promise<ProbeObservation["httpRoute"]> {
  const scratch = path.join(repositoryRoot, ".scratch");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, "recovery-103-http-"));
  let server: ChildProcess | undefined;
  try {
    await copyHttpFixture(repositoryRoot, root);
    await writeCatalogue(root, [target, control]);
    const mutableImportPath = "build-pack/article-import/recovery-103-mutable.json";
    await put(root, mutableImportPath, JSON.stringify(target));
    await assertPublicationAuthorityBinding(root, "blog", mutableImportPath);
    const port = await availablePort();
    server = startFixtureServer(root, port);
    const route = `/blog/${target.slug}`;
    const controlRoute = `/blog/${control.slug}`;
    const first = await requestFixture(server, port, route, target.title);
    const controlResponse = await requestFixture(server, port, controlRoute, control.title);
    const firstText = textContent(first.body);
    const controlText = textContent(controlResponse.body);
    const canonicalUrl = canonicalFrom(first.body);
    const controlCanonicalUrl = canonicalFrom(controlResponse.body);
    const servedTitle = tagText(first.body, "h1");
    const servedAnswer = blogAnswerText(first.body);
    const servedControlTitle = tagText(controlResponse.body, "h1");
    assert.equal(servedTitle, target.title);
    assert.equal(servedAnswer, target.answerSummary);
    assert.equal(servedControlTitle, control.title);
    assert.ok(firstText.includes(servedAnswer));
    assert.ok(controlText.includes(servedControlTitle));
    assert.equal(new URL(canonicalUrl).pathname, route);
    assert.equal(new URL(controlCanonicalUrl).pathname, controlRoute);

    await put(root, mutableImportPath, JSON.stringify({ ...target, answerSummary: `${target.answerSummary} Mutable import changed.` }));
    const authority = await settles(() => assertPublicationAuthorityBinding(root, "blog", mutableImportPath));
    assert.equal(authority.ok, false);
    assert.match(authority.error, /BLOG_AUTHORITY_ARTIFACT_MISMATCH/);
    const second = await requestFixture(server, port, route, target.title);
    const secondText = textContent(second.body);
    const secondTitle = tagText(second.body, "h1");
    const secondAnswer = blogAnswerText(second.body);
    const bodyEvidence = JSON.stringify({ title: servedTitle, answerSummary: servedAnswer, controlTitle: servedControlTitle });
    const observation = {
      route,
      controlRoute,
      status: first.status,
      controlStatus: controlResponse.status,
      canonicalPath: new URL(canonicalUrl).pathname,
      canonicalUrl,
      controlCanonicalPath: new URL(controlCanonicalUrl).pathname,
      controlCanonicalUrl,
      title: servedTitle,
      answerSummary: servedAnswer,
      bodyEvidenceSha256: createHash("sha256").update(bodyEvidence).digest("hex"),
      independentOfMutableImport: second.status === 200 && secondTitle === servedTitle && secondAnswer === servedAnswer && secondText.includes(servedAnswer) && !secondText.includes("Mutable import changed"),
    };
    await verifyHttpReference(repositoryRoot, observation);
    return observation;
  } finally {
    if (server) await stopOwnedServer(server);
    await rm(root, { recursive: true, force: true });
  }
}

async function copyHttpFixture(repositoryRoot: string, fixtureRoot: string): Promise<void> {
  await cp(path.join(repositoryRoot, "src"), path.join(fixtureRoot, "src"), { recursive: true });
  await cp(path.join(repositoryRoot, "public"), path.join(fixtureRoot, "public"), { recursive: true });
  for (const file of ["package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "next.config.mjs", "postcss.config.mjs"]) {
    await cp(path.join(repositoryRoot, file), path.join(fixtureRoot, file)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  const modules = path.dirname(path.dirname(require.resolve("next/package.json")));
  await symlink(modules, path.join(fixtureRoot, "node_modules"), process.platform === "win32" ? "junction" : "dir");
}

function startFixtureServer(root: string, port: number): ChildProcess {
  const next = path.join(path.dirname(require.resolve("next/package.json")), "dist/bin/next");
  return spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function requestFixture(server: ChildProcess, port: number, route: string, expectedTitle: string) {
  const logs: string[] = [];
  server.stdout?.on("data", (chunk) => logs.push(String(chunk)));
  server.stderr?.on("data", (chunk) => logs.push(String(chunk)));
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Fixture server exited ${server.exitCode}: ${logs.join("")}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(10_000) });
      const body = await response.text();
      if (response.status === 200 && textContent(body).includes(expectedTitle)) return { status: response.status, body };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out requesting ${route}: ${logs.join("")}`);
}

async function stopOwnedServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  const closed = new Promise<void>((resolve) => server.once("close", () => resolve()));
  server.kill("SIGTERM");
  await Promise.race([closed, new Promise<void>((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("No localhost port allocated"));
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function canonicalFrom(html: string): string {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  if (!match) throw new Error("Rendered response did not contain a canonical link");
  return match[1];
}

function tagText(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (!match) throw new Error(`Rendered response did not contain <${tag}>`);
  return textContent(match[1]);
}

function blogAnswerText(html: string): string {
  const section = html.match(/<section[^>]+class=["']blog-answer["'][^>]*>([\s\S]*?)<\/section>/i);
  if (!section) throw new Error("Rendered response did not contain the direct answer section");
  const paragraphs = [...section[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  if (!paragraphs.length) throw new Error("Rendered response did not contain the direct answer body");
  return textContent(paragraphs.at(-1)![1]);
}

async function verifyHttpReference(repositoryRoot: string, observation: ProbeObservation["httpRoute"]): Promise<void> {
  const file = path.join(repositoryRoot, "docs/designs/recovery-evidence/103/http-observations.json");
  const bytes = `${JSON.stringify({ schemaVersion: "RecoveryHttpServingEvidenceV1", ...observation }, null, 2)}\n`;
  if (process.env.RECOVERY_103_UPDATE_HTTP_REFERENCE === "1") {
    await writeFile(file, bytes);
    return;
  }
  assert.equal(await readFile(file, "utf8"), bytes);
}

function textContent(html: string): string {
  return html.replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function observeDeploymentCommitMismatch(root: string): Promise<string> {
  const expectedCommit = "a".repeat(40);
  const observedCommit = "b".repeat(40);
  const operations = createLocalReleaseOperations(root, {
    format: "blog",
    runner: async (command, args) => {
      assert.equal(command, "vercel");
      if (args[0] === "deploy") return { stdout: "https://synthetic-deployment.example.test\n", stderr: "" };
      if (args[0] === "inspect") return { stdout: JSON.stringify({ id: "dpl-observed", gitCommitSha: observedCommit, target: "production", readyState: "READY" }), stderr: "" };
      throw new Error(`Unexpected synthetic release command: ${command} ${args.join(" ")}`);
    },
    fetchJson: async () => ({ commitSha: observedCommit, environment: "production" }),
  });
  const result = await settles(() => operations.deploy(expectedCommit));
  assert.equal(result.ok, false);
  assert.match(result.error, /DEPLOYMENT_COMMIT_METADATA_MISSING_OR_MISMATCHED/);
  return JSON.stringify({ operation: "deploy", expectedCommit, observedCommit, result });
}

function observeProductionObservationMismatch(post: BlogPost): string {
  const target = importArtifactTarget("blog", post);
  const expectedDeployment = {
    deploymentId: "dpl-intended",
    canonicalUrl: `https://vettedsaasblueprint.online${post.canonicalPath}`,
    commitSha: "a".repeat(40),
  };
  const observedDeployment = { ...expectedDeployment, deploymentId: "dpl-observed", commitSha: "b".repeat(40) };
  const result = {
    verificationMode: "production",
    origin: "https://vettedsaasblueprint.online",
    canonicalOrigin: "https://vettedsaasblueprint.online",
    expected_commit: observedDeployment.commitSha,
    ok: true,
    verifiedRoutes: target.renderedRoutes,
    viewportChecks: target.renderedRoutes.length * 2,
    target,
  };
  const evidence = {
    schemaVersion: "ImportProductionVerifierEvidenceV1",
    importId: TARGET_IMPORT,
    sourceFingerprint: TARGET_SOURCE,
    target,
    deployment: observedDeployment,
    deploymentBefore: { id: observedDeployment.deploymentId, target: "production", readyState: "READY", commitSha: observedDeployment.commitSha },
    deploymentAfter: { id: observedDeployment.deploymentId, target: "production", readyState: "READY", commitSha: observedDeployment.commitSha },
    command: { command: "synthetic-verifier", args: [], stdout: JSON.stringify(result), stderr: "", exitCode: 0 },
    result,
  };
  try {
    assertProductionVerifierEvidence(evidence, { importId: TARGET_IMPORT, sourceFingerprint: TARGET_SOURCE, target, deployment: expectedDeployment });
    throw new Error("Expected production observation mismatch");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, /PRODUCTION_DEPLOYMENT_MISMATCH/);
    return message;
  }
}

async function writeCatalogue(root: string, posts: BlogPost[]) {
  await put(root, "src/generated/blog-posts/posts.json", JSON.stringify(posts));
}

async function put(root: string, file: string, value: string | Buffer) {
  const absolute = path.join(root, file);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, value);
}

async function settles(work: () => Promise<unknown>): Promise<{ ok: true; error: "" } | { ok: false; error: string }> {
  try {
    await work();
    return { ok: true, error: "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
