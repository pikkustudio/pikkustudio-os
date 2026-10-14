create table "project_new" ("project_id" text primary key, "owner" text not null default '', "name" text not null default '', "slug" text not null default '', "path" text not null, "git_repo_url" text, "created_at" text not null);

insert into "project_new" ("project_id", "name", "slug", "path", "git_repo_url", "created_at") select "project_id", "name", "slug", "path", "git_repo_url", "created_at" from "project";

drop table "project";

alter table "project_new" rename to "project";

create unique index "project_owner_slug" on "project" ("owner", "slug") where "slug" <> '';
