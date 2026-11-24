import { realpath } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type { ImportFormat } from "./contracts";
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

// Workers write one-entry proposals. Only this controller updates the shared files.
export async function applyPublicationProposals(root: string, format: ImportFormat, route: string, directory: string, assertImportLease: () => Promise<void>) {
  const proposals = [];
  for (const file of publicationAuthorityPaths(format)) {
    const value = await readOptional(() => readEvidenceBytes(root, directory + "/" + path.posix.basename(file)));
    if (value === undefined) continue;
    const items = format === "blog" ? rows.parse(value) : manifest.parse(value).pages;
    const key = format === "visibility" ? "path" : "slug";
    if (items.length !== 1 || items[0][key] !== route) throw new Error("PUBLICATION_PROPOSAL_TARGET_MISMATCH");
    proposals.push({ file, value, item: items[0], key });
  }
  if (!proposals.length) return;
  const lease = await claimWorkflowLease(root, "publication", format);
  if (!lease) throw new Error("CAPABILITY_UNAVAILABLE: publication catalogue is busy");
  try {
    const changes = [];
    for (const { file, value, item, key } of proposals) {
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
      const matches = entries.filter(entry => entry[key] === route);
      if (matches.length > 1) throw new Error("PUBLICATION_AUTHORITY_DUPLICATE_TARGET");
      if (isDeepStrictEqual(matches[0], item)) continue;
      const updated = matches.length ? entries.map(entry => entry[key] === route ? item : entry) : [...entries, item];
      changes.push({ target, value: format === "blog" ? updated : { ...(current ?? value), pages: updated } });
    }
    for (const change of changes) {
      await assertImportLease();
      await lease.assertOwned();
      await writeJsonAtomically(change.target, change.value);
    }
  } finally { await lease.release(); }
}
