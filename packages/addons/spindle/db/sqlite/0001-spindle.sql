-- Spindle's library inside Studio. One owner, so no org column; every table is
-- spindle_-prefixed so it cannot collide with the app or another addon.

create table "spindle_asset" (
  "asset_id" text not null primary key,
  "catalogue_number" integer not null unique,
  "title" text not null,
  "file_name" text not null,
  "mime_type" text not null,
  "kind" text not null check ("kind" in ('document', 'text', 'audio', 'video', 'image')),
  "size_bytes" integer not null,
  "content_key" text not null,
  "batch_id" text,
  "status" text not null default 'uploaded' check ("status" in ('uploaded', 'extracting', 'extracted', 'failed')),
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create table "spindle_extraction" (
  "extraction_id" text not null primary key,
  "asset_id" text not null references "spindle_asset" ("asset_id") on delete cascade,
  "step" text not null,
  "status" text not null default 'running' check ("status" in ('running', 'done', 'failed')),
  "result" text,
  "error" text,
  "detail" text,
  "started_at" text not null default (datetime('now')),
  "finished_at" text,
  unique ("asset_id", "step")
);

create table "spindle_knowledge_base" (
  "kb_id" text not null primary key,
  "name" text not null unique,
  "description" text not null,
  "replacing_since" text,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create table "spindle_placement" (
  "placement_id" text not null primary key,
  "kb_id" text not null references "spindle_knowledge_base" ("kb_id") on delete cascade,
  "asset_id" text not null references "spindle_asset" ("asset_id") on delete cascade,
  "source" text not null check ("source" in ('workflow', 'member')),
  "state" text not null default 'placed' check ("state" in ('placed', 'removed')),
  "confidence" real,
  "reason" text,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now')),
  unique ("kb_id", "asset_id")
);

create index "spindle_placement_asset_idx" on "spindle_placement" ("asset_id");
