type HermesJob = { id: string; job_type: string; input_payload: Record<string, unknown> };
type HermesBudget = { spent: number; limit: number };

const apiBase = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const token = process.env.HERMES_API_TOKEN;

async function hermesFetch(path: string, init: RequestInit = {}) {
  if (!token) throw new Error("HERMES_API_TOKEN is required");
  return fetch(`${apiBase}${path}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "x-hermes-worker": "oracle-hermes-1", ...(init.headers ?? {}) } });
}

async function claimJob(): Promise<HermesJob | null> {
  const response = await hermesFetch("/api/hermes/jobs/claim", { method: "POST" });
  if (!response.ok) throw new Error(`Claim failed: ${response.status}`);
  const data = await response.json();
  return data.job;
}

async function completeJob(job: HermesJob, output_payload: Record<string, unknown>) {
  await hermesFetch(`/api/hermes/jobs/${job.id}/complete`, { method: "POST", body: JSON.stringify({ output_payload }) });
}

async function failJob(job: HermesJob, error: unknown) {
  await hermesFetch(`/api/hermes/jobs/${job.id}/fail`, { method: "POST", body: JSON.stringify({ error_message: error instanceof Error ? error.message : String(error) }) });
}

function getBudgetFromPayload(job: HermesJob): HermesBudget {
  const payload = job.input_payload as Partial<HermesBudget>;
  return { spent: Number(payload.spent ?? 0), limit: Number(payload.limit ?? 0) };
}

async function runJob(job: HermesJob) {
  const budget = getBudgetFromPayload(job);
  switch (job.job_type) {
    case "RESEARCH_REFRESH_CYCLE":
      if (budget.limit > 0 && budget.spent >= budget.limit) return { action: "budget_paused", spent: budget.spent, limit: budget.limit };
      return { action: "queued_scrapling_plan", note: "Scrapling integration boundary prepared; implement Oracle-side crawlers here.", budget };
    case "AFFILIATE_LINK_CHECK":
      if (budget.limit > 0 && budget.spent >= budget.limit) return { action: "budget_paused", spent: budget.spent, limit: budget.limit };
      return { action: "link_check_placeholder", note: "Validate redirects without self-referral signup or purchase." };
    case "QUALITY_COMPLIANCE_SCORE":
      if (budget.limit > 0 && budget.spent >= budget.limit) return { action: "budget_paused", spent: budget.spent, limit: budget.limit };
      return { action: "compliance_score_placeholder", note: "Use structured page JSON plus evidence ledger before publication." };
    default:
      return { action: "manual_worker_placeholder", job_type: job.job_type };
  }
}

async function main() {
  console.log("Hermes worker started");
  while (true) {
    const job = await claimJob();
    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, 30_000));
      continue;
    }
    try {
      const output = await runJob(job);
      await completeJob(job, output);
    } catch (error) {
      await failJob(job, error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
