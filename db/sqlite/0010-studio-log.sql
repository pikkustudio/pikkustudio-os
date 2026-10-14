create table "log_entry" ("log_id" integer primary key autoincrement, "project_id" text not null, "source" text not null, "level" text not null, "wire" text, "fn" text, "ms" integer, "trace" text, "text" text not null, "at" integer not null);

create index "log_entry_project_at" on "log_entry" ("project_id", "at" desc);

create table "log_cursor" ("file" text primary key, "project_id" text not null, "position" integer not null default 0);
