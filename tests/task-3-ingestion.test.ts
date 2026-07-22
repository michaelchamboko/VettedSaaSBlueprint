import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, realpath, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";

import { ingestDesignReferences, type ReferenceIngestionFileSystem, type ReferenceIngestionManifest } from "@/lib/design-references/ingestion";
import { createDesignReference, sectionFamilies, sectionKeys } from "@/lib/design-references/contracts";
import { validateDesignReferenceCatalogueDirectory } from "../scripts/validate-design-reference-catalogue";

function reference(id = "lp-ref-0001", source_url = "https://example.com/reference"): ReferenceIngestionManifest["references"][number] {
  return {
    id, source_url, captured_at: "2026-07-14T00:00:00.000Z", usage_status: "active", usage_scope: "internal_only", primary_product_category: "crm-tools", category_tags: ["crm-tools"],
    observations: {
      hero: { variant: "asymmetric_split", composition: "split", alignment: "left", media_strategy: "proof" },
      typography: { pair: "fraunces_manrope", display_style: "serif", body_style: "sans", scale: "large", weight_contrast: "high" },
      sections: sectionKeys.map((key, index) => ({ key, family: sectionFamilies[index], composition_notes: `Reviewed ${key}` })),
      cta: { variant: "inline_decision", placement: "hero", label_pattern: "verb", interaction: "inline" },
      motion: { variant: "quiet_stagger", triggers: "viewport", intensity: "low", reduced_motion_behavior: "static" },
      mobile: { strategy: "copy_first", stacking: "copy", navigation: "condensed", cta_behavior: "inline", overflow_behavior: "clip" },
    },
    supported_variant_tags: { hero: ["asymmetric_split"], typography: ["fraunces_manrope"], section_variants: ["split_editorial"], cta: ["inline_decision"], motion: ["quiet_stagger"], mobile: ["copy_first"] },
    reusable_principles: ["Use hierarchy, not source copy."], prohibited_copy_notes: ["No copied assets."],
  };
}

async function emptyCatalogue() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "reference-ingestion-"));
  await writeFile(path.join(directory, "catalogue.json"), JSON.stringify({ schema_version: "DesignReferenceCatalogueV1", references: [] }));
  return directory;
}

const validCapture = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: "#eee" } }).webp({ quality: 82 }).toBuffer();
const validPng = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: "#eee" } }).png().toBuffer();
const validAdapter = () => ({ capture: async (_url: string, viewport: { width: number; height: number }) => validCapture(viewport.width, viewport.height) });

test("dry-run fully validates supplied observations without capture or writes", async () => {
  const directory = await emptyCatalogue();
  let captures = 0;
  const invalid = reference();
  (invalid.observations.hero as { variant: string }).variant = "invented_variant";
  await assert.rejects(ingestDesignReferences({ manifest: { references: [invalid] } as never, catalogueDirectory: directory, adapter: { capture: async () => { captures++; return Buffer.from("webp"); } }, dryRun: true }), /hero|variant|contract|validation/i);
  assert.equal(captures, 0);
  await assert.rejects(stat(path.join(directory, "references")), /ENOENT/);
});

test("incremental merge writes exact reference/capture structure and validates the complete directory", async () => {
  const directory = await emptyCatalogue();
  let captures = 0;
  const adapter = { capture: async (_url: string, viewport: { width: number; height: number }) => { captures++; return validCapture(viewport.width, viewport.height); } };
  await ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter });
  await ingestDesignReferences({ manifest: { references: [reference("lp-ref-0002", "https://example.com/second")] }, catalogueDirectory: directory, adapter });
  const catalogue = JSON.parse(await readFile(path.join(directory, "catalogue.json"), "utf8"));
  assert.deepEqual(catalogue.references.map((item: { id: string }) => item.id), ["lp-ref-0001", "lp-ref-0002"]);
  for (const id of ["lp-ref-0001", "lp-ref-0002"]) {
    assert.ok((await stat(path.join(directory, "references", `${id}.json`))).isFile());
    assert.ok((await stat(path.join(directory, "captures", id, "desktop.webp"))).isFile());
    assert.ok((await stat(path.join(directory, "captures", id, "mobile.webp"))).isFile());
  }
  assert.deepEqual(await validateDesignReferenceCatalogueDirectory(directory), []);
});

