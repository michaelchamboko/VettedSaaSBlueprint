import { Pool } from "pg";

const SCHEMA = "landing_control_v2";

function assertDatabaseUrl(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is missing.`);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} is invalid.`);
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error(`${name} must be a PostgreSQL URL.`);
  if (!parsed.hostname || !parsed.username) throw new Error(`${name} is incomplete.`);
  return value;
}

export function createNeonPool(databaseUrl: string | undefined, variableName: string): Pool {
  return new Pool({
    connectionString: assertDatabaseUrl(databaseUrl, variableName),
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: { rejectUnauthorized: true },
  });
}

export type ResearchJobStatus = {
  job_id: string;
  state: string;
  current_stage_id: string | null;
  exact_url: string;
  url_fingerprint: string;
  manifest_digest: string;
  source_commit_sha: string;
  updated_at: string;
};

export type ResearchDispatchResult = ResearchJobStatus & { created: boolean };

export class NeonResearchControl {
  constructor(private readonly pool: Pool) {}

  async reconcileAuthorizedUrls(manifestDigest: string, sourceCommitSha: string, exactUrls: string[]): Promise<number> {
    const result = await this.pool.query<{ reconcile_authorized_urls: number }>(
      `select ${SCHEMA}.reconcile_authorized_urls($1, $2, $3::jsonb)`,
      [manifestDigest, sourceCommitSha, JSON.stringify(exactUrls)],
    );
    return result.rows[0]?.reconcile_authorized_urls ?? 0;
  }

  async dispatch(exactUrl: string, manifestDigest: string, sourceCommitSha: string, inputDigest: string): Promise<ResearchDispatchResult> {
    const result = await this.pool.query<ResearchDispatchResult>(
      `select * from ${SCHEMA}.dispatch_research_prep($1, $2, $3, $4)`,
      [exactUrl, manifestDigest, sourceCommitSha, inputDigest],
    );
    if (!result.rows[0]) throw new Error("Neon dispatch returned no job.");
    return result.rows[0];
  }

  async status(exactUrl?: string): Promise<ResearchJobStatus[]> {
    const result = await this.pool.query<ResearchJobStatus>(
      `select id as job_id, state, current_stage_id, exact_url, url_fingerprint, manifest_digest, source_commit_sha, updated_at::text
       from ${SCHEMA}.jobs where pipeline_id = 'research_prep_v1' ${exactUrl ? "and exact_url = $1" : ""} order by updated_at desc`,
      exactUrl ? [exactUrl] : [],
    );
    return result.rows;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export type ClaimedResearchStage = {
  worker_id: string;
  job_id: string;
  stage_attempt_id: string;
  stage_id: "product_identity" | "research";
  exact_url: string;
  url_fingerprint: string;
  input_digest: string;
  lease_token: string;
  lease_epoch: string;
  lease_expires_at: string;
};

export class NeonResearchWorker {
  constructor(private readonly pool: Pool) {}

  async probe(): Promise<void> {
    await this.pool.query("select 1");
    const result = await this.pool.query<{ probe_worker: boolean }>(`select ${SCHEMA}.probe_worker()`);
    if (!result.rows[0]?.probe_worker) throw new Error("Neon landing_control_v2 worker authority is not installed.");
  }

  async claim(workerId: string): Promise<ClaimedResearchStage | null> {
    const result = await this.pool.query<ClaimedResearchStage>(`select * from ${SCHEMA}.claim_research_stage($1, 900)`, [workerId]);
    return result.rows[0] ? { ...result.rows[0], worker_id: workerId } : null;
  }

  async heartbeat(claim: ClaimedResearchStage): Promise<boolean> {
    const result = await this.pool.query<{ heartbeat_research_stage: boolean }>(
      `select ${SCHEMA}.heartbeat_research_stage($1, $2, $3::uuid, $4::bigint, 900)`,
      [claim.stage_attempt_id, claim.worker_id, claim.lease_token, claim.lease_epoch],
    );
    return result.rows[0]?.heartbeat_research_stage ?? false;
  }

  async persistArtifact(claim: ClaimedResearchStage & { worker_id: string }, schemaVersion: string, payload: unknown, payloadSha256: string): Promise<string> {
    const result = await this.pool.query<{ persist_research_artifact: string }>(
      `select ${SCHEMA}.persist_research_artifact($1, $2, $3::uuid, $4::bigint, $5, $6::jsonb, $7)`,
      [claim.stage_attempt_id, claim.worker_id, claim.lease_token, claim.lease_epoch, schemaVersion, JSON.stringify(payload), payloadSha256],
    );
    if (!result.rows[0]) throw new Error("Neon artifact persistence returned no ID.");
    return result.rows[0].persist_research_artifact;
  }

  async complete(claim: ClaimedResearchStage & { worker_id: string }): Promise<string> {
    const result = await this.pool.query<{ complete_research_stage: string }>(
      `select ${SCHEMA}.complete_research_stage($1, $2, $3::uuid, $4::bigint)`,
      [claim.stage_attempt_id, claim.worker_id, claim.lease_token, claim.lease_epoch],
    );
    if (!result.rows[0]) throw new Error("Neon completion returned no state.");
    return result.rows[0].complete_research_stage;
  }

  async fail(claim: ClaimedResearchStage & { worker_id: string }, retryable: boolean): Promise<boolean> {
    const result = await this.pool.query<{ fail_research_stage: boolean }>(
      `select ${SCHEMA}.fail_research_stage($1, $2, $3::uuid, $4::bigint, $5)`,
      [claim.stage_attempt_id, claim.worker_id, claim.lease_token, claim.lease_epoch, retryable],
    );
    return result.rows[0]?.fail_research_stage ?? false;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
