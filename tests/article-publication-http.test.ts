import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:net";
import { cp, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { blogPostSchema, type BlogPost } from "../src/lib/blog/contracts";
import { assertPublicationAuthorityBinding } from "../src/lib/article-import/release";
import { captureRenderingInputs, validateRenderingInputs } from "../src/lib/article-import/rendering-inputs";
import { evidenceReference, verifyEvidenceRef } from "../src/lib/article-import/execution-evidence";

async function availablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("LOOPBACK_PORT_UNAVAILABLE"));
      server.close(() => resolve(address.port));
    });
  });
}

async function stopOwnedServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) return;
  const closed = new Promise<void>((resolve) => server.once("close", () => resolve()));
  server.kill("SIGTERM");
  await Promise.race([closed, new Promise<void>((resolve) => setTimeout(resolve, 5_000))]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function request(server: ChildProcess, port: number, route: string, expected: string) {
  const logs: string[] = [];
  server.stdout?.on("data", (chunk) => logs.push(String(chunk)));
  server.stderr?.on("data", (chunk) => logs.push(String(chunk)));
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Fixture server exited ${server.exitCode}: ${logs.join("")}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(10_000) });
      const body = await response.text();
      if (response.status === 200 && body.includes(expected)) return { status: response.status, body };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out requesting ${route}: ${logs.join("")}`);
}

function synthetic(source: BlogPost, slug: string, title: string, position: number): BlogPost {
  return blogPostSchema.parse({
    ...structuredClone(source),
    slug,
    canonicalPath: `/blog/${slug}`,
    title,
    buyerQuestion: `Which controlled option fits ${title}?`,
    answerSummary: `${title} is isolated test content served only by the loopback fixture. It proves that the public catalogue remains the serving authority while a separate mutable import record changes underneath it.`,
    cyclePosition: position,
  });
}

async function copyRuntimeFixture(repositoryRoot: string, root: string): Promise<void> {
  await cp(path.join(repositoryRoot, "src"), path.join(root, "src"), { recursive: true });
  await cp(path.join(repositoryRoot, "public"), path.join(root, "public"), { recursive: true });
  for (const file of ["approved-urls.md", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts", "next.config.mjs", "postcss.config.mjs"]) {
    await cp(path.join(repositoryRoot, file), path.join(root, file)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  const modules = path.dirname(path.dirname(require.resolve("next/package.json")));
  await symlink(modules, path.join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");
}

async function syntheticDirectCatalogue(root: string, reviewedCommitSha: string) {
  const directory = path.join(root, "src/generated/landing-pages");
  const manifest = JSON.parse(await readFile(path.join(directory, "index.json"), "utf8")) as { pages: Array<Record<string, unknown>> };
  const entries = [];
  const approved: Record<string, string> = {};
  for (const [index, name] of ["target", "control"].entries()) {
    const sourceEntry = manifest.pages[index];
    const sourceArtifact = JSON.parse(await readFile(path.join(directory, String(sourceEntry.artifact)), "utf8"));
    const sourceReceipt = JSON.parse(await readFile(path.join(directory, String(sourceEntry.release_receipt)), "utf8"));
    const slug = `synthetic-direct-${name}`;
    const artifact = {
      ...sourceArtifact,
      metadata: { ...sourceArtifact.metadata, url_slug: slug, title_tag: `Synthetic direct ${name}` },
      hero: { ...sourceArtifact.hero, headline: `Synthetic direct ${name} headline` },
    };
    const artifactPath = `${slug}.json`;
    const artifactBytes = Buffer.from(JSON.stringify(artifact));
    await writeFile(path.join(directory, artifactPath), artifactBytes);
    const approvedPath = path.join(root, "build-pack", `${slug}.approved.json`);
    await mkdir(path.dirname(approvedPath), { recursive: true });
    await writeFile(approvedPath, artifactBytes);
    approved[name] = path.relative(root, approvedPath).replaceAll("\\", "/");
    const receiptPath = `releases/${slug}/release-receipt.json`;
    await mkdir(path.join(directory, "releases", slug), { recursive: true });
    const receipt = {
      ...sourceReceipt,
      slug,
      path: `/landing-page-builders/${slug}`,
      artifacts: { ...sourceReceipt.artifacts, page: { path: artifactPath, sha256: createHash("sha256").update(artifactBytes).digest("hex") } },
      release: { ...sourceReceipt.release, reviewed_commit: reviewedCommitSha, preview_url: `http://127.0.0.1/landing-page-builders/${slug}` },
    };
    await writeFile(path.join(directory, receiptPath), JSON.stringify(receipt));
    entries.push({
      ...sourceEntry, slug, title: `Synthetic direct ${name}`, artifact: artifactPath,
      path: `/landing-page-builders/${slug}`, current_version_id: `synthetic-${name}`, release_receipt: receiptPath,
    });
  }
  await writeFile(path.join(directory, "index.json"), JSON.stringify({ generated_at: new Date().toISOString(), pages: entries }));
  return { directory, approved };
}