test("duplicate retained URLs, oversize captures, and stale individual reference files fail closed", async () => {
  const directory = await emptyCatalogue();
  const adapter = validAdapter();
  await ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter });
  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference("lp-ref-0001", "https://example.com/replacement")] }, catalogueDirectory: directory, adapter, dryRun: true }), /duplicate.*reference ID|reference ID.*catalogue/i);
  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference("lp-ref-0002")] }, catalogueDirectory: directory, adapter, dryRun: true }), /duplicate.*source URL|source URL.*catalogue/i);

  const oversizeDirectory = await emptyCatalogue();
  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: oversizeDirectory, adapter: { capture: async () => Buffer.alloc(2_000_001) } }), /2 MB/i);
  await assert.rejects(stat(path.join(oversizeDirectory, "references", "lp-ref-0001.json")), /ENOENT/);

  await writeFile(path.join(directory, "references", "lp-ref-0001.json"), JSON.stringify({ id: "lp-ref-0001", stale: true }));
  assert.match((await validateDesignReferenceCatalogueDirectory(directory)).join("\n"), /individual reference|digest|match/i);
});

test("directory validation rejects bytes that are not actual WebP captures even with matching hashes", async () => {
  const directory = await emptyCatalogue();
  const bytes = Buffer.from("not-webp");
  const sha256 = (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex");
  const item = createDesignReference({
    ...reference(),
    captures: {
      desktop: { path: "captures/lp-ref-0001/desktop.webp", sha256, byte_size: bytes.byteLength },
      mobile: { path: "captures/lp-ref-0001/mobile.webp", sha256, byte_size: bytes.byteLength },
    },
  });
  await mkdir(path.join(directory, "references"));
  await mkdir(path.join(directory, "captures", item.id), { recursive: true });
  await writeFile(path.join(directory, "references", `${item.id}.json`), JSON.stringify(item));
  await writeFile(path.join(directory, "captures", item.id, "desktop.webp"), bytes);
  await writeFile(path.join(directory, "captures", item.id, "mobile.webp"), bytes);
  await writeFile(path.join(directory, "catalogue.json"), JSON.stringify({ schema_version: "DesignReferenceCatalogueV1", references: [item] }));

  assert.match((await validateDesignReferenceCatalogueDirectory(directory)).join("\n"), /actual WebP|WebP capture|valid WebP/i);
});

test("CI validation never invokes capture and rejects invalid committed files", async () => {
  const directory = await emptyCatalogue();
  let captures = 0;
  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter: { capture: async () => { captures++; return Buffer.from("webp"); } }, ci: true }), /CI.*never fetches/i);
  assert.equal(captures, 0);
});

test("rejects non-WebP capture bytes before committing files", async () => {
  const directory = await emptyCatalogue();
  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter: { capture: async () => Buffer.from("not-a-webp") } }), /WebP|image format|capture/i);
  await assert.rejects(stat(path.join(directory, "references", "lp-ref-0001.json")), /ENOENT/);
});

test("rejects symlinked write parents before any permanent write, with a deterministic Windows fallback", async () => {
  const directory = await emptyCatalogue();
  const outside = await mkdtemp(path.join(os.tmpdir(), "reference-outside-"));
  let fileSystem: ReferenceIngestionFileSystem | undefined;
  try {
    await symlink(outside, path.join(directory, "references"), "junction");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EPERM") throw error;
    const symlinkStats = new Proxy(await lstat(directory, { bigint: false }), {
      get(target, property, receiver) {
        if (property === "isSymbolicLink") return () => true;
        return Reflect.get(target, property, receiver);
      },
    });
    fileSystem = {
      lstat: async (target) => target === path.join(directory, "references")
        ? symlinkStats
        : lstat(target, { bigint: false }),
      realpath,
      mkdir,
      writeFile,
    };
  }
  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter: validAdapter(), fileSystem }), /symlink|junction|write path/i);
  await assert.rejects(stat(path.join(outside, "lp-ref-0001.json")), /ENOENT/);
});

