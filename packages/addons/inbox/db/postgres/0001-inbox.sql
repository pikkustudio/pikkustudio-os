-- =============================================================================
-- INBOX ADDON TABLES
-- The inbox of messages (emails today, other channels later) a project app sent
-- while it ran under Studio. Rows are kept for seven days and pruned on write.
--
-- No foreign keys to project, organization or user: those are the consumer's
-- tables, and `pikku db export` runs this file alone in a scratch database
-- where they do not exist.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.inbox_message (
  message_id      TEXT        PRIMARY KEY,
  project_key     TEXT        NOT NULL,
  stage           TEXT,
  channel         TEXT        NOT NULL DEFAULT 'email',
  from_address    TEXT,
  to_addresses    JSONB       NOT NULL DEFAULT '[]',
  cc_addresses    JSONB       NOT NULL DEFAULT '[]',
  bcc_addresses   JSONB       NOT NULL DEFAULT '[]',
  subject         TEXT,
  html            TEXT,
  body            TEXT        NOT NULL DEFAULT '',
  template_name   TEXT,
  template_locale TEXT,
  status          TEXT        NOT NULL DEFAULT 'captured',
  deploy_ref      TEXT,
  meta            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inbox_message_project
  ON app.inbox_message (project_key, stage, channel, created_at DESC);

CREATE INDEX idx_inbox_message_created
  ON app.inbox_message (created_at);
