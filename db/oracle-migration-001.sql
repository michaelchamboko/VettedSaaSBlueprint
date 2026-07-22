-- Oracle Migration 001 — Schema Foundation
-- Converts PostgreSQL schema.sql to Oracle Autonomous Database compatible DDL
-- Migration type: ADDITIVE (no destructive changes)
-- Validation location: Oracle Autonomous Database (operator-approved connection path)
--
-- Compatibility notes:
--   UUID: VARCHAR2(36) — application generates UUIDs, not database
--   JSON: CLOB storage for application-managed JSON payloads
--   Arrays: CLOB with JSON arrays — application serializes
--   Timestamps: TIMESTAMP WITH TIME ZONE
--   Partial indexes: Oracle function-based indexes
--   Unique constraints: ALTER TABLE ADD CONSTRAINT (not inline)

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id VARCHAR2(36) NOT NULL,
  name VARCHAR2(255) NOT NULL,
  slug VARCHAR2(255) NOT NULL,
  website_url CLOB,
  partnerstack_id VARCHAR2(255),
  description CLOB,
  primary_audience CLOB,
  pricing_summary CLOB,
  commission_summary CLOB,
  target_countries CLOB,
  competitor_products CLOB,
  seed_keywords CLOB,
  status VARCHAR2(50) DEFAULT 'draft' NOT NULL,
  research_priority NUMBER(10) DEFAULT 50 NOT NULL,
  auto_low_risk_updates_enabled NUMBER(1) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_products PRIMARY KEY (id),
  CONSTRAINT uq_products_slug UNIQUE (slug)
);

