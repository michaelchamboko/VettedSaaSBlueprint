import { createHash } from "node:crypto";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import { DesignReferenceCatalogueV1, DesignReferenceV1 } from "./contracts";
import { canonicalJson } from "./fingerprint";

async function hasSymlinkSegment(root: string, relativePath: string) {
  let current = root;
  for (const segment of relativePath.split("/")) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink()) return true;
  }
  return false;
}

function isInside(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export async function validateDesignReferenceCatalogueDirectory(directory: string): Promise<string[]> {
  const catalogueRoot = path.resolve(directory);
  let resolvedRoot: string;
  try { resolvedRoot = await realpath(catalogueRoot); } catch { return ["Catalogue directory is missing or cannot be resolved."]; }
  const cataloguePath = path.join(catalogueRoot, "catalogue.json");
  let catalogue: ReturnType<typeof DesignReferenceCatalogueV1.parse>;
  try {
    if (await hasSymlinkSegment(catalogueRoot, "catalogue.json")) return ["catalogue.json must not be a symlink."];
    const resolvedCatalogue = await realpath(cataloguePath);
    if (!isInside(resolvedRoot, resolvedCatalogue)) return ["catalogue.json realpath escapes the catalogue directory."];
    catalogue = DesignReferenceCatalogueV1.parse(JSON.parse(await readFile(cataloguePath, "utf8")));
  } catch (error) {
    return [`Catalogue schema error: ${error instanceof Error ? error.message : String(error)}`];
  }

  const errors: string[] = [];
  const urls = catalogue.references.map((reference) => reference.source_url);
  if (new Set(urls).size !== urls.length) errors.push("Catalogue source URLs must be unique.");
  let aggregateBytes = 0;
  for (const reference of catalogue.references) {
    const individualPath = `references/${reference.id}.json`;
    try {
      const requested = path.resolve(catalogueRoot, individualPath);
      if (!isInside(catalogueRoot, requested)) throw new Error("path escapes the catalogue directory");
      if (await hasSymlinkSegment(catalogueRoot, individualPath)) throw new Error("must not contain symlinks");
      const resolved = await realpath(requested);
      if (!isInside(resolvedRoot, resolved)) throw new Error("realpath escapes the catalogue directory");
      const individual = DesignReferenceV1.parse(JSON.parse(await readFile(requested, "utf8")));
      if (canonicalJson(individual) !== canonicalJson(reference)) errors.push(`${reference.id} individual reference JSON does not match its catalogue entry/digest.`);
    } catch (error) {
      errors.push(`${reference.id} individual reference JSON is missing or invalid: ${error instanceof Error ? error.message : String(error)}.`);
    }

    for (const viewport of ["desktop", "mobile"] as const) {
      const capture = reference.captures[viewport];
      if (!capture) continue;
      const expectedPath = `captures/${reference.id}/${viewport}.webp`;
      if (capture.path !== expectedPath) errors.push(`${reference.id} ${viewport} capture path must be ${expectedPath}.`);
      const capturePath = path.resolve(catalogueRoot, capture.path);
      if (!isInside(catalogueRoot, capturePath)) { errors.push(`${reference.id} ${viewport} capture path escapes the catalogue directory.`); continue; }
      try {
        if (await hasSymlinkSegment(catalogueRoot, capture.path)) { errors.push(`${reference.id} ${viewport} capture path must not contain symlinks.`); continue; }
        const resolvedCapture = await realpath(capturePath);
        if (!isInside(resolvedRoot, resolvedCapture)) { errors.push(`${reference.id} ${viewport} capture realpath escapes the catalogue directory.`); continue; }
        const bytes = await readFile(capturePath);
        const info = await stat(capturePath);
        aggregateBytes += info.size;
        if (info.size > 2_000_000) errors.push(`${reference.id} ${viewport} capture exceeds 2 MB.`);
        if (info.size !== capture.byte_size) errors.push(`${reference.id} ${viewport} capture byte size does not match its catalogue entry.`);
        if (createHash("sha256").update(bytes).digest("hex") !== capture.sha256) errors.push(`${reference.id} ${viewport} capture hash mismatch.`);
        try {
          const image = await sharp(bytes).metadata();
          if (image.format !== "webp") errors.push(`${reference.id} ${viewport} capture is not an actual WebP image.`);
        } catch {
          errors.push(`${reference.id} ${viewport} capture is not an actual WebP image.`);
        }
      } catch (error) {
        errors.push(`${reference.id} ${viewport} capture file is missing or invalid: ${error instanceof Error ? error.message : String(error)}.`);
      }
    }
  }
  if (aggregateBytes > 100_000_000) errors.push("Aggregate capture bytes exceed 100 MB; enable Git LFS before adding more captures.");
  return errors;
}
