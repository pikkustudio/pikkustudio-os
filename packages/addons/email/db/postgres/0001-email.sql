-- =============================================================================
-- EMAIL ADDON TABLES
-- The inbox of emails a project app sent while it ran under Studio. Rows are
-- kept for seven days and pruned on write.
--
-- No foreign keys to project, organization or user: those are the consumer's
-- tables, and `pikku db export` runs this file alone in a scratch database
-- where they do not exist.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.email_message (
  message_id      TEXT        PRIMARY KEY,
  project_key     TEXT        NOT NULL,
  stage           TEXT,
  from_address    TEXT,
  to_addresses    JSONB       NOT NULL DEFAULT '[]',
  cc_addresses    JSONB       NOT NULL DEFAULT '[]',
  bcc_addresses   JSONB       NOT NULL DEFAULT '[]',
  subject         TEXT        NOT NULL DEFAULT '',
  html            TEXT        NOT NULL DEFAULT '',
  text            TEXT        NOT NULL DEFAULT '',
  template_name   TEXT,
  template_locale TEXT,
  status          TEXT        NOT NULL DEFAULT 'captured',
  deploy_ref      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_message_project
  ON app.email_message (project_key, stage, created_at DESC);

CREATE INDEX idx_email_message_created
  ON app.email_message (created_at);
