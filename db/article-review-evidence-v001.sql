begin;

create table if not exists article_research.review_evidence_registrations (
  registration_id uuid primary key,
  import_id text not null check (import_id ~ '^article-[0-9a-f-]{36}$'),
  evidence_class text not null check (evidence_class in ('editorial-judgment', 'browser-observation', 'production-proof')),
  source_fingerprint text not null check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  examined_revision text not null check (examined_revision ~ '^[a-f0-9]{64}$'),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  registration jsonb not null,
  created_at timestamptz not null default current_timestamp,
  unique (import_id, evidence_class, examined_revision, evidence_sha256)
);

alter table article_research.review_evidence_registrations
  drop constraint if exists review_evidence_registrations_evidence_class_check;

alter table article_research.review_evidence_registrations
  add constraint review_evidence_registrations_evidence_class_check
  check (evidence_class in ('editorial-judgment', 'browser-observation', 'production-proof'));

create index if not exists review_evidence_registrations_lookup
  on article_research.review_evidence_registrations (import_id, evidence_class, created_at desc);

commit;
