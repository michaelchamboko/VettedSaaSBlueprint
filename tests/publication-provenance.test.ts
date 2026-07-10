import assert from "node:assert/strict";
import test from "node:test";

import { publishApprovedPageAtomically } from "../src/lib/pages/publish-transaction";
import type { TransactionSql } from "../src/lib/db/query";

test("atomic publisher propagates audit failure so the transaction can roll back", async () => {
  const statements: string[] = [];
  const tx = (async (strings: TemplateStringsArray) => {
    const statement = strings.join("?").replace(/\s+/g, " ").trim();
    statements.push(statement);
    if (statement.includes("from page_blueprints")) return { rows: [{ ID: "blueprint", STATUS: "approved", STRUCTURAL_JSON: JSON.stringify({ metadata: { url_slug: "review" } }) }] };
    if (statement.includes("max(version_number)")) return { rows: [{ NEXT_VERSION_NUMBER: 1 }] };
    if (statement.includes("from dynamic_pages")) return { rows: [] };
    if (statement.includes("insert into audit_log")) throw new Error("audit write failed");
    return { rows: [] };
  }) as TransactionSql;

  await assert.rejects(
    () => publishApprovedPageAtomically({ blueprintId: "blueprint", productId: "product", path: "/landing-page-builders/review", complianceResult: { publishable: true }, qualityScore: 80, evidenceScore: 80 }, async (work) => work(tx)),
    /audit write failed/i,
  );
  assert.ok(statements.some((statement) => statement.includes("insert into page_versions")));
  assert.ok(statements.some((statement) => statement.includes("insert into generation_jobs")));
});