test("the public catalogue serves target and control independently of mutable import state", { timeout: 180_000 }, async () => {
  const repositoryRoot = process.cwd();
  const scratch = path.join(repositoryRoot, ".scratch");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, "publication-http-"));
  let server: ChildProcess | undefined;
  try {
    await copyRuntimeFixture(repositoryRoot, root);

    const source = blogPostSchema.array().parse(JSON.parse(await readFile(path.join(repositoryRoot, "src/generated/blog-posts/posts.json"), "utf8")));
    const target = synthetic(source[0], "synthetic-publication-target", "Synthetic publication target", 1);
    const control = synthetic(source[1], "synthetic-publication-control", "Synthetic publication control", 2);
    await writeFile(path.join(root, "src/generated/blog-posts/posts.json"), JSON.stringify([target, control]));
    const mutableImport = path.join(root, ".automation/article-imports/synthetic.json");
    await mkdir(path.dirname(mutableImport), { recursive: true });
    await writeFile(mutableImport, JSON.stringify(target));

    const port = await availablePort();
    const next = path.join(path.dirname(require.resolve("next/package.json")), "dist/bin/next");
    server = spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: root,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const first = await request(server, port, target.canonicalPath, target.title);
    const controlResponse = await request(server, port, control.canonicalPath, control.title);
    assert.equal(first.status, 200);
    assert.equal(controlResponse.status, 200);
    assert.ok(first.body.includes(target.answerSummary));
    assert.ok(controlResponse.body.includes(control.answerSummary));

    await writeFile(mutableImport, JSON.stringify({ ...target, title: "Mutable import must not be served" }));
    const second = await request(server, port, target.canonicalPath, target.title);
    assert.ok(second.body.includes(target.title));
    assert.ok(second.body.includes(target.answerSummary));
    assert.ok(!second.body.includes("Mutable import must not be served"));
  } finally {
    if (server) await stopOwnedServer(server);
    await rm(root, { recursive: true, force: true });
  }
});

