-- Git-owned Neon landing authority V001.
-- Apply with: psql -X -v ON_ERROR_STOP=1 -f db/neon-landing-control-v001.sql
-- This intentionally lives beside the unowned public P001 schema. The old
-- schema remains disabled; all new research jobs use landing_control_v2.
-- The recorded digest is computed after replacing its own value with SELF_HASH.

begin;

create extension if not exists pgcrypto;
create schema if not exists landing_control_v2;

create table if not exists landing_control_v2.schema_migrations (
  migration_id text primary key,
  applied_at timestamptz not null default now(),
  migration_sha256 text not null
);

create table if not exists landing_control_v2.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists landing_control_v2.pipeline_versions (
  id text primary key,
  definition_hash text not null,
  status text not null check (status in ('disabled', 'approved')),
  stage_ids text[] not null,
  created_at timestamptz not null default now()
);

create table if not exists landing_control_v2.stages (
  id text primary key,
  executor_id text not null,
  next_stage_id text,
  terminal_state text,
  required_artifact_schemas text[] not null default '{}'
);

create table if not exists landing_control_v2.gates (
  id text primary key,
  stage_id text not null references landing_control_v2.stages(id),
  required boolean not null default true
);

create table if not exists landing_control_v2.authorized_urls (
  exact_url text primary key,
  url_fingerprint text not null unique check (url_fingerprint ~ '^[a-f0-9]{64}$'),
  manifest_digest text not null check (manifest_digest ~ '^[a-f0-9]{64}$'),
  source_commit_sha text not null check (source_commit_sha ~ '^[a-f0-9]{40}$'),
  active boolean not null default true,
  reconciled_at timestamptz not null default now(),
  check (left(exact_url, 8) = 'https://')
);

create table if not exists landing_control_v2.jobs (
  id uuid primary key default gen_random_uuid(),
  pipeline_id text not null references landing_control_v2.pipeline_versions(id),
  exact_url text not null,
  url_fingerprint text not null,
  manifest_digest text not null,
  source_commit_sha text not null,
  input_digest text not null,
  state text not null check (state in ('URL_VALIDATED', 'RUNNING', 'RESEARCH_COMPLETE', 'FAILED')),
  current_stage_id text references landing_control_v2.stages(id),
  stop_after_stage text not null default 'research',
  lease_epoch bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pipeline_id, url_fingerprint, input_digest)
);

create index if not exists landing_control_v2_jobs_claim_idx
  on landing_control_v2.jobs (state, current_stage_id, updated_at);

create table if not exists landing_control_v2.stage_attempts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references landing_control_v2.jobs(id),
  stage_id text not null references landing_control_v2.stages(id),
  attempt_number integer not null,
  worker_id text not null,
  lease_token uuid not null,
  lease_epoch bigint not null,
  lease_expires_at timestamptz not null,
  status text not null check (status in ('running', 'completed', 'failed', 'expired')),
  input_digest text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (job_id, stage_id, attempt_number),
  unique (job_id, stage_id, lease_token)
);

create unique index if not exists landing_control_v2_live_lease_idx
  on landing_control_v2.stage_attempts(job_id, stage_id)
  where status = 'running';

create table if not exists landing_control_v2.artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references landing_control_v2.jobs(id),
  stage_attempt_id uuid not null references landing_control_v2.stage_attempts(id),
  stage_id text not null references landing_control_v2.stages(id),
  schema_version text not null,
  payload jsonb not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (stage_attempt_id, schema_version)
);

