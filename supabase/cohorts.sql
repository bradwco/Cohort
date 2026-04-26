create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 64),
  invite_code text not null unique check (invite_code ~ '^[A-Z2-9]{6}$'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cohort_members (
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

create index if not exists cohort_members_user_id_idx on public.cohort_members(user_id);
create index if not exists cohort_members_cohort_id_idx on public.cohort_members(cohort_id);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, receiver_id),
  check (requester_id <> receiver_id)
);

create index if not exists friend_requests_receiver_status_idx
on public.friend_requests(receiver_id, status);

create index if not exists friend_requests_requester_status_idx
on public.friend_requests(requester_id, status);

-- Note: the current Electron main process talks to Supabase with the anon key
-- and passes user_id over IPC. Leave RLS disabled for parity with the existing
-- profiles/friendships/sessions access pattern. When Cohort gets a real backend
-- service or authenticated renderer-side DB calls, enable RLS and replace this
-- with auth.uid()-scoped policies.
