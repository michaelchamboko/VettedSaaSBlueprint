import { randomUUID } from "node:crypto";

import { requireAdminAudit } from "@/lib/auth/audit";
import { withTransaction, type TransactionRunner } from "@/lib/db";

export type PublishApprovedPageInput = {
  blueprintId: string;
  productId: string;
  path: string;
  complianceResult: Record<string, unknown>;
  qualityScore?: number | null;
  evidenceScore?: number | null;
};

export type PublishedPageResult = {
  id: string;
  blueprint_id: string;
  current_version_id: string;
  owner_publish_audit_id: string;
  path: string;
  status: "published";
  published_at: string;
};

function rowValue(row: Record<string, unknown> | undefined, key: string) {
  return row?.[key] ?? row?.[key.toUpperCase()];
}

export async function publishApprovedPageAtomically(
  input: PublishApprovedPageInput,
  runTransaction: TransactionRunner = withTransaction,
): Promise<PublishedPageResult> {
  return runTransaction(async (tx) => {
    const locked = await tx`
      select id, status, structural_json
      from page_blueprints
      where id = ${input.blueprintId}
      for update
    `;
    const blueprint = locked.rows[0];
    if (!blueprint || String(rowValue(blueprint, "status")).toLowerCase() !== "approved") {
      throw new Error("Page blueprint must remain approved while publishing.");
    }

    const versionRows = await tx`
      select coalesce(max(version_number), 0) + 1 as next_version_number
      from page_versions
      where blueprint_id = ${input.blueprintId}
    `;
    const versionNumber = Number(rowValue(versionRows.rows[0], "next_version_number") ?? 1);
    const versionId = randomUUID();
    const publishedAt = new Date().toISOString();
    const structuralCopy = rowValue(blueprint, "structural_json");

    await tx`
      insert into page_versions
        (id, blueprint_id, version_number, structural_copy, compliance_result, quality_score, evidence_score, approved_by, approval_mode, published_at)
      values
        (${versionId}, ${input.blueprintId}, ${versionNumber}, ${typeof structuralCopy === "string" ? structuralCopy : JSON.stringify(structuralCopy)}, ${JSON.stringify(input.complianceResult)}, ${input.qualityScore ?? null}, ${input.evidenceScore ?? null}, ${"owner"}, ${"manual"}, ${publishedAt})
    `;

    const existingPages = await tx`
      select id
      from dynamic_pages
      where blueprint_id = ${input.blueprintId}
      for update
    `;
    const pageId = String(rowValue(existingPages.rows[0], "id") ?? randomUUID());
    if (existingPages.rows[0]) {
      await tx`
        update dynamic_pages
        set current_version_id = ${versionId}, path = ${input.path}, status = ${"published"}, robots = ${"index,follow"}, published_at = ${publishedAt}, updated_at = ${publishedAt}
        where id = ${pageId}
      `;
    } else {
      await tx`
        insert into dynamic_pages
          (id, blueprint_id, current_version_id, path, status, robots, revalidate_seconds, published_at, updated_at)
        values
          (${pageId}, ${input.blueprintId}, ${versionId}, ${input.path}, ${"published"}, ${"index,follow"}, ${10800}, ${publishedAt}, ${publishedAt})
      `;
    }

    await tx`
      insert into generation_jobs (id, product_id, page_id, job_type, status, priority, input_payload)
      values (${randomUUID()}, ${input.productId}, ${pageId}, ${"LANDING_ARTIFACT_PUBLICATION"}, ${"queued"}, ${80}, ${JSON.stringify({ blueprint_id: input.blueprintId, current_version_id: versionId, path: input.path, source: "admin_publish_action" })})
    `;

    const auditId = await requireAdminAudit(tx, "publish_page", {
      blueprint_id: input.blueprintId,
      page_id: pageId,
      current_version_id: versionId,
      published_at: publishedAt,
    });

    return {
      id: pageId,
      blueprint_id: input.blueprintId,
      current_version_id: versionId,
      owner_publish_audit_id: auditId,
      path: input.path,
      status: "published",
      published_at: publishedAt,
    };
  });
}