create table if not exists landing_control_v2.events (
  id bigint generated always as identity primary key,
  job_id uuid not null references landing_control_v2.jobs(id),
  stage_attempt_id uuid references landing_control_v2.stage_attempts(id),
  event_type text not null,
  event_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists landing_control_v2.outbox (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  topic text not null,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

insert into landing_control_v2.settings(key, value)
values
  ('global_kill_switch', 'true'::jsonb),
  ('snapshot_raw_ttl_days', '30'::jsonb)
on conflict (key) do nothing;

insert into landing_control_v2.stages(id, executor_id, next_stage_id, terminal_state, required_artifact_schemas)
values
  ('url_validation', 'software', 'product_identity', null, '{}'),
  ('product_identity', 'hermes_product_identity', 'research', null, '{HermesProductIdentityV1}'),
  ('research', 'hermes_research', null, 'RESEARCH_COMPLETE', '{HermesResearchEvidenceV1,ResearchSourceSnapshotBundleV1}')
on conflict (id) do update set
  executor_id = excluded.executor_id,
  next_stage_id = excluded.next_stage_id,
  terminal_state = excluded.terminal_state,
  required_artifact_schemas = excluded.required_artifact_schemas;

insert into landing_control_v2.pipeline_versions(id, definition_hash, status, stage_ids)
values
  ('central_orchestrator_v2', 'a1e7b10000000000000000000000000000000000000000000000000000000000', 'disabled', '{url_validation,product_identity,research}'),
  ('research_prep_v1', 'b2e8c20000000000000000000000000000000000000000000000000000000000', 'disabled', '{url_validation,product_identity,research}')
on conflict (id) do nothing;

insert into landing_control_v2.gates(id, stage_id, required)
values
  ('product_identity_contract_v1', 'product_identity', true),
  ('research_evidence_contract_v1', 'research', true),
  ('research_snapshot_bundle_v1', 'research', true)
on conflict (id) do nothing;

create or replace function landing_control_v2.reconcile_authorized_urls(
  p_manifest_digest text,
  p_source_commit_sha text,
  p_urls jsonb
) returns integer
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
declare
  item text;
  count_added integer := 0;
begin
  if jsonb_typeof(p_urls) <> 'array' then
    raise exception 'authorized URL manifest must be an array';
  end if;
  update authorized_urls set active = false, reconciled_at = now();
  for item in select jsonb_array_elements_text(p_urls) loop
    if left(item, 8) <> 'https://' then raise exception 'authorized URL must use HTTPS'; end if;
    insert into authorized_urls(exact_url, url_fingerprint, manifest_digest, source_commit_sha, active, reconciled_at)
    values (item, encode(digest(item, 'sha256'), 'hex'), p_manifest_digest, p_source_commit_sha, true, now())
    on conflict (exact_url) do update set
      url_fingerprint = excluded.url_fingerprint,
      manifest_digest = excluded.manifest_digest,
      source_commit_sha = excluded.source_commit_sha,
      active = true,
      reconciled_at = now();
    count_added := count_added + 1;
  end loop;
  return count_added;
end;
$$;

create or replace function landing_control_v2.dispatch_research_prep(
  p_exact_url text,
  p_manifest_digest text,
  p_source_commit_sha text,
  p_input_digest text
) returns table(job_id uuid, state text, current_stage_id text, created boolean)
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
declare
  url_row authorized_urls%rowtype;
  existing jobs%rowtype;
  inserted jobs%rowtype;
begin
  select * into url_row from authorized_urls where exact_url = p_exact_url and active;
  if not found then raise exception 'URL is not in the durable approved manifest'; end if;
  if url_row.manifest_digest <> p_manifest_digest or url_row.source_commit_sha <> p_source_commit_sha then
    raise exception 'URL manifest provenance does not match the durable authorization';
  end if;
  select * into existing from jobs
    where pipeline_id = 'research_prep_v1' and url_fingerprint = url_row.url_fingerprint and input_digest = p_input_digest;
  if found then
    return query select existing.id, existing.state, existing.current_stage_id, false;
    return;
  end if;
  insert into jobs(pipeline_id, exact_url, url_fingerprint, manifest_digest, source_commit_sha, input_digest, state, current_stage_id)
  values ('research_prep_v1', p_exact_url, url_row.url_fingerprint, p_manifest_digest, p_source_commit_sha, p_input_digest, 'URL_VALIDATED', 'product_identity')
  returning * into inserted;
  insert into events(job_id, event_type, event_payload)
  values (inserted.id, 'URL_VALIDATED', jsonb_build_object('manifest_digest', p_manifest_digest, 'source_commit_sha', p_source_commit_sha));
  return query select inserted.id, inserted.state, inserted.current_stage_id, true;
end;
$$;

create or replace function landing_control_v2.claim_research_stage(
  p_worker_id text,
  p_lease_seconds integer default 900
) returns table(job_id uuid, stage_attempt_id uuid, stage_id text, exact_url text, url_fingerprint text, input_digest text, lease_token uuid, lease_epoch bigint, lease_expires_at timestamptz)
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
declare
  selected jobs%rowtype;
  next_attempt integer;
  new_attempt stage_attempts%rowtype;
begin
  if coalesce((select value::boolean from settings where key = 'global_kill_switch'), true) then return; end if;
  select j.* into selected
  from jobs j join pipeline_versions p on p.id = j.pipeline_id
  where p.id = 'research_prep_v1' and p.status = 'approved'
    and j.state in ('URL_VALIDATED', 'RUNNING')
    and j.current_stage_id in ('product_identity', 'research')
    and not exists (select 1 from stage_attempts a where a.job_id = j.id and a.stage_id = j.current_stage_id and a.status = 'running' and a.lease_expires_at > now())
  order by j.updated_at
  for update of j skip locked limit 1;
  if not found then return; end if;
  select coalesce(max(attempt_number), 0) + 1 into next_attempt from stage_attempts where job_id = selected.id and stage_id = selected.current_stage_id;
  update jobs set state = 'RUNNING', lease_epoch = lease_epoch + 1, updated_at = now() where id = selected.id returning * into selected;
  insert into stage_attempts(job_id, stage_id, attempt_number, worker_id, lease_token, lease_epoch, lease_expires_at, status, input_digest)
  values (selected.id, selected.current_stage_id, next_attempt, p_worker_id, gen_random_uuid(), selected.lease_epoch, now() + make_interval(secs => greatest(p_lease_seconds, 60)), 'running', selected.input_digest)
  returning * into new_attempt;
  return query select selected.id, new_attempt.id, new_attempt.stage_id, selected.exact_url, selected.url_fingerprint, selected.input_digest, new_attempt.lease_token, new_attempt.lease_epoch, new_attempt.lease_expires_at;
end;
$$;

create or replace function landing_control_v2.heartbeat_research_stage(
  p_stage_attempt_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_epoch bigint,
  p_lease_seconds integer default 900
) returns boolean
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
begin
  update stage_attempts set lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 60))
  where id = p_stage_attempt_id and worker_id = p_worker_id and lease_token = p_lease_token and lease_epoch = p_lease_epoch and status = 'running' and lease_expires_at > now();
  return found;
