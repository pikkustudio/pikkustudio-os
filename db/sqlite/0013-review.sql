-- Lifted from the '@pikku/addon-review' addon (db/sqlite/0001-review.sql).
-- `pikku db generate` cannot run here yet: @pikkustudio/addon-studio publishes no schema artifact.

CREATE TABLE review_verdict (
  verdict_id          TEXT PRIMARY KEY,
  project_id          TEXT,
  target_kind         TEXT NOT NULL,
  target_id           TEXT NOT NULL,
  contract_hash       TEXT,
  implementation_hash TEXT,
  subject             TEXT NOT NULL,
  kind                TEXT NOT NULL,
  reasons             TEXT NOT NULL DEFAULT '[]',
  note                TEXT,
  cast_under_scope    TEXT NOT NULL,
  organization_id     TEXT,
  cast_by_user_id     TEXT,
  cast_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX uq_review_verdict_versioned
  ON review_verdict (
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'),
    target_kind, target_id, implementation_hash, cast_under_scope
  )
  WHERE implementation_hash IS NOT NULL;

CREATE UNIQUE INDEX uq_review_verdict_unversioned
  ON review_verdict (
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'),
    target_kind, target_id, cast_under_scope
  )
  WHERE implementation_hash IS NULL;

CREATE INDEX idx_review_verdict_subject ON review_verdict (subject, cast_at DESC);

CREATE INDEX idx_review_verdict_contract ON review_verdict (contract_hash) WHERE contract_hash IS NOT NULL;

CREATE INDEX idx_review_verdict_org ON review_verdict (organization_id, cast_at DESC);

CREATE TABLE review_comment (
  comment_id          TEXT PRIMARY KEY,
  project_id          TEXT,
  target_kind         TEXT NOT NULL,
  target_id           TEXT NOT NULL,
  contract_hash       TEXT,
  implementation_hash TEXT,
  subject             TEXT NOT NULL,
  source_file         TEXT NOT NULL,
  line_start          INTEGER NOT NULL,
  line_end            INTEGER NOT NULL,
  body                TEXT NOT NULL,
  cast_under_scope    TEXT NOT NULL,
  organization_id     TEXT,
  cast_by_user_id     TEXT,
  cast_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_review_comment_target
  ON review_comment (
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'),
    target_kind, target_id, line_start
  );

CREATE INDEX idx_review_comment_subject ON review_comment (subject, cast_at DESC);

CREATE INDEX idx_review_comment_org ON review_comment (organization_id, cast_at DESC);
