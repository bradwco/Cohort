alter table public.sessions
  add column if not exists productive_duration_seconds integer not null default 0,
  add column if not exists distracted_duration_seconds integer not null default 0,
  add column if not exists distracted_occurrences integer not null default 0,
  add column if not exists idle_duration_seconds integer not null default 0,
  add column if not exists idle_occurrences integer not null default 0,
  add column if not exists phone_lift_count integer not null default 0,
  add column if not exists total_work_duration_seconds integer not null default 0;
