import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { loadPublishedVisibilityPagesFromDirectories } from "../src/lib/visibility-pages/catalogue";
import { sha256 } from "../src/lib/visibility-pages/contracts";
import { indexableVisibilitySummaries } from "../src/lib/visibility-pages/link-graph";
import { validateReleasePaths } from "../src/lib/article-import/release";

const run = promisify(execFile);

test("tracked visibility publication authority admits an import to discovery and the candidate verifier", async () => {
  const root = process.cwd();
  await mkdir(".automation", { recursive: true });
  const directory = await mkdtemp(path.join(root, ".automation", "visibility-import-"));
  const generated = path.join(directory, "src/generated/visibility-pages");
  await mkdir(generated, { recursive: true });
  const route = "/guides/how-to-evaluate-ai-voice-quality";
  const origin = "https://vettedsaasblueprint.online";
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const page = { schema_version: "VisibilityPageV1", id: "voice-guide", path: route, kind: "guide", cluster_id: "ai_voice", title: "Voice quality guide", description: "Evaluate voice quality.", modified_at: new Date().toISOString(), hero: { eyebrow: "Guide", headline: "Evaluate voice quality", summary: "Compare samples." }, claim_ids: ["sample"], relevant_review_path: "/landing-page-builders/elevenlabs-ai-voice-generator", related_paths: ["/ai-voice-generators"], blocks: [{ type: "prose", paragraphs: ["Compare samples."] }] };
  const evidence = { schema_version: "VisibilityEvidencePackV1", page_id: page.id, sources: [{ id: "source", url: "https://example.com/voice", source_hash: "a".repeat(64), retrieved_at: new Date().toISOString(), review_by: expiresAt, usage_allowed: true }], claims: [{ id: "sample", source_id: "source", allowed_wording: "Compare samples.", risk_level: "low", expires_at: expiresAt }] };
  const entry = { id: page.id, path: route, artifact_sha256: sha256(JSON.stringify(page)), evidence_sha256: sha256(JSON.stringify(evidence)) };
  const projection = { schema_version: "VisibilityBuildProjectionV1", source_commit_sha: "b".repeat(40), pages: [{ ...entry, earliest_expires_at: expiresAt, state: "LIVE" }] };
  const authorityPath = path.join(generated, "publications.json");
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", request.url === "/sitemap.xml" ? "application/xml" : request.url === "/robots.txt" ? "text/plain" : "text/html");
    response.end(request.url === "/robots.txt" ? "User-agent: *\nAllow: /" : request.url === "/sitemap.xml" ? `<urlset><url><loc>${origin}${route}</loc></url></urlset>` : `<html><head><link rel="canonical" href="${origin}${route}"><meta name="robots" content="index,follow"></head><body><main><h1>${page.hero.headline}</h1><section>Compare samples.</section></main></body></html>`);
  });
  try {
    await writeFile(path.join(directory, ".gitignore"), await readFile(path.join(root, ".gitignore")));
    for (const [file, data] of Object.entries({ "guide.json": page, "evidence.json": evidence, "index.json": { schema_version: "VisibilityManifestV1", pages: [{ ...entry, artifact: "guide.json", evidence: "evidence.json" }] }, "publications.json": projection })) await writeFile(path.join(generated, file), JSON.stringify(data));
    execFileSync("git", ["init", "--quiet"], { cwd: directory });
    execFileSync("git", ["add", "src/generated/visibility-pages"], { cwd: directory });
    const tracked = execFileSync("git", ["ls-files"], { cwd: directory, encoding: "utf8" }).trim().split(/\r?\n/);
    assert.equal(tracked.length, 4);
    assert.ok(tracked.includes("src/generated/visibility-pages/publications.json"));
    assert.deepEqual(validateReleasePaths(tracked, "visibility"), []);
    const published = loadPublishedVisibilityPagesFromDirectories(generated, authorityPath);
    assert.deepEqual(indexableVisibilitySummaries(published.map((item) => item.summary)).map((item) => item.path), [route]);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const receipt = path.join(directory, "receipt.json");
    const script = `process.chdir(${JSON.stringify(directory)}); process.argv = ['node', 'verify', '--mode', 'candidate', '--origin', 'http://127.0.0.1:${address.port}', '--canonical-origin', ${JSON.stringify(origin)}, '--artifact', 'src/generated/visibility-pages/guide.json', '--receipt', ${JSON.stringify(receipt)}]; await import(${JSON.stringify(pathToFileURL(path.join(root, "scripts/verify-visibility-deployment.ts")).href)});`;
    const verified = await run(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], { cwd: root });
    assert.match(verified.stdout, /"ok":true/);
    assert.match(await readFile(receipt, "utf8"), /candidate/);
    for (const override of [{ state: "DRAFT" }, { artifact_sha256: "0".repeat(64) }, { evidence_sha256: "0".repeat(64) }, { earliest_expires_at: new Date(Date.now() + 172800000).toISOString() }]) {
      await writeFile(authorityPath, JSON.stringify({ ...projection, pages: [{ ...projection.pages[0], ...override }] }));
      assert.throws(() => loadPublishedVisibilityPagesFromDirectories(generated, authorityPath));
    }
    await rm(authorityPath);
    assert.deepEqual(loadPublishedVisibilityPagesFromDirectories(generated, authorityPath), []);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
});
