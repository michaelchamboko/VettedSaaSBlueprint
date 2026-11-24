import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rmdir, unlink, writeFile } from "node:fs/promises";
import type { Stats } from "node:fs";
import path from "node:path";
import sharp from "sharp";

import { validateDesignReferenceCatalogueDirectory } from "./catalogue-directory";
import { createDesignReference, DesignReferenceCatalogueV1, type DesignReferenceV1 } from "./contracts";
import { canonicalJson } from "./fingerprint";

export type ReferenceCaptureAdapter = {
  capture(url: string, viewport: { width: number; height: number; type: "webp"; quality: number }): Promise<Buffer>;
  close?(): Promise<void>;
};
export type ReferenceIngestionReference = Omit<Parameters<typeof createDesignReference>[0], "captures" | "entry_digest">;
export type ReferenceIngestionManifest = { references: ReferenceIngestionReference[] };
export type ReferenceIngestionFileSystem = {
  lstat(target: string): Promise<Stats>;
  realpath(target: string): Promise<string>;
  mkdir(target: string, options: { recursive: boolean }): Promise<unknown>;
  writeFile(target: string, data: Uint8Array | string): Promise<unknown>;
  readFile?(target: string): Promise<Buffer>;
  unlink?(target: string): Promise<void>;
  rmdir?(target: string): Promise<void>;
};
type CompleteReferenceIngestionFileSystem = Required<ReferenceIngestionFileSystem>;
const defaultFileSystem: CompleteReferenceIngestionFileSystem = {
  lstat: (target) => lstat(target, { bigint: false }),
  realpath,
  mkdir,
  writeFile,
  readFile: (target) => readFile(target),
  unlink,
  rmdir,
};
function resolveReferenceFileSystem(fileSystem?: ReferenceIngestionFileSystem): CompleteReferenceIngestionFileSystem {
  return {
    lstat: fileSystem?.lstat ?? defaultFileSystem.lstat,
    realpath: fileSystem?.realpath ?? defaultFileSystem.realpath,
    mkdir: fileSystem?.mkdir ?? defaultFileSystem.mkdir,
    writeFile: fileSystem?.writeFile ?? defaultFileSystem.writeFile,
    readFile: fileSystem?.readFile ?? defaultFileSystem.readFile,
    unlink: fileSystem?.unlink ?? defaultFileSystem.unlink,
    rmdir: fileSystem?.rmdir ?? defaultFileSystem.rmdir,
  };
}

const digest = (bytes: Uint8Array | string) => createHash("sha256").update(bytes).digest("hex");

