begin;

do $$
begin
  if exists (select 1 from landing_control_v2.worker_capabilities)
    or exists (select 1 from landing_control_v2.jobs)
    or exists (select 1 from landing_control_v2.events)
    or exists (select 1 from landing_control_v2.artifacts) then
    raise exception 'R001 rollback refuses to remove durable research authority with retained history';
  end if;
end;
$$;

drop function if exists landing_control_v2.deactivate_research_pipeline();
drop function if exists landing_control_v2.activate_research_pipeline(text, text);
drop function if exists landing_control_v2.deactivate_worker_capability(text);
drop function if exists landing_control_v2.inspect_fresh_worker_capability();
drop function if exists landing_control_v2.register_worker_capability(text, bigint, text, text, text, text, integer);
drop table if exists landing_control_v2.worker_capabilities;
delete from landing_control_v2.schema_migrations where migration_id = 'R001';

commit;
