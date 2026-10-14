create table "metric_entry" ("metric_id" integer primary key autoincrement, "project_id" text not null, "run" text not null, "source" text not null, "kind" text not null, "at" integer not null, "wire_type" text, "wire_id" text, "trace" text, "outcome" text, "duration_ms" integer, "function_ms" integer, "http_method" text, "http_path" text, "http_status" integer, "error_name" text, "error_message" text, "tenant_user_id" text, "tenant_org_id" text, "command" text, "cpu_usage_us" integer, "cpu_pct" real, "mem_mb" real, "heap_mb" real, "loop_lag_ms" real);

create index "metric_entry_project_at" on "metric_entry" ("project_id", "at" desc);

create index "metric_entry_project_kind_at" on "metric_entry" ("project_id", "kind", "at" desc);

create index "metric_entry_project_wire" on "metric_entry" ("project_id", "wire_id", "at" desc);

create index "metric_entry_project_outcome" on "metric_entry" ("project_id", "outcome", "at" desc);
