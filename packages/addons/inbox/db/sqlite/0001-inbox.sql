CREATE TABLE inbox_message (
  message_id      TEXT PRIMARY KEY,
  project_key     TEXT NOT NULL,
  stage           TEXT,
  channel         TEXT NOT NULL DEFAULT 'email',
  from_address    TEXT,
  to_addresses    TEXT NOT NULL DEFAULT '[]',
  cc_addresses    TEXT NOT NULL DEFAULT '[]',
  bcc_addresses   TEXT NOT NULL DEFAULT '[]',
  subject         TEXT,
  html            TEXT,
  body            TEXT NOT NULL DEFAULT '',
  template_name   TEXT,
  template_locale TEXT,
  status          TEXT NOT NULL DEFAULT 'captured',
  deploy_ref      TEXT,
  meta            TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_inbox_message_project ON inbox_message (project_key, stage, channel, created_at DESC);

CREATE INDEX idx_inbox_message_created ON inbox_message (created_at);
