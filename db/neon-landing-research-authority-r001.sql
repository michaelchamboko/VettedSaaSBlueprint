begin;

do $$
begin
  if not exists (
    select 1 from landing_control_v2.schema_migrations
    where migration_id = 'V001'
      and migration_sha256 = '465b260db0a7cb68d556e79ca9c4a7aa20daa46966badd59bcedb8d1f2bc31aa'
  ) then
    raise exception 'R001 requires the exact V001 landing authority migration';
  end if;
end;
$$;

create table if not exists landing_control_v2.worker_capabilities (
  worker_id text primary key check (worker_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$'),
  fence_generation bigint not null check (fence_generation > 0),
  source_commit_sha text not null check (source_commit_sha ~ '^[a-f0-9]{40}$'),
  bundle_sha256 text not null check (bundle_sha256 ~ '^[a-f0-9]{64}$'),
  identity_contract_version text not null check (identity_contract_version = 'HermesResearchContractV1'),
  research_contract_version text not null check (research_contract_version = 'HermesResearchContractV1'),
  status text not null check (status in ('healthy', 'deactivated')),
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > observed_at)
);

create index if not exists worker_capabilities_fresh_idx
  on landing_control_v2.worker_capabilities (expires_at desc)
  where status = 'healthy';

create or replace function landing_control_v2.register_worker_capability(
  p_worker_id text,
  p_fence_generation bigint,
  p_source_commit_sha text,
  p_bundle_sha256 text,
  p_identity_contract_version text,
  p_research_contract_version text,
  p_ttl_seconds integer default 120
) returns boolean
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
begin
  if p_ttl_seconds < 30 or p_ttl_seconds > 900 then
    raise exception 'worker capability TTL is outside the permitted range';
  end if;
  insert into worker_capabilities (
    worker_id, fence_generation, source_commit_sha, bundle_sha256,
    identity_contract_version, research_contract_version, status, observed_at, expires_at
  ) values (
    p_worker_id, p_fence_generation, p_source_commit_sha, p_bundle_sha256,
    p_identity_contract_version, p_research_contract_version, 'healthy', now(), now() + make_interval(secs => p_ttl_seconds)
  )
  on conflict (worker_id) do update
    set fence_generation = excluded.fence_generation,
        source_commit_sha = excluded.source_commit_sha,
        bundle_sha256 = excluded.bundle_sha256,
        identity_contract_version = excluded.identity_contract_version,
        research_contract_version = excluded.research_contract_version,
        status = 'healthy',
        observed_at = now(),
        expires_at = excluded.expires_at
    where worker_capabilities.fence_generation <= excluded.fence_generation;
  return found;
end;
$$;

create or replace function landing_control_v2.inspect_fresh_worker_capability()
returns table (
  worker_id text,
  fence_generation bigint,
  source_commit_sha text,
  bundle_sha256 text,
  identity_contract_version text,
  research_contract_version text,
  expires_at timestamptz
)
language sql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
  select c.worker_id, c.fence_generation, c.source_commit_sha, c.bundle_sha256,
    c.identity_contract_version, c.research_contract_version, c.expires_at
  from worker_capabilities c
  where c.status = 'healthy' and c.expires_at > now()
  order by c.observed_at desc
  limit 1;
$$;

create or replace function landing_control_v2.deactivate_worker_capability(p_worker_id text)
returns boolean
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
begin
  update worker_capabilities
    set status = 'deactivated', expires_at = now()
    where worker_id = p_worker_id and status = 'healthy';
  return found;
end;
$$;

create or replace function landing_control_v2.activate_research_pipeline(
  p_source_commit_sha text,
  p_bundle_sha256 text
) returns boolean
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
begin
  perform 1 from settings where key = 'global_kill_switch' for update;
  perform 1 from pipeline_versions where id = 'research_prep_v1' for update;
  if not exists (
    select 1 from worker_capabilities
    where status = 'healthy' and expires_at > now()
      and source_commit_sha = p_source_commit_sha and bundle_sha256 = p_bundle_sha256
  ) then
    raise exception 'no fresh worker capability matches the requested source and bundle';
  end if;
  if exists (select 1 from pipeline_versions where id <> 'research_prep_v1' and status <> 'disabled') then
    raise exception 'another pipeline is active';
  end if;
  update pipeline_versions set status = 'approved' where id = 'research_prep_v1';
  update settings set value = 'false'::jsonb, updated_at = now() where key = 'global_kill_switch';
  return true;
end;
$$;

create or replace function landing_control_v2.deactivate_research_pipeline()
returns boolean
language plpgsql
security definer
set search_path = landing_control_v2, pg_catalog
as $$
begin
  update settings set value = 'true'::jsonb, updated_at = now() where key = 'global_kill_switch';
  update pipeline_versions set status = 'disabled' where id = 'research_prep_v1';
  return true;
end;
$$;

grant execute on function landing_control_v2.inspect_fresh_worker_capability() to landing_control_role;
grant execute on function landing_control_v2.register_worker_capability(text, bigint, text, text, text, text, integer) to landing_research_worker_role;
grant execute on function landing_control_v2.deactivate_worker_capability(text) to landing_control_role;
revoke all on function landing_control_v2.register_worker_capability(text, bigint, text, text, text, text, integer) from public;
revoke all on function landing_control_v2.inspect_fresh_worker_capability() from public;
revoke all on function landing_control_v2.deactivate_worker_capability(text) from public;
revoke all on function landing_control_v2.activate_research_pipeline(text, text) from public;
revoke all on function landing_control_v2.deactivate_research_pipeline() from public;
alter function landing_control_v2.register_worker_capability(text, bigint, text, text, text, text, integer) owner to landing_migration_owner;
alter function landing_control_v2.inspect_fresh_worker_capability() owner to landing_migration_owner;
alter function landing_control_v2.deactivate_worker_capability(text) owner to landing_migration_owner;
alter function landing_control_v2.activate_research_pipeline(text, text) owner to landing_migration_owner;
alter function landing_control_v2.deactivate_research_pipeline() owner to landing_migration_owner;

insert into landing_control_v2.schema_migrations(migration_id, migration_sha256)
values ('R001', 'bf48f7fe8f0285b4c48c12ef0d75c1b17a4a408ef4b66b03341abb2ee975a4ce')
on conflict (migration_id) do nothing;

do $$
begin
  if (select migration_sha256 from landing_control_v2.schema_migrations where migration_id = 'R001') <> 'bf48f7fe8f0285b4c48c12ef0d75c1b17a4a408ef4b66b03341abb2ee975a4ce' then
    raise exception 'R001 migration checksum differs from the installed authority';
  end if;
end;
$$;

commit;
