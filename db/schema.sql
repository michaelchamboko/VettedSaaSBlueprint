-- PostgreSQL reference schema (Step 1 artifact)
-- Oracle-compatible migration: see db/oracle-migration-001.sql
-- This file is retained as the original PostgreSQL schema reference.
-- Do NOT apply this directly to Oracle Autonomous Database.

create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name varchar not null,
  slug varchar unique not null,
  website_url text,
  partnerstack_id varchar,
  description text,
  primary_audience text,
  pricing_summary text,
  commission_summary text,
  target_countries text[] default '{}',
  competitor_products text[] default '{}',
  seed_keywords text[] default '{}',
  status varchar not null default 'draft',
  research_priority int not null default 50,
  auto_low_risk_updates_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists affiliate_links (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  partnerstack_url text not null,
  destination_url text,
  link_type varchar not null,
  geo_target varchar,
  page_angle varchar,
  utm_source varchar,
  utm_medium varchar,
  utm_campaign varchar,
  subid_template varchar,
  status varchar not null default 'draft',
  last_checked_at timestamptz,
  last_status_code int,
  click_count int not null default 0,
  conversion_count int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists partnerstack_program_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  partnership_key varchar,
  program_name varchar not null,
  paid_ads_allowed boolean,
  brand_bidding_allowed boolean,
  coupon_language_allowed boolean,
  custom_links_enabled boolean,
  deep_links_enabled boolean,
  approved_destinations jsonb not null default '[]',
  required_disclosure text,
  resource_usage_notes text,
  self_referral_allowed boolean,
  raw_terms_source_id uuid,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists compliance_profiles (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  scope varchar not null default 'product',
  required_disclosure text,
  allowed_channels jsonb not null default '["organic_search"]',
  disallowed_channels jsonb not null default '["paid_ads","brand_bidding","coupon_pages"]',
  link_rules jsonb not null default '{}',
  claim_rules jsonb not null default '{}',
  privacy_rules jsonb not null default '{"minimal_tracking":true,"third_party_pixels":false,"fingerprinting":false}',
  source_usage_rules jsonb not null default '{}',
  status varchar not null default 'incomplete',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists manual_review_tasks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  page_id uuid,
  entity_type varchar not null,
  entity_id uuid,
  review_type varchar not null,
  risk_level varchar not null,
  reason text not null,
  supporting_context jsonb not null default '{}',
  status varchar not null default 'open',
  assigned_to varchar,
  resolved_by varchar,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists generation_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  page_id uuid,
  job_type varchar not null,
  status varchar not null default 'queued',
  priority int not null default 50,
  input_payload jsonb not null default '{}',
  output_payload jsonb,
  error_message text,
  retry_count int not null default 0,
  locked_by varchar,
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists hermes_research_sessions (id uuid primary key default gen_random_uuid(), product_id uuid references products(id), session_type varchar not null, status varchar not null, budget jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists scrapling_crawl_runs (id uuid primary key default gen_random_uuid(), job_id uuid references generation_jobs(id), product_id uuid references products(id), source_id uuid, target_url text not null, source_type varchar not null, fetcher_mode varchar not null default 'static', robots_obey boolean not null default true, rate_limit_config jsonb not null default '{}', crawl_depth int not null default 1, extraction_strategy jsonb not null default '{}', status varchar not null default 'queued', pages_seen int not null default 0, pages_changed int not null default 0, error_message text, started_at timestamptz not null default now(), completed_at timestamptz, created_at timestamptz not null default now());
create table if not exists research_sources (id uuid primary key default gen_random_uuid(), product_id uuid references products(id), source_type varchar not null, source_url text not null, source_title text, retrieved_at timestamptz not null default now(), source_hash varchar, usage_allowed boolean not null default false, robots_policy varchar, summary text, confidence_score numeric, notes text, created_at timestamptz not null default now());
create table if not exists evidence_claims (id uuid primary key default gen_random_uuid(), product_id uuid references products(id), page_id uuid, source_id uuid references research_sources(id), claim_text text not null, claim_type varchar not null, risk_level varchar not null, extracted_quote text, source_summary text, confidence_score numeric not null default 0, usage_allowed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists research_payloads (id uuid primary key default gen_random_uuid(), product_id uuid references products(id), payload jsonb not null, created_at timestamptz not null default now());
create table if not exists page_blueprints (id uuid primary key default gen_random_uuid(), product_id uuid references products(id), page_type varchar not null default 'direct_review', url_slug varchar not null, status varchar not null default 'draft', structural_json jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists page_versions (id uuid primary key default gen_random_uuid(), blueprint_id uuid references page_blueprints(id), version_number int not null, structural_copy jsonb not null, compliance_result jsonb not null default '{}', quality_score numeric, evidence_score numeric, approved_by varchar, approval_mode varchar not null default 'manual', published_at timestamptz, created_at timestamptz not null default now());
create table if not exists dynamic_pages (id uuid primary key default gen_random_uuid(), blueprint_id uuid references page_blueprints(id), current_version_id uuid references page_versions(id), path varchar unique not null, status varchar not null default 'draft', robots varchar not null default 'noindex,nofollow', revalidate_seconds int not null default 10800, published_at timestamptz, updated_at timestamptz not null default now());
create table if not exists conversion_events (id uuid primary key default gen_random_uuid(), page_id uuid, product_id uuid, affiliate_link_id uuid, event_type varchar not null, event_payload jsonb not null default '{}', user_agent text, referrer text, ip_hash varchar, created_at timestamptz not null default now());
create table if not exists page_daily_metrics (id uuid primary key default gen_random_uuid(), page_id uuid, metric_date date not null, page_views int not null default 0, cta_clicks int not null default 0, affiliate_clicks int not null default 0, link_errors int not null default 0, faq_expands int not null default 0, created_at timestamptz not null default now(), unique(page_id, metric_date));
create table if not exists optimization_recommendations (id uuid primary key default gen_random_uuid(), product_id uuid references products(id), page_id uuid, recommendation_type varchar not null, risk_level varchar not null default 'LOW_RISK', summary text not null, proposed_change jsonb not null default '{}', status varchar not null default 'pending', created_at timestamptz not null default now());
create table if not exists audit_log (id uuid primary key default gen_random_uuid(), actor_type varchar not null, actor_id varchar, action varchar not null, entity_type varchar not null, entity_id uuid not null, before_state jsonb, after_state jsonb, reason text, created_at timestamptz not null default now());

create index if not exists generation_jobs_claim_idx on generation_jobs(status, priority desc, created_at) where status = 'queued';
create index if not exists dynamic_pages_path_idx on dynamic_pages(path);
create index if not exists conversion_events_type_created_idx on conversion_events(event_type, created_at);
