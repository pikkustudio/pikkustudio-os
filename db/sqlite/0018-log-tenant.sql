alter table "log_entry" add column "tenant_org_id" text;

alter table "log_entry" add column "tenant_user_id" text;

create index "log_entry_project_level_at" on "log_entry" ("project_id", "level", "at" desc);