test("preflights every target before writing any capture when an individual JSON target is a symlink", async (t) => {
  const directory = await emptyCatalogue();
  const outside = await mkdtemp(path.join(os.tmpdir(), "reference-outside-target-"));
  await mkdir(path.join(directory, "references"));
  try {
    await symlink(path.join(outside, "reference.json"), path.join(directory, "references", "lp-ref-0001.json"), "file");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EPERM") { t.skip("Windows symlink privilege is unavailable in this environment."); return; }
    throw error;
  }

  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter: validAdapter() }), /symlink|write target/i);
  await assert.rejects(stat(path.join(directory, "captures", "lp-ref-0001", "desktop.webp")), /ENOENT/);
});

test("CLI accepts a mocked capture adapter, uses the exact viewport plan, and closes it in finally", async () => {
  const ingestionCliModule = await import("../scripts/ingest-design-references");
  assert.equal(typeof ingestionCliModule.runDesignReferenceIngestionCli, "function");
  const directory = await emptyCatalogue();
  const manifestPath = path.join(directory, "manifest.json");
  await writeFile(manifestPath, JSON.stringify({ references: [reference()] }));
  const captures: Array<{ width: number; height: number; type: string; quality: number }> = [];
  let closed = 0;

  await ingestionCliModule.runDesignReferenceIngestionCli({
    args: ["--manifest", manifestPath],
    catalogueDirectory: directory,
    adapter: {
      capture: async (_url, viewport) => {
        captures.push(viewport);
        return validCapture(viewport.width, viewport.height);
      },
      close: async () => { closed++; },
    },
    write: () => undefined,
  });

  assert.deepEqual(captures, [
    { width: 1440, height: 900, type: "webp", quality: 82 },
    { width: 390, height: 844, type: "webp", quality: 82 },
  ]);
  assert.equal(closed, 1);
});

test("Playwright capture uses bounded DOM readiness, font readiness, and a settle delay", async () => {
  const ingestionCliModule = await import("../scripts/ingest-design-references") as typeof import("../scripts/ingest-design-references") & {
    createBoundedPlaywrightReferenceCaptureAdapter?: (input: { browser: unknown; navigationTimeoutMs?: number; settleDelayMs?: number }) => { capture: ReferenceIngestionFileSystem["writeFile"] extends never ? never : (url: string, viewport: { width: number; height: number; type: "webp"; quality: number }) => Promise<Buffer>; close: () => Promise<void> };
  };
  assert.equal(typeof ingestionCliModule.createBoundedPlaywrightReferenceCaptureAdapter, "function");
  const navigations: unknown[] = [];
  const viewports: unknown[] = [];
  const settles: number[] = [];
  const screenshots: unknown[] = [];
  let fontChecks = 0;
  let fontWaitResult: unknown = "not evaluated";
  let pageClosed = 0;
  let browserClosed = 0;
  const previousDocument = globalThis.document;
  Object.defineProperty(globalThis, "document", { configurable: true, value: { fonts: { ready: Promise.resolve("font-face-set") } } });
  const page = {
    goto: async (_url: string, options: unknown) => { navigations.push(options); },
    evaluate: async (callback: () => unknown) => { fontChecks++; fontWaitResult = await callback(); },
    waitForTimeout: async (milliseconds: number) => { settles.push(milliseconds); },
    screenshot: async (options: unknown) => { screenshots.push(options); return validPng(1440, 900); },
    close: async () => { pageClosed++; },
  };
  const adapter = ingestionCliModule.createBoundedPlaywrightReferenceCaptureAdapter!({
    browser: {
      newPage: async (options: unknown) => { viewports.push(options); return page; },
      close: async () => { browserClosed++; },
    },
    navigationTimeoutMs: 12_000,
    settleDelayMs: 175,
  });

  try {
    const capture = await adapter.capture("https://example.com/reference", { width: 1440, height: 900, type: "webp", quality: 82 });
    const metadata = await sharp(capture).metadata();
    assert.deepEqual({ format: metadata.format, width: metadata.width, height: metadata.height }, { format: "webp", width: 1440, height: 900 });
    await adapter.close();
  } finally {
    if (previousDocument === undefined) delete (globalThis as { document?: Document }).document;
    else Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
  }

  assert.deepEqual(navigations, [{ waitUntil: "domcontentloaded", timeout: 12_000 }]);
  assert.deepEqual(viewports, [{ viewport: { width: 1440, height: 900 } }]);
  assert.equal(fontChecks, 1);
  assert.equal(fontWaitResult, undefined);
  assert.deepEqual(settles, [175]);
  assert.deepEqual(screenshots, [{ type: "png" }]);
  assert.equal(pageClosed, 1);
  assert.equal(browserClosed, 1);
});

