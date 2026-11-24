import { realpath } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { ExternalArticleImportV1, ImportFormat } from "./contracts";
import { writeJsonAtomically } from "./engine";
import { readEvidenceBytes } from "./execution-evidence";
import { publicationAuthorityPaths } from "./release";
import { claimWorkflowLease } from "./workflow-lease";

const row = z.record(z.string(), z.unknown());
const rows = z.array(row);
const manifest = z.object({ pages: rows }).passthrough();

async function readOptional(read: () => Promise<Buffer>) {
  try { return JSON.parse((await read()).toString("utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

export function publicationProposals(importId: string, key: string, format: ImportFormat) {
  const directory = `build-pack/article-import/${importId}/${key}/publication`;
  return publicationAuthorityPaths(format).map(file => ({ file, proposalPath: directory + "/" + path.posix.basename(file) }));
}

function scopePath(importId: string, key: string) {
  return `.automation/article-imports/work/${importId}/${key}.publication-scope.json`;
}

const scopeSchema = z.object({ format: z.string(), route: z.string().min(1) }).strict();

export async function retainPublicationScope(root: string, importId: string, key: string, format: ImportFormat, route: string) {
  const file = scopePath(importId, key);
  const previous = await readOptional(() => readEvidenceBytes(root, file));
  if (previous !== undefined) {
    if (!isDeepStrictEqual(previous, { format, route })) throw new Error("STATE_INTEGRITY: publication target changed after worker dispatch");
    return;
  }
  await writeJsonAtomically(path.join(root, file), { format, route });
}

// Workers write one-entry proposals. Only this controller updates the shared files.
export async function applyPublicationProposals(root: string, record: ExternalArticleImportV1, key: string, assertImportLease: () => Promise<void>) {
  const format = record.format;
  const proposals = [];
  for (const { file, proposalPath } of publicationProposals(record.importId, key, format)) {
    const value = await readOptional(() => readEvidenceBytes(root, proposalPath));
    if (value === undefined) continue;
    const items = format === "blog" ? rows.parse(value) : manifest.parse(value).pages;
    proposals.push({ file, value, items });
  }
  if (!proposals.length) return;
  // The worker can change article bytes. The controller fixed its allowed route before launch.
  const scope = scopeSchema.parse(await readOptional(() => readEvidenceBytes(root, scopePath(record.importId, key))));
  if (scope.format !== format) throw new Error("STATE_INTEGRITY: publication scope format mismatch");
  const route = scope.route;
  const identity = format === "visibility" ? "path" : "slug";
  if (proposals.some(({ items }) => items.length !== 1 || items[0][identity] !== route)) throw new Error("PUBLICATION_PROPOSAL_TARGET_MISMATCH");
  const lease = await claimWorkflowLease(root, "publication", format);
  if (!lease) throw new Error("PUBLICATION_CATALOGUE_BUSY");
  try {
    const changes = [];
    for (const { file, value, items: [item] } of proposals) {
      const target = path.join(root, file);
      let ancestor = path.dirname(target);
      while (true) {
        try {
          const relative = path.relative(await realpath(root), await realpath(ancestor));
          if (relative.startsWith(".." + path.sep) || relative === ".." || path.isAbsolute(relative)) throw new Error("PUBLICATION_PATH_ESCAPE");
          break;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT" || ancestor === path.dirname(ancestor)) throw error;
          ancestor = path.dirname(ancestor);
        }
      }
      const current = await readOptional(() => readEvidenceBytes(root, file));
      const entries = current === undefined ? [] : format === "blog" ? rows.parse(current) : manifest.parse(current).pages;
      const matches = entries.filter(entry => entry[identity] === route);
      if (matches.length > 1) throw new Error("PUBLICATION_AUTHORITY_DUPLICATE_TARGET");
      if (isDeepStrictEqual(matches[0], item)) continue;
      const updated = matches.length ? entries.map(entry => entry[identity] === route ? item : entry) : [...entries, item];
      changes.push({ target, value: format === "blog" ? updated : { ...(current ?? value), pages: updated } });
    }
    for (const change of changes) {
      await assertImportLease();
      await lease.assertOwned();
      await writeJsonAtomically(change.target, change.value);
    }
  } finally { await lease.release(); }
}
