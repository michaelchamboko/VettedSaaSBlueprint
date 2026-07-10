import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import type { TransactionSql } from "@/lib/db";

export type AuditDetails = Record<string, unknown>;

function resolveAuditEntity(details: AuditDetails) {
  if (typeof details.page_id === "string") return { entityType: "dynamic_page", entityId: details.page_id };
  if (typeof details.blueprint_id === "string") return { entityType: "page_blueprint", entityId: details.blueprint_id };
  if (typeof details.product_id === "string") return { entityType: "product", entityId: details.product_id };
  if (typeof details.offer_folder_id === "string") return { entityType: "offer_folder", entityId: details.offer_folder_id };
  if (typeof details.affiliate_link_id === "string") return { entityType: "affiliate_link", entityId: details.affiliate_link_id };
  if (typeof details.generation_job_id === "string") return { entityType: "generation_job", entityId: details.generation_job_id };
  if (typeof details.recommendation_id === "string") return { entityType: "optimization_recommendation", entityId: details.recommendation_id };
  return { entityType: "system", entityId: "unknown" };
}

export async function requireAdminAudit(tx: TransactionSql, action: string, details: AuditDetails): Promise<string> {
  const id = randomUUID();
  const { entityType, entityId } = resolveAuditEntity(details);
  await tx`
    insert into audit_log (id, actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason)
    values (${id}, ${"admin"}, ${null}, ${action}, ${entityType}, ${entityId}, ${null}, ${JSON.stringify(details)}, ${null})
  `;
  return id;
}

export async function auditAdminAction(action: string, details: AuditDetails = {}) {
  const { entityType, entityId } = resolveAuditEntity(details);

  const event = {
    actor_type: "admin",
    actor_id: null as string | null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_state: null,
    after_state: JSON.stringify(details),
    reason: null,
    created_at: new Date().toISOString(),
  };

  console.info(JSON.stringify({ scope: "admin-audit", ...event }));

  try {
    await sql`
      insert into audit_log (id, actor_type, actor_id, action, entity_type, entity_id, before_state, after_state, reason)
      values (${randomUUID()}, ${event.actor_type}, ${event.actor_id}, ${event.action}, ${event.entity_type}, ${event.entity_id}, ${event.before_state}, ${event.after_state}, ${event.reason})
    `;
  } catch {
    // Keep admin flows resilient if audit persistence fails temporarily.
  }
}
