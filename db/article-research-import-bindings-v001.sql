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

do $migration$
declare
  constraint_name text;
begin
  if to_regclass('article_research.import_evidence_links') is not null then
    alter table article_research.import_evidence_links add column if not exists product_context text;
    update article_research.import_evidence_links link
       set product_context = evidence.product_context
      from article_research.claim_evidence evidence
     where link.product_context is null
       and evidence.claim_id = link.claim_id
       and evidence.snapshot_id = link.snapshot_id;
    if exists (select 1 from article_research.import_evidence_links where product_context is null) then
      raise exception 'RESEARCH_REGISTRY_LINK_CONTEXT_BACKFILL_FAILED';
    end if;
    alter table article_research.import_evidence_links alter column product_context set not null;

    for constraint_name in
      select constraint_row.conname
        from pg_constraint constraint_row
       where constraint_row.conrelid = 'article_research.import_evidence_links'::regclass
         and constraint_row.contype = 'f'
         and constraint_row.confrelid = 'article_research.claim_evidence'::regclass
    loop
      execute format('alter table article_research.import_evidence_links drop constraint %I', constraint_name);
    end loop;

    if not exists (
      select 1
        from pg_constraint constraint_row
        join lateral unnest(constraint_row.conkey) key(attnum) on true
        join pg_attribute attribute_row on attribute_row.attrelid = constraint_row.conrelid and attribute_row.attnum = key.attnum
       where constraint_row.conrelid = 'article_research.import_evidence_links'::regclass
         and constraint_row.contype = 'p'
       group by constraint_row.oid
      having count(*) = 6 and bool_or(attribute_row.attname = 'product_context')
    ) then
      select constraint_row.conname into constraint_name
        from pg_constraint constraint_row
       where constraint_row.conrelid = 'article_research.import_evidence_links'::regclass and constraint_row.contype = 'p';
      if constraint_name is not null then
        execute format('alter table article_research.import_evidence_links drop constraint %I', constraint_name);
      end if;
    end if;
  end if;

  if not exists (
    select 1
      from pg_constraint constraint_row
      join lateral unnest(constraint_row.conkey) key(attnum) on true
      join pg_attribute attribute_row on attribute_row.attrelid = constraint_row.conrelid and attribute_row.attnum = key.attnum
     where constraint_row.conrelid = 'article_research.claim_evidence'::regclass
       and constraint_row.contype = 'p'
     group by constraint_row.oid
    having count(*) = 3 and bool_or(attribute_row.attname = 'product_context')
  ) then
    select constraint_row.conname into constraint_name
      from pg_constraint constraint_row
     where constraint_row.conrelid = 'article_research.claim_evidence'::regclass and constraint_row.contype = 'p';
    if constraint_name is not null then
      execute format('alter table article_research.claim_evidence drop constraint %I', constraint_name);
    end if;
    alter table article_research.claim_evidence
      add constraint claim_evidence_pkey primary key (claim_id, snapshot_id, product_context);
  end if;
end
$migration$;

create table if not exists article_research.import_evidence_links (
  binding_id uuid not null references article_research.import_evidence_bindings(id) on delete restrict,
  claim_id uuid not null,
  snapshot_id uuid not null,
  product_context text not null,
  local_claim_id text not null,
  local_source_id text not null,
  action text not null check (action in ('reused_current', 'researched_gap')),
  created_at timestamptz not null default current_timestamp,
  primary key (binding_id, claim_id, snapshot_id, product_context, local_claim_id, local_source_id),
  foreign key (claim_id, snapshot_id, product_context)
    references article_research.claim_evidence(claim_id, snapshot_id, product_context) on delete restrict
);

do $migration$
begin
  if not exists (
    select 1
      from pg_constraint constraint_row
      join lateral unnest(constraint_row.conkey) key(attnum) on true
      join pg_attribute attribute_row on attribute_row.attrelid = constraint_row.conrelid and attribute_row.attnum = key.attnum
     where constraint_row.conrelid = 'article_research.import_evidence_links'::regclass
       and constraint_row.contype = 'p'
     group by constraint_row.oid
    having count(*) = 6 and bool_or(attribute_row.attname = 'product_context')
  ) then
    alter table article_research.import_evidence_links
      add constraint import_evidence_links_pkey primary key
      (binding_id, claim_id, snapshot_id, product_context, local_claim_id, local_source_id);
  end if;

  if not exists (
    select 1 from pg_constraint constraint_row
     where constraint_row.conrelid = 'article_research.import_evidence_links'::regclass
       and constraint_row.contype = 'f'
       and constraint_row.confrelid = 'article_research.claim_evidence'::regclass
       and array_length(constraint_row.conkey, 1) = 3
  ) then
    alter table article_research.import_evidence_links
      add constraint import_evidence_links_claim_snapshot_context_fkey
      foreign key (claim_id, snapshot_id, product_context)
      references article_research.claim_evidence(claim_id, snapshot_id, product_context) on delete restrict;
  end if;
end
$migration$;

commit;
