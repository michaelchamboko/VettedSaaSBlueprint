create schema if not exists article_research;

create table if not exists public.research_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid,
  source_url text not null,
  source_type text not null,
  source_hash text,
  retrieved_at timestamptz,
  usage_allowed boolean not null default true,
  summary text
);

create table if not exists public.evidence_claims (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.research_sources(id),
  claim_text text,
  usage_allowed boolean not null default true,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists article_research.sources (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  source_type text not null,
  last_checked_at timestamptz,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists article_research.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references article_research.sources(id),
  evidence_sha256 text not null,
  retrieved_at timestamptz not null,
  access_outcome text not null,
  passage text,
  locator text,
  unique (source_id, evidence_sha256)
);

create table if not exists article_research.claims (
  id uuid primary key default gen_random_uuid(),
  claim_sha256 text not null unique,
  claim_text text not null,
  claim_kind text not null,
  material boolean not null,
  search_document tsvector generated always as (to_tsvector('english', claim_text)) stored,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);

create table if not exists article_research.claim_evidence (
  claim_id uuid not null references article_research.claims(id),
  snapshot_id uuid not null references article_research.source_snapshots(id),
  verdict text not null,
  confidence numeric not null,
  product_context text not null,
  reasoning text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  primary key (claim_id, snapshot_id, product_context)
);