test("removes every new artifact and empty directory when post-merge validation fails", async () => {
  const directory = await emptyCatalogue();
  const fileSystem: ReferenceIngestionFileSystem = {
    lstat: (target) => lstat(target, { bigint: false }),
    realpath,
    mkdir,
    writeFile: async (target, data) => {
      await writeFile(target, target.endsWith("desktop.webp") ? Buffer.from("corrupted") : data);
    },
  };

  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter: validAdapter(), fileSystem }), /complete validation|failed/i);
  const catalogue = JSON.parse(await readFile(path.join(directory, "catalogue.json"), "utf8"));
  assert.deepEqual(catalogue.references, []);
  for (const target of [
    path.join(directory, "references", "lp-ref-0001.json"),
    path.join(directory, "captures", "lp-ref-0001", "desktop.webp"),
    path.join(directory, "captures", "lp-ref-0001", "mobile.webp"),
    path.join(directory, "references"),
    path.join(directory, "captures", "lp-ref-0001"),
    path.join(directory, "captures"),
  ]) await assert.rejects(stat(target), /ENOENT/);
});

test("restores every pre-existing target byte when a later write fails", async () => {
  const directory = await emptyCatalogue();
  const referenceDirectory = path.join(directory, "references");
  const captureDirectory = path.join(directory, "captures", "lp-ref-0001");
  await mkdir(referenceDirectory);
  await mkdir(captureDirectory, { recursive: true });
  const prior = {
    reference: Buffer.from("prior-reference-json"),
    desktop: Buffer.from("prior-desktop-capture"),
    mobile: Buffer.from("prior-mobile-capture"),
  };
  await writeFile(path.join(referenceDirectory, "lp-ref-0001.json"), prior.reference);
  await writeFile(path.join(captureDirectory, "desktop.webp"), prior.desktop);
  await writeFile(path.join(captureDirectory, "mobile.webp"), prior.mobile);
  let failed = false;
  const fileSystem: ReferenceIngestionFileSystem = {
    lstat: (target) => lstat(target, { bigint: false }),
    realpath,
    mkdir,
    writeFile: async (target, data) => {
      if (target === path.join(directory, "catalogue.json") && !failed) {
        failed = true;
        throw new Error("simulated catalogue write failure");
      }
      await writeFile(target, data);
    },
  };

  await assert.rejects(ingestDesignReferences({ manifest: { references: [reference()] }, catalogueDirectory: directory, adapter: validAdapter(), fileSystem }), /simulated catalogue write failure/i);
  assert.deepEqual(await readFile(path.join(referenceDirectory, "lp-ref-0001.json")), prior.reference);
  assert.deepEqual(await readFile(path.join(captureDirectory, "desktop.webp")), prior.desktop);
  assert.deepEqual(await readFile(path.join(captureDirectory, "mobile.webp")), prior.mobile);
  const catalogue = JSON.parse(await readFile(path.join(directory, "catalogue.json"), "utf8"));
  assert.deepEqual(catalogue.references, []);
});
