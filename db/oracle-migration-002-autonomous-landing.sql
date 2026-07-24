-- Migration artifact only. Apply after the approved Oracle read-only readiness
-- check; this repository must not apply it automatically.

CREATE TABLE landing_allowlist_entries (
  allowlist_entry_id VARCHAR2(36) PRIMARY KEY,
  exact_url CLOB NOT NULL,
  url_sha256 VARCHAR2(64) NOT NULL,
  manifest_digest VARCHAR2(64) NOT NULL,
  source_commit_sha VARCHAR2(64) NOT NULL,
  status VARCHAR2(32) NOT NULL,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  noindex_at TIMESTAMP WITH TIME ZONE,
  archive_after_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT landing_allowlist_entries_status_ck
    CHECK (status IN ('active', 'revoked_noindex', 'archived')),
  CONSTRAINT landing_allowlist_entries_sha_uk UNIQUE (url_sha256)
);

CREATE TABLE landing_automation_runs (
  automation_run_id VARCHAR2(36) PRIMARY KEY,
  run_type VARCHAR2(64) NOT NULL,
  source_commit_sha VARCHAR2(64) NOT NULL,
  manifest_digest VARCHAR2(64),
  status VARCHAR2(32) NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  failure_code VARCHAR2(128),
  summary_json CLOB,
  CONSTRAINT landing_automation_runs_status_ck
    CHECK (status IN ('queued', 'running', 'blocked', 'succeeded', 'failed', 'cancelled'))
);

CREATE TABLE landing_automation_events (
  automation_event_id VARCHAR2(36) PRIMARY KEY,
  automation_run_id VARCHAR2(36) NOT NULL,
  event_type VARCHAR2(96) NOT NULL,
  event_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  payload_json CLOB,
  CONSTRAINT landing_automation_events_run_fk
    FOREIGN KEY (automation_run_id) REFERENCES landing_automation_runs(automation_run_id)
);

CREATE TABLE landing_automation_settings (
  settings_key VARCHAR2(128) PRIMARY KEY,
  settings_value VARCHAR2(4000) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL
);

INSERT INTO landing_automation_settings (settings_key, settings_value)
VALUES ('global_kill_switch', 'false');

INSERT INTO landing_automation_settings (settings_key, settings_value)
VALUES ('daily_publication_limit', '10');

INSERT INTO landing_automation_settings (settings_key, settings_value)
VALUES ('daily_llm_call_limit', '100');

COMMIT;