end;
$$;

create or replace function landing_control_v2.persist_research_artifact(
  p_stage_attempt_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_epoch bigint,
  p_schema_version text,
  p_payload jsonb,
  p_payload_sha256 text
) returns uuid
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
declare
  attempt stage_attempts%rowtype;
  artifact_id uuid;
begin
  select * into attempt from stage_attempts where id = p_stage_attempt_id and worker_id = p_worker_id and lease_token = p_lease_token and lease_epoch = p_lease_epoch and status = 'running' and lease_expires_at > now() for update;
  if not found then raise exception 'invalid or expired research lease'; end if;
  if p_schema_version not in ('HermesProductIdentityV1', 'HermesResearchEvidenceV1', 'ResearchSourceSnapshotBundleV1') then raise exception 'unsupported research artifact schema'; end if;
  if p_payload->>'schema_version' <> p_schema_version then raise exception 'artifact schema mismatch'; end if;
  if p_payload ? 'exact_url' and p_payload->>'exact_url' <> (select exact_url from jobs where id = attempt.job_id) then raise exception 'artifact URL does not match the leased job'; end if;
  if p_payload ? 'url_fingerprint' and p_payload->>'url_fingerprint' <> (select url_fingerprint from jobs where id = attempt.job_id) then raise exception 'artifact fingerprint does not match the leased job'; end if;
  insert into artifacts(job_id, stage_attempt_id, stage_id, schema_version, payload, payload_sha256)
  values (attempt.job_id, attempt.id, attempt.stage_id, p_schema_version, p_payload, p_payload_sha256)
  on conflict (stage_attempt_id, schema_version) do nothing
  returning id into artifact_id;
  if artifact_id is null then raise exception 'duplicate research artifact schema'; end if;
  return artifact_id;
end;
$$;

create or replace function landing_control_v2.complete_research_stage(
  p_stage_attempt_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_epoch bigint
) returns text
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
declare
  attempt stage_attempts%rowtype;
  job_row jobs%rowtype;
  required text;
begin
  select * into attempt from stage_attempts where id = p_stage_attempt_id and worker_id = p_worker_id and lease_token = p_lease_token and lease_epoch = p_lease_epoch and status = 'running' and lease_expires_at > now() for update;
  if not found then raise exception 'invalid or expired research lease'; end if;
  select * into job_row from jobs where id = attempt.job_id for update;
  if attempt.stage_id = 'product_identity' then required := 'HermesProductIdentityV1'; else required := 'HermesResearchEvidenceV1'; end if;
  if not exists (select 1 from artifacts where stage_attempt_id = attempt.id and schema_version = required) then raise exception 'required research artifact is missing'; end if;
  if attempt.stage_id = 'research' and not exists (select 1 from artifacts where stage_attempt_id = attempt.id and schema_version = 'ResearchSourceSnapshotBundleV1') then raise exception 'required source snapshot bundle is missing'; end if;
  update stage_attempts set status = 'completed', completed_at = now() where id = attempt.id;
  if attempt.stage_id = 'product_identity' then
    update jobs set state = 'RUNNING', current_stage_id = 'research', updated_at = now() where id = job_row.id;
  else
    update jobs set state = 'RESEARCH_COMPLETE', current_stage_id = null, updated_at = now() where id = job_row.id;
  end if;
  insert into events(job_id, stage_attempt_id, event_type, event_payload) values (job_row.id, attempt.id, 'STAGE_COMPLETED', jsonb_build_object('stage_id', attempt.stage_id));
  return case when attempt.stage_id = 'research' then 'RESEARCH_COMPLETE' else 'research' end;