function inside(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

async function assertSafeWriteTarget(root: string, resolvedRoot: string, target: string, fileSystem: ReferenceIngestionFileSystem) {
  const absoluteTarget = path.resolve(target);
  if (!inside(root, absoluteTarget)) throw new Error(`Ingestion write path escapes the catalogue directory: ${absoluteTarget}.`);
  const parent = path.dirname(absoluteTarget);
  const relativeParent = path.relative(root, parent);
  let current = root;
  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    try {
      const metadata = await fileSystem.lstat(current);
      if (metadata.isSymbolicLink()) throw new Error(`Ingestion write path contains a symlink or junction at ${current}.`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await fileSystem.mkdir(current, { recursive: false });
      const metadata = await fileSystem.lstat(current);
      if (metadata.isSymbolicLink()) throw new Error(`Ingestion write path became a symlink or junction at ${current}.`);
    }
    const resolvedParent = await fileSystem.realpath(current);
    if (!inside(resolvedRoot, resolvedParent)) throw new Error(`Ingestion write parent resolves outside the catalogue directory: ${current}.`);
  }
  try {
    const targetMetadata = await fileSystem.lstat(absoluteTarget);
    if (targetMetadata.isSymbolicLink()) throw new Error(`Ingestion write target is a symlink: ${absoluteTarget}.`);
    const resolvedTarget = await fileSystem.realpath(absoluteTarget);
    if (!inside(resolvedRoot, resolvedTarget)) throw new Error(`Ingestion write target resolves outside the catalogue directory: ${absoluteTarget}.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function parentDirectories(root: string, targets: string[]) {
  const directories = new Set<string>();
  for (const target of targets) {
    let current = path.dirname(target);
    while (current !== root && inside(root, current)) {
      directories.add(current);
      current = path.dirname(current);
    }
  }
  return [...directories];
}

async function missingDirectoriesBeforeWrite(directories: string[], fileSystem: CompleteReferenceIngestionFileSystem) {
  const missing: string[] = [];
  for (const directory of directories) {
    try {
      await fileSystem.lstat(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      missing.push(directory);
    }
  }
  return missing;
}

type FileSnapshot = { target: string; existed: boolean; bytes?: Buffer };

async function snapshotFile(target: string, fileSystem: CompleteReferenceIngestionFileSystem): Promise<FileSnapshot> {
  try {
    const metadata = await fileSystem.lstat(target);
    if (!metadata.isFile()) throw new Error(`Ingestion target must be a regular file: ${target}.`);
    return { target, existed: true, bytes: await fileSystem.readFile(target) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { target, existed: false };
    throw error;
  }
}

async function rollbackWrites(input: {
  root: string;
  resolvedRoot: string;
  cataloguePath: string;
  snapshots: FileSnapshot[];
  newDirectories: string[];
  fileSystem: CompleteReferenceIngestionFileSystem;
}) {
  const rollbackErrors: string[] = [];
  const catalogueSnapshot = input.snapshots.find((snapshot) => snapshot.target === input.cataloguePath);
  const artifactSnapshots = input.snapshots.filter((snapshot) => snapshot.target !== input.cataloguePath).reverse();
  for (const snapshot of [...artifactSnapshots, ...(catalogueSnapshot ? [catalogueSnapshot] : [])]) {
    try {
      await assertSafeWriteTarget(input.root, input.resolvedRoot, snapshot.target, input.fileSystem);
      if (snapshot.existed) await input.fileSystem.writeFile(snapshot.target, snapshot.bytes!);
      else {
        try { await input.fileSystem.unlink(snapshot.target); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      }
    } catch (error) {
      rollbackErrors.push(`${snapshot.target}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const directory of [...input.newDirectories].sort((left, right) => right.length - left.length)) {
    try {
      const metadata = await input.fileSystem.lstat(directory);
      if (metadata.isSymbolicLink()) throw new Error("refusing to remove a symlink or junction");
      const resolvedDirectory = await input.fileSystem.realpath(directory);
      if (!inside(input.resolvedRoot, resolvedDirectory)) throw new Error("realpath escapes the catalogue directory");
      await input.fileSystem.rmdir(directory);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "ENOTEMPTY" && code !== "EEXIST") {
        rollbackErrors.push(`${directory}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return rollbackErrors;
}

async function validateWebpCapture(bytes: Buffer, viewport: { width: number; height: number }) {
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try { metadata = await sharp(bytes).metadata(); } catch (error) { throw new Error("Captured bytes are not a valid WebP image.", { cause: error }); }
  if (metadata.format !== "webp") throw new Error(`Captured image format must be WebP, received ${metadata.format ?? "unknown"}.`);
  if (metadata.width !== viewport.width || metadata.height !== viewport.height) throw new Error(`Captured WebP dimensions must be ${viewport.width}x${viewport.height}.`);
}

function plannedReference(supplied: ReferenceIngestionManifest["references"][number]) {
  return createDesignReference({
    ...supplied,
    captures: {
      desktop: { path: `captures/${supplied.id}/desktop.webp`, sha256: "0".repeat(64), byte_size: 1 },
      mobile: { path: `captures/${supplied.id}/mobile.webp`, sha256: "0".repeat(64), byte_size: 1 },
    },
  });
}

export async function replaceDesignReference(input: {
  catalogueDirectory: string;
  reference: DesignReferenceV1;
  desktopCapture: Buffer;
  mobileCapture: Buffer;
  fileSystem?: ReferenceIngestionFileSystem;
}) {
  const fs = resolveReferenceFileSystem(input.fileSystem);
  const catalogueDir = path.resolve(input.catalogueDirectory);
  const resolvedRoot = await fs.realpath(catalogueDir);
  const cataloguePath = path.join(catalogueDir, "catalogue.json");
  const existingContents = await fs.readFile(cataloguePath);
  const existing = DesignReferenceCatalogueV1.parse(JSON.parse(existingContents.toString()));
  const refDir = path.join(catalogueDir, "captures", input.reference.id);
  const refFile = path.join(catalogueDir, "references", `${input.reference.id}.json`);

  const desktopTarget = path.join(catalogueDir, input.reference.captures.desktop!.path);
  const mobileTarget = path.join(catalogueDir, input.reference.captures.mobile!.path);
  const allTargets = [desktopTarget, mobileTarget, refFile, cataloguePath];
  for (const target of allTargets) await assertSafeWriteTarget(catalogueDir, resolvedRoot, target, fs);

  const snapshots = await Promise.all(allTargets.map((target) => snapshotFile(target, fs)));

  try {
    await fs.mkdir(refDir, { recursive: true });
    await fs.writeFile(desktopTarget, input.desktopCapture);
    await fs.writeFile(mobileTarget, input.mobileCapture);
    await fs.writeFile(refFile, `${JSON.stringify(input.reference, null, 2)}\n`);

    const updatedCatalogue = DesignReferenceCatalogueV1.parse({
      schema_version: "DesignReferenceCatalogueV1",
      references: existing.references.map((r) => r.id === input.reference.id ? input.reference : r),
    });
    await fs.writeFile(cataloguePath, `${JSON.stringify(updatedCatalogue, null, 2)}\n`);

    const errors = await validateDesignReferenceCatalogueDirectory(catalogueDir);
    if (errors.length > 0) throw new Error(`Replaced catalogue failed validation: ${errors.join("; ")}`);
  } catch (error) {
    const rollbackErrors = await rollbackWrites({ root: catalogueDir, resolvedRoot, cataloguePath, snapshots, newDirectories: [], fileSystem: fs });
    if (rollbackErrors.length > 0) throw new Error(`Replacement failed and rollback incomplete: ${rollbackErrors.join("; ")}`, { cause: error });
    throw error;
  }
}

export async function ingestDesignReferences(input: { manifest: ReferenceIngestionManifest; catalogueDirectory: string; adapter?: ReferenceCaptureAdapter; dryRun?: boolean; ci?: boolean; fileSystem?: ReferenceIngestionFileSystem }) {
  const fileSystem: CompleteReferenceIngestionFileSystem = {
    lstat: input.fileSystem?.lstat ?? defaultFileSystem.lstat,
    realpath: input.fileSystem?.realpath ?? defaultFileSystem.realpath,
    mkdir: input.fileSystem?.mkdir ?? defaultFileSystem.mkdir,
    writeFile: input.fileSystem?.writeFile ?? defaultFileSystem.writeFile,
    readFile: input.fileSystem?.readFile ?? defaultFileSystem.readFile,
    unlink: input.fileSystem?.unlink ?? defaultFileSystem.unlink,
    rmdir: input.fileSystem?.rmdir ?? defaultFileSystem.rmdir,
  };
  const catalogueDirectory = path.resolve(input.catalogueDirectory);
  const resolvedRoot = await fileSystem.realpath(catalogueDirectory);
  const cataloguePath = path.join(catalogueDirectory, "catalogue.json");
  const existingCatalogueContents = await readFile(cataloguePath, "utf8");
  const existing = DesignReferenceCatalogueV1.parse(JSON.parse(existingCatalogueContents));
  const existingErrors = await validateDesignReferenceCatalogueDirectory(catalogueDirectory);
  if (existing.references.length > 0 && existingErrors.length > 0) throw new Error(`Existing catalogue is invalid: ${existingErrors.join("; ")}`);

  const ids = input.manifest.references.map((reference) => reference.id);
  const urls = input.manifest.references.map((reference) => reference.source_url);
  if (new Set(ids).size !== ids.length) throw new Error("Input manifest contains duplicate reference IDs.");
  if (new Set(urls).size !== urls.length) throw new Error("Input manifest contains duplicate source URLs.");
  const retained = existing.references;
  const retainedIds = new Set(retained.map((reference) => reference.id));
  const retainedUrls = new Set(retained.map((reference) => reference.source_url));
  for (const id of ids) {
    if (retainedIds.has(id)) throw new Error(`Input reference ID duplicates a retained catalogue entry: ${id}.`);
  }
  for (const url of urls) {
    if (new URL(url).protocol !== "https:") throw new Error("Reference source URLs must use HTTPS.");
    if (retainedUrls.has(url)) throw new Error(`Input source URL duplicates a retained catalogue entry: ${url}.`);
  }

  const planned = input.manifest.references.map(plannedReference);
  DesignReferenceCatalogueV1.parse({ schema_version: "DesignReferenceCatalogueV1", references: [...retained, ...planned].sort((left, right) => left.id.localeCompare(right.id)) });
  if (input.dryRun) return { dry_run: true, planned_ids: ids, retained_ids: retained.map((reference) => reference.id) };
  if (input.ci) throw new Error("CI catalogue validation never fetches or captures source URLs.");
  if (!input.adapter) throw new Error("Reference ingestion requires an injectable capture adapter.");

  const captured: Array<{ reference: DesignReferenceV1; desktop: Buffer; mobile: Buffer }> = [];
  for (const supplied of input.manifest.references) {
    const desktop = await input.adapter.capture(supplied.source_url, { width: 1440, height: 900, type: "webp", quality: 82 });
    const mobile = await input.adapter.capture(supplied.source_url, { width: 390, height: 844, type: "webp", quality: 82 });
    if (desktop.byteLength > 2_000_000 || mobile.byteLength > 2_000_000) throw new Error("Reference captures cannot exceed 2 MB.");
    await validateWebpCapture(desktop, { width: 1440, height: 900 });
    await validateWebpCapture(mobile, { width: 390, height: 844 });
    captured.push({
      desktop,
      mobile,
      reference: createDesignReference({
        ...supplied,
        captures: {
          desktop: { path: `captures/${supplied.id}/desktop.webp`, sha256: digest(desktop), byte_size: desktop.byteLength },
          mobile: { path: `captures/${supplied.id}/mobile.webp`, sha256: digest(mobile), byte_size: mobile.byteLength },
        },
      }),
    });
  }
  const catalogue = DesignReferenceCatalogueV1.parse({ schema_version: "DesignReferenceCatalogueV1", references: [...retained, ...captured.map((item) => item.reference)].sort((left, right) => left.id.localeCompare(right.id)) });

  const writes: Array<[string, Uint8Array | string]> = captured.flatMap((item) => {
    const referenceDirectory = path.join(catalogueDirectory, "references");
    const captureDirectory = path.join(catalogueDirectory, "captures", item.reference.id);
    return [
      [path.join(captureDirectory, "desktop.webp"), item.desktop],
      [path.join(captureDirectory, "mobile.webp"), item.mobile],
      [path.join(referenceDirectory, `${item.reference.id}.json`), `${JSON.stringify(item.reference, null, 2)}\n`],
    ] as Array<[string, Uint8Array | string]>;
  });
  const catalogueWrite: [string, string] = [cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`];
  const allTargets = [...writes.map(([target]) => target), cataloguePath];
  const plannedDirectories = parentDirectories(catalogueDirectory, allTargets);
  const newDirectories = await missingDirectoriesBeforeWrite(plannedDirectories, fileSystem);
  for (const [target] of [...writes, catalogueWrite]) {
    await assertSafeWriteTarget(catalogueDirectory, resolvedRoot, target, fileSystem);
  }
  const snapshots = await Promise.all(allTargets.map((target) => snapshotFile(target, fileSystem)));
  try {
    for (const [target, data] of writes) await fileSystem.writeFile(target, data);
    await fileSystem.writeFile(...catalogueWrite);
    const errors = await validateDesignReferenceCatalogueDirectory(catalogueDirectory);
    if (errors.length > 0) throw new Error(`Merged catalogue failed complete validation: ${errors.join("; ")}`);
  } catch (error) {
    const rollbackErrors = await rollbackWrites({
      root: catalogueDirectory,
      resolvedRoot,
      cataloguePath,
      snapshots,
      newDirectories,
      fileSystem,
    });
    if (rollbackErrors.length > 0) {
      throw new Error(`Ingestion failed and rollback was incomplete: ${rollbackErrors.join("; ")}`, { cause: error });
    }
    throw error;
  }
  return { dry_run: false, planned_ids: ids, catalogue_sha256: digest(canonicalJson(catalogue)) };
}