-- ============================================================
-- AFFILIATE_LINKS
-- ============================================================
CREATE TABLE affiliate_links (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36) NOT NULL,
  partnerstack_url CLOB NOT NULL,
  destination_url CLOB,
  link_type VARCHAR2(50) NOT NULL,
  geo_target VARCHAR2(255),
  page_angle VARCHAR2(255),
  utm_source VARCHAR2(255),
  utm_medium VARCHAR2(255),
  utm_campaign VARCHAR2(255),
  subid_template VARCHAR2(255),
  status VARCHAR2(50) DEFAULT 'draft' NOT NULL,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_status_code NUMBER(10),
  click_count NUMBER(10) DEFAULT 0 NOT NULL,
  conversion_count NUMBER(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_affiliate_links PRIMARY KEY (id),
  CONSTRAINT fk_affiliate_links_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- PARTNERSTACK_PROGRAM_RULES
-- ============================================================
CREATE TABLE partnerstack_program_rules (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  partnership_key VARCHAR2(255),
  program_name VARCHAR2(255) NOT NULL,
  paid_ads_allowed NUMBER(1),
  brand_bidding_allowed NUMBER(1),
  coupon_language_allowed NUMBER(1),
  custom_links_enabled NUMBER(1),
  deep_links_enabled NUMBER(1),
  approved_destinations CLOB DEFAULT '[]',
  required_disclosure CLOB,
  resource_usage_notes CLOB,
  self_referral_allowed NUMBER(1),
  raw_terms_source_id VARCHAR2(36),
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_partnerstack_program_rules PRIMARY KEY (id),
  CONSTRAINT fk_program_rules_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- OFFER_FOLDERS (from database contract — organizing unit)
-- ============================================================
CREATE TABLE offer_folders (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36) NOT NULL,
  affiliate_link_id VARCHAR2(36),
  name VARCHAR2(255) NOT NULL,
  status VARCHAR2(50) DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_offer_folders PRIMARY KEY (id),
  CONSTRAINT fk_offer_folders_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- PARTNERSTACK_PROGRAM_RESOURCES
-- ============================================================
CREATE TABLE partnerstack_program_resources (
  id VARCHAR2(36) NOT NULL,
  offer_folder_id VARCHAR2(36) NOT NULL,
  resource_type VARCHAR2(50) NOT NULL,
  title VARCHAR2(255) NOT NULL,
  source_url CLOB,
  storage_url CLOB,
  notes CLOB,
  analysis_status VARCHAR2(50) DEFAULT 'pending' NOT NULL,
  owner_review_status VARCHAR2(50) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_partnerstack_program_resources PRIMARY KEY (id),
  CONSTRAINT fk_partnerstack_program_resources_folder FOREIGN KEY (offer_folder_id)
    REFERENCES offer_folders(id) ON DELETE CASCADE
);

-- ============================================================
-- OFFER_PURCHASE_DESTINATION_REVIEWS
-- ============================================================
CREATE TABLE offer_purchase_destination_reviews (
  id VARCHAR2(36) NOT NULL,
  offer_folder_id VARCHAR2(36) NOT NULL,
  affiliate_link_id VARCHAR2(36) NOT NULL,
  affiliate_url_checked CLOB NOT NULL,
  final_visible_destination_url CLOB,
  redirect_chain CLOB DEFAULT '[]',
  message_match_notes CLOB,
  cta_language CLOB,
  offer_promise CLOB,
  pricing_trial_guarantee_claims CLOB,
  trust_cues CLOB,
  friction_notes CLOB,
  visual_affinity_profile CLOB,
  compliance_warnings CLOB,
  conversion_continuity_score NUMBER(10) DEFAULT 0 NOT NULL,
  reviewed_by_owner NUMBER(1) DEFAULT 0 NOT NULL,
  owner_override NUMBER(1) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_offer_purchase_destination_reviews PRIMARY KEY (id),
  CONSTRAINT fk_offer_purchase_destination_reviews_folder FOREIGN KEY (offer_folder_id)
    REFERENCES offer_folders(id) ON DELETE CASCADE,
  CONSTRAINT fk_offer_purchase_destination_reviews_link FOREIGN KEY (affiliate_link_id)
    REFERENCES affiliate_links(id) ON DELETE CASCADE
);

-- ============================================================
-- CATEGORIES (from database contract)
-- ============================================================
CREATE TABLE categories (
  id VARCHAR2(36) NOT NULL,
  name VARCHAR2(255) NOT NULL,
  slug VARCHAR2(255) NOT NULL,
  description CLOB,
  parent_id VARCHAR2(36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_categories PRIMARY KEY (id),
  CONSTRAINT uq_categories_slug UNIQUE (slug)
);

-- ============================================================
-- COMPLIANCE_PROFILES
-- ============================================================
CREATE TABLE compliance_profiles (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  scope VARCHAR2(50) DEFAULT 'product' NOT NULL,
  required_disclosure CLOB,
  allowed_channels CLOB DEFAULT '["organic_search"]',
  disallowed_channels CLOB DEFAULT '["paid_ads","brand_bidding","coupon_pages"]',
  link_rules CLOB DEFAULT '{}',
  claim_rules CLOB DEFAULT '{}',
  privacy_rules CLOB DEFAULT '{"minimal_tracking":true,"third_party_pixels":false,"fingerprinting":false}',
  source_usage_rules CLOB DEFAULT '{}',
  status VARCHAR2(50) DEFAULT 'incomplete' NOT NULL,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_compliance_profiles PRIMARY KEY (id),
  CONSTRAINT fk_compliance_profiles_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- MANUAL_REVIEW_TASKS
-- ============================================================
CREATE TABLE manual_review_tasks (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  page_id VARCHAR2(36),
  entity_type VARCHAR2(50) NOT NULL,
  entity_id VARCHAR2(36),
  review_type VARCHAR2(50) NOT NULL,
  risk_level VARCHAR2(50) NOT NULL,
  reason CLOB NOT NULL,
  supporting_context CLOB DEFAULT '{}',
  status VARCHAR2(50) DEFAULT 'open' NOT NULL,
  assigned_to VARCHAR2(255),
  resolved_by VARCHAR2(255),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_manual_review_tasks PRIMARY KEY (id),
  CONSTRAINT fk_manual_review_tasks_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================================
-- GENERATION_JOBS (locking contract: FOR UPDATE SKIP LOCKED)
-- ============================================================
CREATE TABLE generation_jobs (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  page_id VARCHAR2(36),
  job_type VARCHAR2(50) NOT NULL,
  status VARCHAR2(50) DEFAULT 'queued' NOT NULL,
  priority NUMBER(10) DEFAULT 50 NOT NULL,
  input_payload CLOB DEFAULT '{}',
  output_payload CLOB,
  error_message CLOB,
  retry_count NUMBER(10) DEFAULT 0 NOT NULL,
  locked_by VARCHAR2(255),
  locked_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_generation_jobs PRIMARY KEY (id),
  CONSTRAINT fk_generation_jobs_product FOREIGN KEY (product_id)
    REFERENCES products(id) ON DELETE SET NULL
);

-- ============================================================
-- HERMES_RESEARCH_SESSIONS
-- ============================================================
CREATE TABLE hermes_research_sessions (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  session_type VARCHAR2(50) NOT NULL,
  status VARCHAR2(50) NOT NULL,
  budget CLOB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_hermes_research_sessions PRIMARY KEY (id),
  CONSTRAINT fk_hermes_sessions_product FOREIGN KEY (product_id)
    REFERENCES products(id)
);

-- ============================================================
-- SCRAPLING_CRAWL_RUNS
-- ============================================================
CREATE TABLE scrapling_crawl_runs (
  id VARCHAR2(36) NOT NULL,
  job_id VARCHAR2(36),
  product_id VARCHAR2(36),
  source_id VARCHAR2(36),
  target_url CLOB NOT NULL,
  source_type VARCHAR2(50) NOT NULL,
  fetcher_mode VARCHAR2(50) DEFAULT 'static' NOT NULL,
  robots_obey NUMBER(1) DEFAULT 1 NOT NULL,
  rate_limit_config CLOB DEFAULT '{}',
  crawl_depth NUMBER(10) DEFAULT 1 NOT NULL,
  extraction_strategy CLOB DEFAULT '{}',
  status VARCHAR2(50) DEFAULT 'queued' NOT NULL,
  pages_seen NUMBER(10) DEFAULT 0 NOT NULL,
  pages_changed NUMBER(10) DEFAULT 0 NOT NULL,
  error_message CLOB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_scrapling_crawl_runs PRIMARY KEY (id),
  CONSTRAINT fk_crawl_runs_job FOREIGN KEY (job_id)
    REFERENCES generation_jobs(id),
  CONSTRAINT fk_crawl_runs_product FOREIGN KEY (product_id)
    REFERENCES products(id)
);

-- ============================================================
-- RESEARCH_SOURCES
-- ============================================================
CREATE TABLE research_sources (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  source_type VARCHAR2(50) NOT NULL,
  source_url CLOB NOT NULL,
  source_title CLOB,
  retrieved_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  source_hash VARCHAR2(255),
  usage_allowed NUMBER(1) DEFAULT 0 NOT NULL,
  robots_policy VARCHAR2(50),
  summary CLOB,
  confidence_score NUMBER(5,2),
  notes CLOB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_research_sources PRIMARY KEY (id),
  CONSTRAINT fk_research_sources_product FOREIGN KEY (product_id)
    REFERENCES products(id)
);

-- ============================================================
-- EVIDENCE_CLAIMS
-- ============================================================
CREATE TABLE evidence_claims (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  page_id VARCHAR2(36),
  source_id VARCHAR2(36),
  claim_text CLOB NOT NULL,
  claim_type VARCHAR2(50) NOT NULL,
  risk_level VARCHAR2(50) NOT NULL,
  extracted_quote CLOB,
  source_summary CLOB,
  confidence_score NUMBER(5,2) DEFAULT 0 NOT NULL,
  usage_allowed NUMBER(1) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_evidence_claims PRIMARY KEY (id),
  CONSTRAINT fk_evidence_claims_source FOREIGN KEY (source_id)
    REFERENCES research_sources(id)
);

-- ============================================================
-- RESEARCH_PAYLOADS
-- ============================================================
CREATE TABLE research_payloads (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  payload CLOB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_research_payloads PRIMARY KEY (id),
  CONSTRAINT fk_research_payloads_product FOREIGN KEY (product_id)
    REFERENCES products(id)
);

-- ============================================================
-- PAGE_BLUEPRINTS
-- ============================================================
CREATE TABLE page_blueprints (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  page_type VARCHAR2(50) DEFAULT 'direct_review' NOT NULL,
  url_slug VARCHAR2(255) NOT NULL,
  status VARCHAR2(50) DEFAULT 'draft' NOT NULL,
  structural_json CLOB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_page_blueprints PRIMARY KEY (id),
  CONSTRAINT fk_page_blueprints_product FOREIGN KEY (product_id)
    REFERENCES products(id)
);

-- ============================================================
-- PAGE_VERSIONS
-- ============================================================
CREATE TABLE page_versions (
  id VARCHAR2(36) NOT NULL,
  blueprint_id VARCHAR2(36),
  version_number NUMBER(10) NOT NULL,
  structural_copy CLOB NOT NULL,
  compliance_result CLOB DEFAULT '{}',
  quality_score NUMBER(5,2),
  evidence_score NUMBER(5,2),
  approved_by VARCHAR2(255),
  approval_mode VARCHAR2(50) DEFAULT 'manual' NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_page_versions PRIMARY KEY (id),
  CONSTRAINT fk_page_versions_blueprint FOREIGN KEY (blueprint_id)
    REFERENCES page_blueprints(id)
);

-- ============================================================
-- DYNAMIC_PAGES
-- ============================================================
CREATE TABLE dynamic_pages (
  id VARCHAR2(36) NOT NULL,
  blueprint_id VARCHAR2(36),
  current_version_id VARCHAR2(36),
  path VARCHAR2(255) NOT NULL,
  status VARCHAR2(50) DEFAULT 'draft' NOT NULL,
  robots VARCHAR2(255) DEFAULT 'noindex,nofollow' NOT NULL,
  revalidate_seconds NUMBER(10) DEFAULT 10800 NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_dynamic_pages PRIMARY KEY (id),
  CONSTRAINT uq_dynamic_pages_path UNIQUE (path),
  CONSTRAINT fk_dynamic_pages_blueprint FOREIGN KEY (blueprint_id)
    REFERENCES page_blueprints(id),
  CONSTRAINT fk_dynamic_pages_version FOREIGN KEY (current_version_id)
    REFERENCES page_versions(id)
);

-- ============================================================
-- CONVERSION_EVENTS
-- ============================================================
CREATE TABLE conversion_events (
  id VARCHAR2(36) NOT NULL,
  page_id VARCHAR2(36),
  product_id VARCHAR2(36),
  affiliate_link_id VARCHAR2(36),
  event_type VARCHAR2(50) NOT NULL,
  event_payload CLOB DEFAULT '{}',
  user_agent CLOB,
  referrer CLOB,
  ip_hash VARCHAR2(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_conversion_events PRIMARY KEY (id),
  CONSTRAINT fk_conversion_events_product FOREIGN KEY (product_id)
    REFERENCES products(id)
);

-- ============================================================
-- PAGE_DAILY_METRICS
-- ============================================================
CREATE TABLE page_daily_metrics (
  id VARCHAR2(36) NOT NULL,
  page_id VARCHAR2(36),
  metric_date DATE NOT NULL,
  page_views NUMBER(10) DEFAULT 0 NOT NULL,
  cta_clicks NUMBER(10) DEFAULT 0 NOT NULL,
  affiliate_clicks NUMBER(10) DEFAULT 0 NOT NULL,
  link_errors NUMBER(10) DEFAULT 0 NOT NULL,
  faq_expands NUMBER(10) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_page_daily_metrics PRIMARY KEY (id),
  CONSTRAINT uq_page_daily_metrics UNIQUE (page_id, metric_date)
);

-- ============================================================
-- OPTIMIZATION_RECOMMENDATIONS
-- ============================================================
CREATE TABLE optimization_recommendations (
  id VARCHAR2(36) NOT NULL,
  product_id VARCHAR2(36),
  page_id VARCHAR2(36),
  recommendation_type VARCHAR2(50) NOT NULL,
  risk_level VARCHAR2(50) DEFAULT 'LOW_RISK' NOT NULL,
  summary CLOB NOT NULL,
  proposed_change CLOB DEFAULT '{}',
  status VARCHAR2(50) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_optimization_recommendations PRIMARY KEY (id),
  CONSTRAINT fk_optimization_product FOREIGN KEY (product_id)
    REFERENCES products(id)
);

-- ============================================================
-- AUDIT_LOG
-- ============================================================
CREATE TABLE audit_log (
  id VARCHAR2(36) NOT NULL,
  actor_type VARCHAR2(50) NOT NULL,
  actor_id VARCHAR2(255),
  action VARCHAR2(50) NOT NULL,
  entity_type VARCHAR2(50) NOT NULL,
  entity_id VARCHAR2(36) NOT NULL,
  before_state CLOB,
  after_state CLOB,
  reason CLOB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_audit_log PRIMARY KEY (id)
);

-- ============================================================
-- INDEXES — Job claims (concurrent-safe via SKIP LOCKED)
-- ============================================================
CREATE INDEX idx_generation_jobs_claim ON generation_jobs (status, priority DESC, created_at)
;

-- ============================================================
-- INDEXES — Page lookup
-- ============================================================
CREATE INDEX idx_dynamic_pages_path ON dynamic_pages (path);

-- ============================================================
-- INDEXES — Conversion event metrics
-- ============================================================
CREATE INDEX idx_conversion_events_type_created ON conversion_events (event_type, created_at);

-- ============================================================
-- INDEXES — Evidence lookup by product
-- ============================================================
CREATE INDEX idx_evidence_claims_product ON evidence_claims (product_id);

-- ============================================================
-- INDEXES — Job locking for concurrent workers
-- ============================================================
CREATE INDEX idx_generation_jobs_lock ON generation_jobs (locked_by, locked_at)
;

-- ============================================================
-- INDEXES — Page daily metrics lookup
-- ============================================================
CREATE INDEX idx_page_daily_metrics_date ON page_daily_metrics (metric_date);

-- End of Oracle Migration 001
