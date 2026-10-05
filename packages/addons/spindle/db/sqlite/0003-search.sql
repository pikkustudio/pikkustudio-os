-- Passages: what each asset yielded, cut into searchable pieces with the place they
-- came from. Derived: indexing rewrites an asset's passages, and they go with the asset.
-- Embeddings are stored as float32 blobs and ranked in code, so no vector extension is needed.

create table "spindle_passage" (
  "passage_id" text not null primary key,
  "asset_id" text not null references "spindle_asset" ("asset_id") on delete cascade,
  "source" text not null check ("source" in ('summary', 'page', 'speech', 'frame')),
  "ord" integer not null,
  "page" integer,
  "start_seconds" real,
  "end_seconds" real,
  "frame_at" real,
  "text" text not null,
  "original" text,
  "embedding" blob not null,
  "model" text not null,
  "created_at" text not null default (datetime('now'))
);

create index "spindle_passage_asset_idx" on "spindle_passage" ("asset_id", "ord");

-- Keyword side of the search, English stemming so "glazes" finds "glaze".
create virtual table "spindle_passage_fts" using fts5(
  "text",
  content = 'spindle_passage',
  content_rowid = 'rowid',
  tokenize = 'porter unicode61'
);

create trigger "spindle_passage_ai" after insert on "spindle_passage" begin
  insert into "spindle_passage_fts" (rowid, "text") values (new.rowid, new."text");
end;

create trigger "spindle_passage_ad" after delete on "spindle_passage" begin
  insert into "spindle_passage_fts" ("spindle_passage_fts", rowid, "text") values ('delete', old.rowid, old."text");
end;
