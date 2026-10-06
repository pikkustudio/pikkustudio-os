-- =============================================================================
-- REVIEW ADDON TABLES
-- The addon's own schema, in the shape core migrations 0149, 0150, 0158 and
-- 0159 already left it. A consumer that ran those sees no new migration from
-- `pikku db generate`; that no-op is what proves this file matches.
--
-- No foreign keys to project, organization or user: those are the consumer's
-- tables, and `pikku db export` runs this file alone in a scratch database
-- where they do not exist. Core's own migrations keep the constraints.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.review_verdict (
  verdict_id          TEXT        PRIMARY KEY,
  project_id          UUID,
  target_kind         TEXT        NOT NULL,
  target_id           TEXT        NOT NULL,
  contract_hash       TEXT,
  implementation_hash TEXT,
  subject             TEXT        NOT NULL,
  kind                TEXT        NOT NULL,
  reasons             TEXT[]      NOT NULL DEFAULT '{}',
  note                TEXT,
  cast_under_scope    TEXT        NOT NULL,
  organization_id     UUID,
  cast_by_user_id     UUID,
  cast_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_review_verdict_versioned
  ON app.review_verdict (
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    target_kind, target_id, implementation_hash, cast_under_scope
  )
  WHERE implementation_hash IS NOT NULL;

CREATE UNIQUE INDEX uq_review_verdict_unversioned
  ON app.review_verdict (
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    target_kind, target_id, cast_under_scope
  )
  WHERE implementation_hash IS NULL;

CREATE INDEX idx_review_verdict_subject
  ON app.review_verdict (subject, cast_at DESC);

CREATE INDEX idx_review_verdict_contract
  ON app.review_verdict (contract_hash)
  WHERE contract_hash IS NOT NULL;

CREATE INDEX idx_review_verdict_org
  ON app.review_verdict (organization_id, cast_at DESC);

CREATE TABLE app.review_comment (
  comment_id          TEXT        PRIMARY KEY,
  project_id          UUID,
  target_kind         TEXT        NOT NULL,
  target_id           TEXT        NOT NULL,
  contract_hash       TEXT,
  implementation_hash TEXT,
  subject             TEXT        NOT NULL,
  source_file         TEXT        NOT NULL,
  line_start          INTEGER     NOT NULL,
  line_end            INTEGER     NOT NULL,
  body                TEXT        NOT NULL,
  cast_under_scope    TEXT        NOT NULL,
  organization_id     UUID,
  cast_by_user_id     UUID,
  cast_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_comment_target
  ON app.review_comment (
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    target_kind, target_id, line_start
  );

CREATE INDEX idx_review_comment_subject
  ON app.review_comment (subject, cast_at DESC);

CREATE INDEX idx_review_comment_org
  ON app.review_comment (organization_id, cast_at DESC);
