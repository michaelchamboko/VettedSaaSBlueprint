import { executeQuery, withTransaction, type TransactionRunner, type TransactionSql } from "../db";
import {
  canonicalResearchUrl,
  createResearchRegistryPlan,
  researchRegistryCandidateSchema,
  researchRegistryLegacyLeadSchema,
  type ArticleResearchRegistry,
  type ResearchRegistryCandidate,
  type ResearchRegistryCommitInput,
  type ResearchRegistryCommitResult,
} from "./research-registry";
import { sha256 } from "./execution-evidence";

type Query = (sql: string, binds?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

function text(value: unknown): string { return value instanceof Date ? value.toISOString() : String(value); }
function nullableText(value: unknown): string | null { return value === null || value === undefined ? null : text(value); }

function candidate(row: Record<string, unknown>): ResearchRegistryCandidate {
  return researchRegistryCandidateSchema.parse({
    claimId: row.claim_id,
    claimSha256: row.claim_sha256,
    claimText: row.claim_text,
    claimKind: row.claim_kind,
    material: row.material,
    claimUpdatedAt: text(row.claim_updated_at),
    snapshotId: row.snapshot_id,
    sourceId: row.source_id,
    canonicalUrl: row.canonical_url,
    sourceType: row.source_type,
    evidenceSha256: row.evidence_sha256,
    retrievedAt: text(row.retrieved_at),
    accessOutcome: row.access_outcome,
    passage: nullableText(row.passage),
    locator: nullableText(row.locator),
    verdict: row.verdict,
    confidence: Number(row.confidence),
    productContext: row.product_context,
    reasoning: row.reasoning,
    expiresAt: text(row.expires_at),
    evidenceUpdatedAt: text(row.evidence_updated_at),
  });
}

function legacyLead(row: Record<string, unknown>) {
  return researchRegistryLegacyLeadSchema.parse({
    sourceId: row.source_id,
    productId: row.product_id,
    sourceUrl: row.source_url,
    sourceType: row.source_type,
    sourceHash: row.source_hash,
    retrievedAt: row.retrieved_at ? text(row.retrieved_at) : null,
    usageAllowed: row.usage_allowed,
    claimId: row.claim_id,
    claimText: row.claim_text,
    claimUpdatedAt: row.claim_updated_at ? text(row.claim_updated_at) : null,
  });
}

async function selectId(tx: TransactionSql, kind: "source" | "snapshot" | "claim", values: Record<string, unknown>): Promise<string> {
  if (kind === "source") {
    await tx`insert into article_research.sources (canonical_url, source_type, last_checked_at)
      values (${values.canonicalUrl}, ${values.sourceType}, ${values.retrievedAt}::timestamptz)
      on conflict (canonical_url) do nothing`;
    const result = await tx`select id from article_research.sources where canonical_url = ${values.canonicalUrl}`;
    if (!result.rows[0]?.id) throw new Error("CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_SOURCE_WRITE_FAILED");
    return String(result.rows[0].id);
  }
  if (kind === "snapshot") {
    await tx`insert into article_research.source_snapshots
      (source_id, evidence_sha256, retrieved_at, access_outcome, passage, locator)
      values (${values.sourceId}::uuid, ${values.evidenceSha256}, ${values.retrievedAt}::timestamptz, ${values.accessOutcome}, ${values.passage}, ${values.locator})
      on conflict (source_id, evidence_sha256) do nothing`;
    const result = await tx`select id from article_research.source_snapshots
      where source_id = ${values.sourceId}::uuid and evidence_sha256 = ${values.evidenceSha256}`;
    if (!result.rows[0]?.id) throw new Error("CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_SNAPSHOT_WRITE_FAILED");
    return String(result.rows[0].id);
  }
  await tx`insert into article_research.claims (claim_sha256, claim_text, claim_kind, material)
    values (${values.claimSha256}, ${values.claimText}, ${values.claimKind}, ${values.material})
    on conflict (claim_sha256) do nothing`;
  const result = await tx`select id from article_research.claims where claim_sha256 = ${values.claimSha256}`;
  if (!result.rows[0]?.id) throw new Error("CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_CLAIM_WRITE_FAILED");
  return String(result.rows[0].id);
}

async function verifyReusedCandidates(tx: TransactionSql, input: ResearchRegistryCommitInput): Promise<void> {
  for (const decision of input.decision.claims) for (const match of decision.registryMatches) {
    const planned = input.plan.candidates.find((candidate) => candidate.claimId === match.claimId && candidate.snapshotId === match.snapshotId && candidate.productContext === match.productContext);
    if (!planned) throw new Error("RESEARCH_REGISTRY_PLAN_STALE");
    const conflicts = await tx`
      select ce2.claim_id
      from article_research.claim_evidence ce2
      join article_research.source_snapshots ss2 on ss2.id = ce2.snapshot_id
      where ce2.claim_id = ${planned.claimId}::uuid
        and ce2.product_context = ${planned.productContext}
        and ce2.expires_at > current_timestamp
        and (ce2.verdict in ('PARTIALLY_SUPPORTED', 'CONTRADICTED', 'UNVERIFIED')
          or ss2.access_outcome in ('partial', 'inaccessible', 'conflicting'))
      for update of ce2, ss2`;
    if (conflicts.rows.length > 0) throw new Error("RESEARCH_REGISTRY_PLAN_STALE");
    const result = await tx`
      select c.updated_at as claim_updated_at, ss.evidence_sha256,
             ce.verdict, ce.expires_at, ce.updated_at as evidence_updated_at
      from article_research.claim_evidence ce
      join article_research.claims c on c.id = ce.claim_id
      join article_research.source_snapshots ss on ss.id = ce.snapshot_id
      where c.id = ${planned.claimId}::uuid and ss.id = ${planned.snapshotId}::uuid
        and ce.product_context = ${planned.productContext} and ce.expires_at > current_timestamp
      for update of c, ce, ss`;
    const current = result.rows[0];
    if (!current || current.evidence_sha256 !== planned.evidenceSha256 || current.verdict !== planned.verdict ||
        Date.parse(text(current.claim_updated_at)) !== Date.parse(planned.claimUpdatedAt) || Date.parse(text(current.evidence_updated_at)) !== Date.parse(planned.evidenceUpdatedAt) ||
        Date.parse(text(current.expires_at)) !== Date.parse(planned.expiresAt)) {
      throw new Error("RESEARCH_REGISTRY_PLAN_STALE");
    }
  }
}

type EvidenceLink = { localClaimId: string; localSourceId: string; claimId: string; snapshotId: string; action: "reused_current" | "researched_gap" };

async function writeEvidence(tx: TransactionSql, input: ResearchRegistryCommitInput): Promise<EvidenceLink[]> {
  const snapshotIds = new Map<string, string>();
  const researchedClaims = input.decision.claims.filter((claim) => claim.action === "researched_gap");
  const researchedSourceIds = new Set(input.research.evidence.claims.filter((claim) => researchedClaims.some((decision) => decision.claimId === claim.id)).flatMap((claim) => claim.sourceIds));
  const sourceLocks = input.research.evidence.sources.filter((source) => researchedSourceIds.has(source.id)).map((source) => `source:${canonicalResearchUrl(source.url)}`).sort();
  for (const identity of sourceLocks) await tx`select pg_advisory_xact_lock(hashtextextended(${identity}, 0))`;
  for (const source of input.research.evidence.sources.filter((source) => researchedSourceIds.has(source.id))) {
    const metadata = input.writeback?.sources.find((item) => item.sourceId === source.id);
    const bytes = input.research.snapshotBytes.get(source.id);
    if (!metadata || !bytes) throw new Error("RESEARCH_REGISTRY_SOURCE_DECISION_MISSING");
    const sourceId = await selectId(tx, "source", {
      canonicalUrl: canonicalResearchUrl(source.url), sourceType: metadata.sourceType, retrievedAt: source.retrievedAt,
    });
    const snapshotId = await selectId(tx, "snapshot", {
      sourceId, evidenceSha256: sha256(bytes), retrievedAt: source.retrievedAt,
      accessOutcome: metadata.accessOutcome, passage: bytes.toString("utf8"), locator: metadata.locator ?? input.research.evidencePath,
    });
    snapshotIds.set(source.id, snapshotId);
  }
  const links: EvidenceLink[] = [];
  for (const claim of input.research.evidence.claims) {
    const final = input.writeback?.claims.find((item) => item.evidenceClaimId === claim.id);
    const decision = input.decision.claims.find((item) => item.claimId === (final?.plannedClaimId ?? claim.id));
    if (!decision) throw new Error("RESEARCH_REGISTRY_CLAIM_DECISION_MISSING");
    if (decision.action === "reused_current") {
      for (const match of decision.registryMatches) {
        const planned = input.plan.candidates.find((candidate) => candidate.claimId === match.claimId && candidate.snapshotId === match.snapshotId && candidate.productContext === match.productContext);
        const localSourceId = claim.sourceIds.find((sourceId) => {
          const local = input.research.evidence.sources.find((source) => source.id === sourceId);
          const bytes = input.research.snapshotBytes.get(sourceId);
          return planned && local && bytes && canonicalResearchUrl(local.url) === canonicalResearchUrl(planned.canonicalUrl) && sha256(bytes) === planned.evidenceSha256;
        });
        if (!planned || !localSourceId) throw new Error("RESEARCH_REGISTRY_REUSE_SOURCE_UNBOUND");
        links.push({ localClaimId: claim.id, localSourceId, claimId: match.claimId, snapshotId: match.snapshotId, action: decision.action });
      }
      continue;
    }
    if (!final || !input.writeback) throw new Error("RESEARCH_REGISTRY_WRITEBACK_REQUIRED");
    const claimId = await selectId(tx, "claim", {
      claimSha256: sha256(claim.text), claimText: claim.text, claimKind: final.claimKind, material: decision.material,
    });
    for (const localSourceId of claim.sourceIds) {
      const snapshotId = snapshotIds.get(localSourceId);
      if (!snapshotId) throw new Error("RESEARCH_REGISTRY_SOURCE_DECISION_MISSING");
      await tx`
        insert into article_research.claim_evidence
          (claim_id, snapshot_id, verdict, confidence, product_context, reasoning, expires_at, created_at, updated_at)
        values (${claimId}::uuid, ${snapshotId}::uuid, ${final.verdict}, ${final.confidence}, ${decision.productContext}, ${final.reasoning}, ${final.expiresAt}::timestamptz, ${input.writeback.createdAt}::timestamptz, ${input.writeback.createdAt}::timestamptz)
        on conflict (claim_id, snapshot_id) do update set
          verdict = excluded.verdict,
          confidence = excluded.confidence,
          reasoning = excluded.reasoning,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
        where article_research.claim_evidence.product_context = excluded.product_context
          and article_research.claim_evidence.updated_at < excluded.updated_at`;
      const stored = await tx`select verdict, confidence, product_context, reasoning, expires_at, updated_at
        from article_research.claim_evidence where claim_id = ${claimId}::uuid and snapshot_id = ${snapshotId}::uuid`;
      const actual = stored.rows[0];
      if (!actual || actual.product_context !== decision.productContext || actual.verdict !== final.verdict || Number(actual.confidence) !== final.confidence ||
          actual.reasoning !== final.reasoning || Date.parse(text(actual.expires_at)) !== Date.parse(final.expiresAt)) {
        throw new Error("CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_CONCURRENT_EVIDENCE_CHANGED");
      }
      links.push({ localClaimId: claim.id, localSourceId, claimId, snapshotId, action: decision.action });
    }
  }
  return links;
}

export function researchSearchExpressions(sourceText: string): string[] {
  const words = [...new Set(sourceText.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
  if (words.length === 0) return ["__no_registry_match__"];
  const batches: string[] = [];
  for (let index = 0; index < words.length; index += 64) batches.push(words.slice(index, index + 64).join(" OR "));
  return batches;
}

export class NeonArticleResearchRegistry implements ArticleResearchRegistry {
  constructor(
    private readonly query: Query = executeQuery,
    private readonly transaction: TransactionRunner = withTransaction,
  ) {}

  async prepare(input: { importId: string; sourceFingerprint: string; sourceText: string; now: string }) {
    try {
      const databaseClock = await this.query("select current_timestamp as database_now");
      if (!databaseClock.rows[0]?.database_now) throw new Error("Database clock returned no value.");
      const currentRows = new Map<string, Record<string, unknown>>();
      const legacyRows = new Map<string, Record<string, unknown>>();
      for (const search of researchSearchExpressions(input.sourceText)) {
        const current = await this.query(`
        select c.id as claim_id, c.claim_sha256, c.claim_text, c.claim_kind, c.material,
               c.updated_at as claim_updated_at, ss.id as snapshot_id, s.id as source_id,
               s.canonical_url, s.source_type, ss.evidence_sha256, ss.retrieved_at,
               ss.access_outcome, ss.passage, ss.locator, ce.verdict, ce.confidence,
               ce.product_context, ce.reasoning, ce.expires_at, ce.updated_at as evidence_updated_at
        from article_research.claims c
        join article_research.claim_evidence ce on ce.claim_id = c.id
        join article_research.source_snapshots ss on ss.id = ce.snapshot_id
        join article_research.sources s on s.id = ss.source_id
        where c.search_document @@ websearch_to_tsquery('english', $1)
        order by c.material desc, ce.confidence desc, ce.updated_at desc`, [search]);
        for (const row of current.rows) currentRows.set(`${row.claim_id}:${row.snapshot_id}:${row.product_context}`, row);
        const legacy = await this.query(`
        select rs.id as source_id, rs.product_id, rs.source_url, rs.source_type,
               rs.source_hash, rs.retrieved_at, rs.usage_allowed,
               ec.id as claim_id, ec.claim_text, ec.updated_at as claim_updated_at
        from public.research_sources rs
        left join public.evidence_claims ec on ec.source_id = rs.id and ec.usage_allowed is true
        where to_tsvector('english', coalesce(ec.claim_text, '') || ' ' || coalesce(rs.summary, ''))
              @@ websearch_to_tsquery('english', $1)
          and rs.usage_allowed is true
        order by ec.updated_at desc nulls last, rs.retrieved_at desc nulls last`, [search]);
        for (const row of legacy.rows) legacyRows.set(`${row.source_id}:${row.claim_id ?? ""}`, row);
      }
      return createResearchRegistryPlan({
        importId: input.importId, sourceFingerprint: input.sourceFingerprint, generatedAt: text(databaseClock.rows[0].database_now),
        candidates: [...currentRows.values()].map(candidate), legacyLeads: [...legacyRows.values()].map(legacyLead),
      });
    } catch (error) {
      throw new Error(`CAPABILITY_UNAVAILABLE: article research registry read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async commit(input: ResearchRegistryCommitInput): Promise<ResearchRegistryCommitResult> {
    try {
      return await this.transaction(async (tx) => {
        await tx`set transaction isolation level serializable`;
        await tx`select pg_advisory_xact_lock(hashtextextended(${input.importId}, 0))`;
        const plannedClaimHashes = input.decision.claims.map((claim) => sha256(claim.claimText));
        const finalClaimHashes = input.research.evidence.claims.map((claim) => sha256(claim.text));
        for (const claimHash of [...new Set([...plannedClaimHashes, ...finalClaimHashes])].sort()) await tx`select pg_advisory_xact_lock(hashtextextended(${`claim:${claimHash}`}, 0))`;
        const replay = await tx`
          select id, source_fingerprint, plan_fingerprint, decision_sha256, writeback_path, writeback_sha256, evidence_path, evidence_sha256
          from article_research.import_evidence_bindings
          where import_id = ${input.importId} and idempotency_key = ${input.idempotencyKey}`;
        if (replay.rows[0]) {
          const row = replay.rows[0];
          if (row.source_fingerprint !== input.sourceFingerprint || row.plan_fingerprint !== input.plan.planFingerprint ||
              row.decision_sha256 !== input.decisionSha256 || row.evidence_path !== input.research.evidencePath ||
              row.evidence_sha256 !== input.research.evidenceSha256 || row.writeback_path !== (input.writebackPath ?? null) ||
              row.writeback_sha256 !== (input.writebackSha256 ?? null)) throw new Error("RESEARCH_REGISTRY_REPLAY_MISMATCH");
          return { bindingId: String(row.id), replayed: true };
        }
        const inserted = await tx`
          insert into article_research.import_evidence_bindings
            (import_id, idempotency_key, source_fingerprint, plan_fingerprint, decision_path, decision_sha256, writeback_path, writeback_sha256, evidence_path, evidence_sha256)
          values (${input.importId}, ${input.idempotencyKey}, ${input.sourceFingerprint}, ${input.plan.planFingerprint}, ${input.decisionPath}, ${input.decisionSha256}, ${input.writebackPath ?? null}, ${input.writebackSha256 ?? null}, ${input.research.evidencePath}, ${input.research.evidenceSha256})
          returning id`;
        if (!inserted.rows[0]?.id) throw new Error("RESEARCH_REGISTRY_BINDING_WRITE_FAILED");
        const bindingId = String(inserted.rows[0].id);
        await verifyReusedCandidates(tx, input);
        const links = await writeEvidence(tx, input);
        for (const link of links) await tx`
          insert into article_research.import_evidence_links
            (binding_id, claim_id, snapshot_id, local_claim_id, local_source_id, action)
          values (${bindingId}::uuid, ${link.claimId}::uuid, ${link.snapshotId}::uuid, ${link.localClaimId}, ${link.localSourceId}, ${link.action})
          on conflict (binding_id, claim_id, snapshot_id, local_claim_id, local_source_id) do nothing`;
        return { bindingId, replayed: false };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("CAPABILITY_UNAVAILABLE:") || message === "RESEARCH_REGISTRY_PLAN_STALE") throw error;
      throw new Error(`CAPABILITY_UNAVAILABLE: article research registry write failed: ${message}`);
    }
  }
}
