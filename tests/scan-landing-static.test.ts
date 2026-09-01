import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadLandingStaticContext } from "../scripts/scan-landing-static.mjs";

async function makeCatalogue() {
  return mkdtemp(path.join(os.tmpdir(), "landing-static-catalogue-"));
}

test("production static scanning fails closed and reports every catalogue entry without complete publication provenance", async () => {
  const catalogueDir = await makeCatalogue();
  try {
    await writeFile(path.join(catalogueDir, "index.json"), `${JSON.stringify({
      pages: [
        {
          slug: "missing-source",
          artifact: "missing-source.json",
          status: "published",
          published_at: "2026-07-13T09:00:00.000Z",
          current_version_id: "version-1",
          owner_publish_audit_id: "audit-1",
        },
        {
          slug: "missing-audit",
          artifact: "missing-audit.json",
          status: "published",
          publication_source: "agent_verified_release",
          published_at: "2026-07-13T09:00:00.000Z",
          current_version_id: "version-2",
        },
        {
          slug: "invalid-timestamp",
          artifact: "invalid-timestamp.json",
          status: "published",
          publication_source: "agent_verified_release",
          published_at: "not-a-timestamp",
          current_version_id: "version-3",
          owner_publish_audit_id: "audit-3",
        },
      ],
    }, null, 2)}\n`);

    assert.throws(
      () => loadLandingStaticContext({ inputMode: "production", targetDir: catalogueDir }),
      (error: unknown) => {
        assert.match(String(error), /invalid publication provenance/i);
        assert.match(String(error), /missing-source/i);
        assert.match(String(error), /missing-audit/i);
        assert.match(String(error), /invalid-timestamp/i);
        return true;
      },
    );
  } finally {
    await rm(catalogueDir, { recursive: true, force: true });
  }
});