end;
$$;

create or replace function landing_control_v2.fail_research_stage(
  p_stage_attempt_id uuid,
  p_worker_id text,
  p_lease_token uuid,
  p_lease_epoch bigint,
  p_retryable boolean
) returns boolean
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
declare
  attempt stage_attempts%rowtype;
begin
  select * into attempt from stage_attempts where id = p_stage_attempt_id and worker_id = p_worker_id and lease_token = p_lease_token and lease_epoch = p_lease_epoch and status = 'running' and lease_expires_at > now() for update;
  if not found then return false; end if;
  update stage_attempts set status = 'failed', completed_at = now() where id = attempt.id;
  if not p_retryable then update jobs set state = 'FAILED', updated_at = now() where id = attempt.job_id; end if;
  insert into events(job_id, stage_attempt_id, event_type, event_payload) values (attempt.job_id, attempt.id, 'STAGE_FAILED', jsonb_build_object('retryable', p_retryable));
  return true;
end;
$$;

create or replace function landing_control_v2.probe_control() returns boolean
language sql
security definer
set search_path = landing_control_v2, pg_catalog
as $$ select exists (select 1 from settings where key = 'global_kill_switch') and exists (select 1 from pipeline_versions where id = 'research_prep_v1'); $$;

create or replace function landing_control_v2.probe_worker() returns boolean
language sql
security definer
set search_path = landing_control_v2, pg_catalog
as $$ select exists (select 1 from stages where id = 'product_identity' and executor_id = 'hermes_product_identity') and exists (select 1 from stages where id = 'research' and executor_id = 'hermes_research'); $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'landing_migration_owner') then create role landing_migration_owner nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'landing_control_role') then create role landing_control_role nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'landing_research_worker_role') then create role landing_research_worker_role nologin; end if;
end;
$$;

alter schema landing_control_v2 owner to landing_migration_owner;
revoke all on all tables in schema landing_control_v2 from public;
revoke all on all sequences in schema landing_control_v2 from public;
grant usage on schema landing_control_v2 to landing_control_role, landing_research_worker_role;
grant select on landing_control_v2.jobs, landing_control_v2.pipeline_versions, landing_control_v2.stages, landing_control_v2.events to landing_control_role;
grant execute on function landing_control_v2.reconcile_authorized_urls(text, text, jsonb), landing_control_v2.dispatch_research_prep(text, text, text, text), landing_control_v2.probe_control() to landing_control_role;
grant execute on function landing_control_v2.claim_research_stage(text, integer), landing_control_v2.heartbeat_research_stage(uuid, text, uuid, bigint, integer), landing_control_v2.persist_research_artifact(uuid, text, uuid, bigint, text, jsonb, text), landing_control_v2.complete_research_stage(uuid, text, uuid, bigint), landing_control_v2.fail_research_stage(uuid, text, uuid, bigint, boolean), landing_control_v2.probe_worker() to landing_research_worker_role;
alter function landing_control_v2.reconcile_authorized_urls(text, text, jsonb) owner to landing_migration_owner;
alter function landing_control_v2.dispatch_research_prep(text, text, text, text) owner to landing_migration_owner;
alter function landing_control_v2.claim_research_stage(text, integer) owner to landing_migration_owner;
alter function landing_control_v2.heartbeat_research_stage(uuid, text, uuid, bigint, integer) owner to landing_migration_owner;
alter function landing_control_v2.persist_research_artifact(uuid, text, uuid, bigint, text, jsonb, text) owner to landing_migration_owner;
alter function landing_control_v2.complete_research_stage(uuid, text, uuid, bigint) owner to landing_migration_owner;
alter function landing_control_v2.fail_research_stage(uuid, text, uuid, bigint, boolean) owner to landing_migration_owner;
alter function landing_control_v2.probe_control() owner to landing_migration_owner;
alter function landing_control_v2.probe_worker() owner to landing_migration_owner;

insert into landing_control_v2.schema_migrations(migration_id, migration_sha256)
values ('V001', '465b260db0a7cb68d556e79ca9c4a7aa20daa46966badd59bcedb8d1f2bc31aa')
on conflict (migration_id) do nothing;

do $$
begin
  if (select migration_sha256 from landing_control_v2.schema_migrations where migration_id = 'V001') <> '465b260db0a7cb68d556e79ca9c4a7aa20daa46966badd59bcedb8d1f2bc31aa' then
    raise exception 'V001 migration checksum differs from the installed authority';
  end if;
end;
$$;

commit;
