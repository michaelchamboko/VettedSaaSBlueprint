export function auditAdminAction(action: string, details: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ scope: "admin-audit", action, details, at: new Date().toISOString() }));
}
