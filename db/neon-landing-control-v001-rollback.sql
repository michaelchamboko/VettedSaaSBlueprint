begin;
do $$
declare
  has_work boolean;
begin
  select exists (select 1 from landing_control_v2.jobs) or exists (select 1 from landing_control_v2.artifacts) into has_work;
  if has_work then raise exception 'V001 rollback refused: jobs or artifacts exist'; end if;
end;
$$;
drop schema landing_control_v2 cascade;
commit;
