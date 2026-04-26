-- Cohort: screen_classifications table.
-- The Electron overlay (overlay_standalone/main.cjs) inserts one row per
-- screenshot it classifies; the agent's tool registry reads from this.

create extension if not exists "pgcrypto";

create table if not exists screen_classifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  session_id      uuid references sessions(id) on delete set null,
  captured_at     timestamptz not null default now(),
  storage_path    text not null,
  classification  text not null,
  confidence      real,
  metadata        jsonb not null default '{}'::jsonb
);

create index if not exists idx_screen_classifications_user_captured
  on screen_classifications (user_id, captured_at desc);

create index if not exists idx_screen_classifications_session
  on screen_classifications (session_id)
  where session_id is not null;

alter table screen_classifications enable row level security;

drop policy if exists "users read own rows" on screen_classifications;
create policy "users read own rows"
  on screen_classifications
  for select
  using (auth.uid() = user_id);

-- Inserts only via the service-role key (overlay uploader + agent service).
-- No anon-role insert policy is created intentionally.