test("direct-review target and control reconcile five serving mutations through loopback HTTP", { timeout: 300_000 }, async () => {
  const repositoryRoot = process.cwd();
  const scratch = path.join(repositoryRoot, ".scratch");
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(path.join(scratch, "direct-publication-http-"));
  let server: ChildProcess | undefined;
  try {
    await copyRuntimeFixture(repositoryRoot, root);
    const reviewedCommitSha = "a".repeat(40);
    const catalogue = await syntheticDirectCatalogue(root, reviewedCommitSha);
    const targetRoute = "/landing-page-builders/synthetic-direct-target";
    const controlRoute = "/landing-page-builders/synthetic-direct-control";
    const target = { format: "direct-review", renderedRoutes: [targetRoute] };
    const control = { format: "direct-review", renderedRoutes: [controlRoute] };
    const manifestRef = await captureRenderingInputs(root, "article-11111111-1111-4111-8111-111111111111");
    await validateRenderingInputs(root, manifestRef, { target });
    await validateRenderingInputs(root, manifestRef, { target: control });

    const indexPath = path.join(catalogue.directory, "index.json");
    await rename(indexPath, `${indexPath}.missing`);
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "direct-review", catalogue.approved.target, { reviewedCommitSha }), /DIRECT_REVIEW_AUTHORITY_UNREADABLE/);
    await rename(`${indexPath}.missing`, indexPath);
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "direct-review", catalogue.approved.target, { reviewedCommitSha: "b".repeat(40) }), /DIRECT_REVIEW_AUTHORITY_REVIEW_MISMATCH/);
    await assertPublicationAuthorityBinding(root, "direct-review", catalogue.approved.target, { reviewedCommitSha });
    await assertPublicationAuthorityBinding(root, "direct-review", catalogue.approved.control, { reviewedCommitSha });

    const port = await availablePort();
    const next = path.join(path.dirname(require.resolve("next/package.json")), "dist/bin/next");
    server = spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    await request(server, port, targetRoute, "Synthetic direct target headline");
    await request(server, port, controlRoute, "Synthetic direct control headline");

    // Content: update only the target's selected artifact and receipt. The target must reconcile; the control remains reusable.
    const targetArtifactPath = path.join(catalogue.directory, "synthetic-direct-target.json");
    const targetReceiptPath = path.join(catalogue.directory, "releases/synthetic-direct-target/release-receipt.json");
    const originalTarget = await readFile(targetArtifactPath);
    const originalReceipt = await readFile(targetReceiptPath);
    const changedTarget = { ...JSON.parse(originalTarget.toString("utf8")), hero: { ...JSON.parse(originalTarget.toString("utf8")).hero, headline: "Mutated target content" } };
    const changedTargetBytes = Buffer.from(JSON.stringify(changedTarget));
    const changedReceipt = JSON.parse(originalReceipt.toString("utf8"));
    changedReceipt.artifacts.page.sha256 = createHash("sha256").update(changedTargetBytes).digest("hex");
    await writeFile(targetArtifactPath, changedTargetBytes);
    await writeFile(targetReceiptPath, JSON.stringify(changedReceipt));
    await stopOwnedServer(server); server = spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });
    await request(server, port, targetRoute, "Mutated target content");
    await request(server, port, controlRoute, "Synthetic direct control headline");
    await assert.rejects(() => assertPublicationAuthorityBinding(root, "direct-review", catalogue.approved.target, { reviewedCommitSha }), /DIRECT_REVIEW_AUTHORITY_ARTIFACT_MISMATCH/);
    await assertPublicationAuthorityBinding(root, "direct-review", catalogue.approved.control, { reviewedCommitSha });
    await writeFile(targetArtifactPath, originalTarget); await writeFile(targetReceiptPath, originalReceipt);
    await stopOwnedServer(server); server = spawn(process.execPath, [next, "dev", "--webpack", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: root, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
    });

    // Renderer and shared styles: both public routes still serve, but both presentation approvals invalidate.
    for (const changedPath of ["src/components/landing/DirectReviewPage.tsx", "src/app/globals.css"]) {
      const file = path.join(root, changedPath);
      const original = await readFile(file);
      await writeFile(file, Buffer.concat([original, Buffer.from("\n/* synthetic mutation */\n")]));
      await request(server, port, targetRoute, "Synthetic direct target headline");
      await request(server, port, controlRoute, "Synthetic direct control headline");
      await assert.rejects(() => validateRenderingInputs(root, manifestRef, { target }), /RENDER_INPUT_CHANGED/);
      await assert.rejects(() => validateRenderingInputs(root, manifestRef, { target: control }), /RENDER_INPUT_CHANGED/);
      await writeFile(file, original);
    }

    // Asset: only the mutated target asset invalidates, and both files are served through HTTP.
    const targetAsset = path.join(root, "public/synthetic-target.txt");
    const controlAsset = path.join(root, "public/synthetic-control.txt");
    await writeFile(targetAsset, "target-v1"); await writeFile(controlAsset, "control-v1");
    const targetAssetRef = await evidenceReference(root, "public/synthetic-target.txt");
    const controlAssetRef = await evidenceReference(root, "public/synthetic-control.txt");
    await writeFile(targetAsset, "target-v2");
    await request(server, port, "/synthetic-target.txt", "target-v2");
    await request(server, port, "/synthetic-control.txt", "control-v1");
    await assert.rejects(() => verifyEvidenceRef(root, targetAssetRef));
    await verifyEvidenceRef(root, controlAssetRef);

    // Publication rule: changing the actual catalogue loader invalidates both while both routes remain healthy.
    const rulesPath = path.join(root, "src/lib/generated/landing-pages.ts");
    const rules = await readFile(rulesPath);
    await writeFile(rulesPath, Buffer.concat([rules, Buffer.from("\n// synthetic publication-rule mutation\n")]));
    await request(server, port, targetRoute, "Synthetic direct target headline");
    await request(server, port, controlRoute, "Synthetic direct control headline");
    await assert.rejects(() => validateRenderingInputs(root, manifestRef, { target }), /RENDER_INPUT_CHANGED:src\/lib\/generated\/landing-pages.ts/);
    await assert.rejects(() => validateRenderingInputs(root, manifestRef, { target: control }), /RENDER_INPUT_CHANGED/);
  } finally {
    if (server) await stopOwnedServer(server);
    await rm(root, { recursive: true, force: true });
  }
});
