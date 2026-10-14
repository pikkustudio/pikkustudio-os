create table "project" ("project_id" text primary key, "name" text not null default '', "slug" text not null unique, "path" text not null, "git_repo_url" text, "created_at" text not null);
