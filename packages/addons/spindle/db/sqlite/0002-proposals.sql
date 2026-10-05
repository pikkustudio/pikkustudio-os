-- Proposed knowledge bases for assets that fit none. A proposal never creates
-- anything by itself: the owner accepts, redirects or dismisses it.

create table "spindle_proposal" (
  "proposal_id" text not null primary key,
  "name" text not null,
  "description" text not null,
  "reason" text not null,
  "state" text not null default 'open' check ("state" in ('open', 'accepted', 'redirected', 'dismissed')),
  "kb_id" text references "spindle_knowledge_base" ("kb_id") on delete set null,
  "decided_at" text,
  "created_at" text not null default (datetime('now')),
  "updated_at" text not null default (datetime('now'))
);

create index "spindle_proposal_state_idx" on "spindle_proposal" ("state");

-- Kept after a dismissal: that is how the same grouping is recognised and not proposed again.
create table "spindle_proposal_asset" (
  "proposal_id" text not null references "spindle_proposal" ("proposal_id") on delete cascade,
  "asset_id" text not null references "spindle_asset" ("asset_id") on delete cascade,
  "fit" real not null,
  "note" text not null,
  primary key ("proposal_id", "asset_id")
);

create index "spindle_proposal_asset_asset_idx" on "spindle_proposal_asset" ("asset_id");
