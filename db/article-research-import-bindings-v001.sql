begin;

create table if not exists article_research.import_evidence_bindings (
  id uuid primary key default gen_random_uuid(),
  import_id text not null check (import_id ~ '^article-[0-9a-f-]{36}$'),
  idempotency_key text not null check (idempotency_key ~ '^[a-f0-9]{64}$'),
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  plan_fingerprint text not null check (plan_fingerprint ~ '^[a-f0-9]{64}$'),
  decision_path text not null,
  decision_sha256 text not null check (decision_sha256 ~ '^[a-f0-9]{64}$'),
  writeback_path text,
  writeback_sha256 text check (writeback_sha256 is null or writeback_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_path text not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default current_timestamp,
  unique (import_id, idempotency_key)
);

create table if not exists article_research.import_evidence_links (
  binding_id uuid not null references article_research.import_evidence_bindings(id) on delete restrict,
  claim_id uuid not null,
  snapshot_id uuid not null,
  local_claim_id text not null,
  local_source_id text not null,
  action text not null check (action in ('reused_current', 'researched_gap')),
  created_at timestamptz not null default current_timestamp,
  primary key (binding_id, claim_id, snapshot_id, local_claim_id, local_source_id),
  foreign key (claim_id, snapshot_id) references article_research.claim_evidence(claim_id, snapshot_id) on delete restrict
);

commit;
