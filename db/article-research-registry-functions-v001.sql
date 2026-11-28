begin;

create or replace function article_research.prepare_import_evidence_v001(p_searches text[])
returns table (database_now timestamptz, candidates jsonb, legacy_leads jsonb)
language plpgsql security invoker
set search_path = pg_catalog, article_research
as $function$
begin
  if current_user <> 'article_research_worker'
     or session_user <> 'article_research_worker'
     or current_database() <> 'neondb' then
    raise exception 'ARTICLE_RESEARCH_OAUTH_DATABASE_IDENTITY_INVALID';
  end if;
  return query
  with searches as (
    select search, ordinal from unnest(coalesce(p_searches, array[]::text[]))
      with ordinality as input(search, ordinal)
  ), candidate_matches as (
    select c.id as claim_id, c.claim_sha256, c.claim_text, c.claim_kind, c.material,
      c.updated_at as claim_updated_at, ss.id as snapshot_id, s.id as source_id,
      s.canonical_url, s.source_type, ss.evidence_sha256, ss.retrieved_at,
      ss.access_outcome, ss.passage, ss.locator, ce.verdict, ce.confidence,
      ce.product_context, ce.reasoning, ce.expires_at, ce.updated_at as evidence_updated_at,
      searches.ordinal as search_ordinal,
      row_number() over (partition by c.id, ss.id, ce.product_context order by searches.ordinal) as match_number
    from searches
    join article_research.claims c on c.search_document @@ websearch_to_tsquery('english', searches.search)
    join article_research.claim_evidence ce on ce.claim_id = c.id
    join article_research.source_snapshots ss on ss.id = ce.snapshot_id
    join article_research.sources s on s.id = ss.source_id
  ), legacy_matches as (
    select rs.id as source_id, rs.product_id, rs.source_url, rs.source_type,
      rs.source_hash, rs.retrieved_at, rs.usage_allowed, ec.id as claim_id,
      ec.claim_text, ec.updated_at as claim_updated_at, searches.ordinal as search_ordinal,
      row_number() over (partition by rs.id, ec.id order by searches.ordinal) as match_number
    from searches
    join public.research_sources rs on true
    left join public.evidence_claims ec on ec.source_id = rs.id and ec.usage_allowed is true
    where to_tsvector('english', coalesce(ec.claim_text, '') || ' ' || coalesce(rs.summary, ''))
      @@ websearch_to_tsquery('english', searches.search)
      and rs.usage_allowed is true
  )
  select date_trunc('milliseconds', current_timestamp),
    coalesce((select jsonb_agg(jsonb_build_object(
      'claim_id', claim_id, 'claim_sha256', claim_sha256, 'claim_text', claim_text,
      'claim_kind', claim_kind, 'material', material,
      'claim_updated_at', to_char(claim_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'snapshot_id', snapshot_id, 'source_id', source_id, 'canonical_url', canonical_url,
      'source_type', source_type, 'evidence_sha256', evidence_sha256,
      'retrieved_at', to_char(retrieved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'access_outcome', access_outcome, 'passage', passage, 'locator', locator,
      'verdict', verdict, 'confidence', confidence, 'product_context', product_context,
      'reasoning', reasoning,
      'expires_at', to_char(expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'evidence_updated_at', to_char(evidence_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) order by search_ordinal, material desc, confidence desc, evidence_updated_at desc)
      from candidate_matches where match_number = 1), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'source_id', source_id, 'product_id', product_id, 'source_url', source_url,
      'source_type', source_type, 'source_hash', source_hash,
      'retrieved_at', case when retrieved_at is null then null else to_char(retrieved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
      'usage_allowed', usage_allowed, 'claim_id', claim_id, 'claim_text', claim_text,
      'claim_updated_at', case when claim_updated_at is null then null else to_char(claim_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
    ) order by search_ordinal, claim_updated_at desc nulls last, retrieved_at desc nulls last)
      from legacy_matches where match_number = 1), '[]'::jsonb);
end
$function$;

create or replace function article_research.commit_import_evidence_v001(p_commit jsonb)
returns table (binding_id uuid, replayed boolean)
language plpgsql security invoker
set search_path = pg_catalog, article_research
as $function$
declare
  v_now timestamptz;
  v_replay record; v_current record; v_conflict record;
  v_decision jsonb; v_match jsonb; v_planned jsonb; v_source jsonb;
  v_metadata jsonb; v_claim jsonb; v_final jsonb; v_candidate jsonb; v_link jsonb;
  v_source_id uuid; v_snapshot_id uuid; v_claim_id uuid; v_binding_id uuid;
  v_local_source_id text; v_lock text;
  v_snapshot_ids jsonb := '{}'::jsonb; v_links jsonb := '[]'::jsonb;
  v_conflict_retained boolean;
begin
  if current_user <> 'article_research_worker'
     or session_user <> 'article_research_worker'
     or current_database() <> 'neondb' then
    raise exception 'ARTICLE_RESEARCH_OAUTH_DATABASE_IDENTITY_INVALID';
  end if;
  if current_setting('transaction_isolation') <> 'serializable' then
    raise exception 'CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_SERIALIZABLE_REQUIRED';
  end if;
  v_now := date_trunc('milliseconds', current_timestamp);

  perform pg_advisory_xact_lock(hashtextextended(p_commit->>'importId', 0));
  for v_lock in
    select distinct value from (
      select jsonb_array_elements_text(coalesce(p_commit->'plannedClaimHashes', '[]'::jsonb)) value
      union all
      select jsonb_array_elements_text(coalesce(p_commit->'finalClaimHashes', '[]'::jsonb)) value
    ) hashes order by value
  loop perform pg_advisory_xact_lock(hashtextextended('claim:' || v_lock, 0)); end loop;

  select id, source_fingerprint, plan_fingerprint, decision_sha256, writeback_path,
    writeback_sha256, evidence_path, evidence_sha256 into v_replay
  from article_research.import_evidence_bindings
  where import_id = p_commit->>'importId' and idempotency_key = p_commit->>'idempotencyKey';
  if found then
    if v_replay.source_fingerprint <> p_commit->>'sourceFingerprint'
      or v_replay.plan_fingerprint <> p_commit->>'planFingerprint'
      or v_replay.decision_sha256 <> p_commit->>'decisionSha256'
      or v_replay.evidence_path <> p_commit->>'evidencePath'
      or v_replay.evidence_sha256 <> p_commit->>'evidenceSha256'
      or v_replay.writeback_path is distinct from p_commit->>'writebackPath'
      or v_replay.writeback_sha256 is distinct from p_commit->>'writebackSha256' then
      raise exception 'RESEARCH_REGISTRY_REPLAY_MISMATCH';
    end if;
    return query select v_replay.id::uuid, true; return;
  end if;

  if exists (select 1 from jsonb_array_elements(coalesce(p_commit->'decisions', '[]'::jsonb)) d
             where d->>'action' = 'researched_gap') then
    if nullif(p_commit->>'writebackCreatedAt', '') is null then
      raise exception 'RESEARCH_REGISTRY_WRITEBACK_REQUIRED';
    end if;
    if (p_commit->>'researchCreatedAt')::timestamptz > v_now
      or (p_commit->>'writebackCreatedAt')::timestamptz > v_now
      or exists (
        select 1 from jsonb_array_elements(coalesce(p_commit->'sources', '[]'::jsonb)) s
        where s->>'id' in (select jsonb_array_elements_text(coalesce(p_commit->'acquiredSourceIds', '[]'::jsonb)))
          and ((s->>'retrievedAt')::timestamptz < (p_commit->>'planGeneratedAt')::timestamptz
            or (s->>'retrievedAt')::timestamptz > (p_commit->>'writebackCreatedAt')::timestamptz)
      ) then raise exception 'RESEARCH_REGISTRY_ACQUISITION_TIME_INVALID'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(p_commit->'writebackClaims', '[]'::jsonb)) c
               where (c->>'expiresAt')::timestamptz <= v_now
                  or (c->>'expiresAt')::timestamptz > v_now + interval '90 days') then
      raise exception 'RESEARCH_REGISTRY_EXPIRY_INVALID';
    end if;
  end if;

  insert into article_research.import_evidence_bindings
    (import_id, idempotency_key, source_fingerprint, plan_fingerprint, decision_path,
     decision_sha256, writeback_path, writeback_sha256, evidence_path, evidence_sha256)
  values (p_commit->>'importId', p_commit->>'idempotencyKey', p_commit->>'sourceFingerprint',
    p_commit->>'planFingerprint', p_commit->>'decisionPath', p_commit->>'decisionSha256',
    p_commit->>'writebackPath', p_commit->>'writebackSha256', p_commit->>'evidencePath', p_commit->>'evidenceSha256')
  returning id into v_binding_id;
  if v_binding_id is null then raise exception 'RESEARCH_REGISTRY_BINDING_WRITE_FAILED'; end if;

  for v_decision in select value from jsonb_array_elements(coalesce(p_commit->'decisions', '[]'::jsonb)) loop
    for v_match in select value from jsonb_array_elements(coalesce(v_decision->'registryMatches', '[]'::jsonb)) loop
      v_planned := null;
      select value into v_planned from jsonb_array_elements(coalesce(p_commit->'candidates', '[]'::jsonb))
      where value->>'claimId' = v_match->>'claimId' and value->>'snapshotId' = v_match->>'snapshotId'
        and value->>'productContext' = v_match->>'productContext' limit 1;
      if v_planned is null then raise exception 'RESEARCH_REGISTRY_PLAN_STALE'; end if;
      v_conflict_retained := false;
      for v_conflict in
        select ss.passage, ss.evidence_sha256 from article_research.claim_evidence ce
        join article_research.source_snapshots ss on ss.id = ce.snapshot_id
        where ce.claim_id = (v_planned->>'claimId')::uuid and ce.product_context = v_planned->>'productContext'
          and ce.expires_at > current_timestamp
          and (ce.verdict in ('PARTIALLY_SUPPORTED','CONTRADICTED','UNVERIFIED')
            or ss.access_outcome in ('partial','inaccessible','conflicting')) for update of ce, ss
      loop
        if v_conflict.passage is not null and
          encode(pg_catalog.sha256(convert_to(v_conflict.passage, 'UTF8')), 'hex') = v_conflict.evidence_sha256 then
          v_conflict_retained := true;
        end if;
      end loop;
      if v_conflict_retained then raise exception 'RESEARCH_REGISTRY_PLAN_STALE'; end if;
      select c.updated_at claim_updated_at, ss.evidence_sha256, ss.passage, ss.access_outcome,
        ce.verdict, ce.expires_at, ce.updated_at evidence_updated_at into v_current
      from article_research.claim_evidence ce join article_research.claims c on c.id = ce.claim_id
      join article_research.source_snapshots ss on ss.id = ce.snapshot_id
      where c.id = (v_planned->>'claimId')::uuid and ss.id = (v_planned->>'snapshotId')::uuid
        and ce.product_context = v_planned->>'productContext' and ce.expires_at > current_timestamp
      for update of c, ce, ss;
      if not found or v_current.evidence_sha256 <> v_planned->>'evidenceSha256'
        or v_current.verdict <> 'SUPPORTED' or v_current.access_outcome <> 'success'
        or v_current.passage is null
        or encode(pg_catalog.sha256(convert_to(v_current.passage, 'UTF8')), 'hex') <> v_current.evidence_sha256
        or date_trunc('milliseconds', v_current.claim_updated_at) <> date_trunc('milliseconds', (v_planned->>'claimUpdatedAt')::timestamptz)
        or date_trunc('milliseconds', v_current.evidence_updated_at) <> date_trunc('milliseconds', (v_planned->>'evidenceUpdatedAt')::timestamptz)
        or date_trunc('milliseconds', v_current.expires_at) <> date_trunc('milliseconds', (v_planned->>'expiresAt')::timestamptz) then
        raise exception 'RESEARCH_REGISTRY_PLAN_STALE';
      end if;
    end loop;
  end loop;

  for v_lock in
    select distinct s->>'canonicalUrl' from jsonb_array_elements(coalesce(p_commit->'sources', '[]'::jsonb)) s
    where s->>'id' in (select jsonb_array_elements_text(coalesce(p_commit->'acquiredSourceIds', '[]'::jsonb)))
    order by s->>'canonicalUrl'
  loop perform pg_advisory_xact_lock(hashtextextended('source:' || v_lock, 0)); end loop;

  for v_source in select value from jsonb_array_elements(coalesce(p_commit->'sources', '[]'::jsonb)) loop
    continue when not (v_source->>'id' in
      (select jsonb_array_elements_text(coalesce(p_commit->'acquiredSourceIds', '[]'::jsonb))));
    v_metadata := null;
    select value into v_metadata from jsonb_array_elements(coalesce(p_commit->'writebackSources', '[]'::jsonb))
    where value->>'sourceId' = v_source->>'id' limit 1;
    if v_metadata is null or not (v_source ? 'passage') then raise exception 'RESEARCH_REGISTRY_SOURCE_DECISION_MISSING'; end if;
    insert into article_research.sources (canonical_url, source_type, last_checked_at)
    values (v_source->>'canonicalUrl', v_metadata->>'sourceType', (v_source->>'retrievedAt')::timestamptz)
    on conflict (canonical_url) do update set source_type=excluded.source_type,
      last_checked_at=excluded.last_checked_at, updated_at=current_timestamp
    where article_research.sources.last_checked_at is null
       or article_research.sources.last_checked_at < excluded.last_checked_at;
    select s.id into v_source_id from article_research.sources s where s.canonical_url = v_source->>'canonicalUrl';
    if v_source_id is null then raise exception 'CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_SOURCE_WRITE_FAILED'; end if;
    insert into article_research.source_snapshots
      (source_id,evidence_sha256,retrieved_at,access_outcome,passage,locator)
    values (v_source_id,v_source->>'evidenceSha256',(v_source->>'retrievedAt')::timestamptz,
      v_metadata->>'accessOutcome',v_source->>'passage',coalesce(v_metadata->>'locator',p_commit->>'evidencePath'))
    on conflict (source_id,evidence_sha256) do update set retrieved_at=excluded.retrieved_at,
      access_outcome=excluded.access_outcome, passage=excluded.passage, locator=excluded.locator
    where article_research.source_snapshots.retrieved_at < excluded.retrieved_at;
    select ss.id into v_snapshot_id from article_research.source_snapshots ss
    where ss.source_id=v_source_id and ss.evidence_sha256=v_source->>'evidenceSha256';
    if v_snapshot_id is null then raise exception 'CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_SNAPSHOT_WRITE_FAILED'; end if;
    v_snapshot_ids := v_snapshot_ids || jsonb_build_object(v_source->>'id', v_snapshot_id::text);
  end loop;

  for v_claim in select value from jsonb_array_elements(coalesce(p_commit->'evidenceClaims', '[]'::jsonb)) loop
    v_final := null;
    select value into v_final from jsonb_array_elements(coalesce(p_commit->'writebackClaims', '[]'::jsonb))
    where value->>'evidenceClaimId'=v_claim->>'id' limit 1;
    v_decision := null;
    select value into v_decision from jsonb_array_elements(coalesce(p_commit->'decisions', '[]'::jsonb))
    where value->>'claimId'=coalesce(v_final->>'plannedClaimId',v_claim->>'id') limit 1;
    if v_decision is null then raise exception 'RESEARCH_REGISTRY_CLAIM_DECISION_MISSING'; end if;
    if v_decision->>'action'='reused_current' then
      for v_match in select value from jsonb_array_elements(coalesce(v_decision->'registryMatches','[]'::jsonb)) loop
        v_planned := null;
        select value into v_planned from jsonb_array_elements(coalesce(p_commit->'candidates','[]'::jsonb))
        where value->>'claimId'=v_match->>'claimId' and value->>'snapshotId'=v_match->>'snapshotId'
          and value->>'productContext'=v_match->>'productContext' limit 1;
        v_local_source_id := null;
        for v_candidate in select value from jsonb_array_elements(coalesce(p_commit->'sources','[]'::jsonb)) loop
          if v_candidate->>'id' in (select jsonb_array_elements_text(coalesce(v_claim->'sourceIds','[]'::jsonb)))
            and v_candidate->>'canonicalUrl'=v_planned->>'canonicalUrl'
            and v_candidate->>'evidenceSha256'=v_planned->>'evidenceSha256' then
            v_local_source_id:=v_candidate->>'id'; exit;
          end if;
        end loop;
        if v_planned is null or v_local_source_id is null then raise exception 'RESEARCH_REGISTRY_REUSE_SOURCE_UNBOUND'; end if;
        v_links:=v_links||jsonb_build_array(jsonb_build_object('localClaimId',v_claim->>'id',
          'localSourceId',v_local_source_id,'claimId',v_match->>'claimId','snapshotId',v_match->>'snapshotId',
          'productContext',v_match->>'productContext','action','reused_current'));
      end loop;
    else
      if v_final is null or nullif(p_commit->>'writebackCreatedAt','') is null then raise exception 'RESEARCH_REGISTRY_WRITEBACK_REQUIRED'; end if;
      insert into article_research.claims (claim_sha256,claim_text,claim_kind,material)
      values (v_claim->>'claimSha256',v_claim->>'text',v_final->>'claimKind',(v_decision->>'material')::boolean)
      on conflict (claim_sha256) do nothing;
      select c.id into v_claim_id from article_research.claims c where c.claim_sha256=v_claim->>'claimSha256';
      if v_claim_id is null then raise exception 'CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_CLAIM_WRITE_FAILED'; end if;
      for v_local_source_id in select jsonb_array_elements_text(coalesce(v_claim->'sourceIds','[]'::jsonb)) loop
        v_snapshot_id:=nullif(v_snapshot_ids->>v_local_source_id,'')::uuid;
        if v_snapshot_id is null then raise exception 'RESEARCH_REGISTRY_SOURCE_DECISION_MISSING'; end if;
        insert into article_research.claim_evidence
          (claim_id,snapshot_id,verdict,confidence,product_context,reasoning,expires_at,created_at,updated_at)
        values (v_claim_id,v_snapshot_id,v_final->>'verdict',(v_final->>'confidence')::numeric,
          v_decision->>'productContext',v_final->>'reasoning',(v_final->>'expiresAt')::timestamptz,
          (p_commit->>'writebackCreatedAt')::timestamptz,(p_commit->>'writebackCreatedAt')::timestamptz)
        on conflict (claim_id,snapshot_id,product_context) do update set verdict=excluded.verdict,
          confidence=excluded.confidence,reasoning=excluded.reasoning,expires_at=excluded.expires_at,updated_at=excluded.updated_at
        where article_research.claim_evidence.updated_at < excluded.updated_at;
        select ce.verdict,ce.confidence,ce.product_context,ce.reasoning,ce.expires_at into v_current
        from article_research.claim_evidence ce where ce.claim_id=v_claim_id and ce.snapshot_id=v_snapshot_id
          and ce.product_context=v_decision->>'productContext';
        if not found or v_current.product_context<>v_decision->>'productContext'
          or v_current.verdict<>v_final->>'verdict' or v_current.confidence<>(v_final->>'confidence')::numeric
          or v_current.reasoning<>v_final->>'reasoning' or v_current.expires_at<>(v_final->>'expiresAt')::timestamptz then
          raise exception 'CAPABILITY_UNAVAILABLE: RESEARCH_REGISTRY_CONCURRENT_EVIDENCE_CHANGED';
        end if;
        v_links:=v_links||jsonb_build_array(jsonb_build_object('localClaimId',v_claim->>'id',
          'localSourceId',v_local_source_id,'claimId',v_claim_id::text,'snapshotId',v_snapshot_id::text,
          'productContext',v_decision->>'productContext','action',v_decision->>'action'));
      end loop;
    end if;
  end loop;

  for v_link in select value from jsonb_array_elements(v_links) loop
    insert into article_research.import_evidence_links
      (binding_id,claim_id,snapshot_id,product_context,local_claim_id,local_source_id,action)
    values (v_binding_id,(v_link->>'claimId')::uuid,(v_link->>'snapshotId')::uuid,
      v_link->>'productContext',v_link->>'localClaimId',v_link->>'localSourceId',v_link->>'action')
    on conflict on constraint import_evidence_links_pkey do nothing;
  end loop;
  return query select v_binding_id,false;
end
$function$;

revoke all on function article_research.prepare_import_evidence_v001(text[]) from public;
revoke all on function article_research.commit_import_evidence_v001(jsonb) from public;
grant execute on function article_research.prepare_import_evidence_v001(text[]) to article_research_worker;
grant execute on function article_research.commit_import_evidence_v001(jsonb) to article_research_worker;

commit;
