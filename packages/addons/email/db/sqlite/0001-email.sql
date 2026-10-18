CREATE TABLE email_message (
  message_id      TEXT PRIMARY KEY,
  project_key     TEXT NOT NULL,
  stage           TEXT,
  from_address    TEXT,
  to_addresses    TEXT NOT NULL DEFAULT '[]',
  cc_addresses    TEXT NOT NULL DEFAULT '[]',
  bcc_addresses   TEXT NOT NULL DEFAULT '[]',
  subject         TEXT NOT NULL DEFAULT '',
  html            TEXT NOT NULL DEFAULT '',
  text            TEXT NOT NULL DEFAULT '',
  template_name   TEXT,
  template_locale TEXT,
  status          TEXT NOT NULL DEFAULT 'captured',
  deploy_ref      TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_email_message_project ON email_message (project_key, stage, created_at DESC);

CREATE INDEX idx_email_message_created ON email_message (created_at);
