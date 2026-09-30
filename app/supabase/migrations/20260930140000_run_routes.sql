-- N-0042: run sessions, route points, and a home privacy point.
-- Points inside 200 m of the saved home are not inserted by the client.
-- 200 m is a privacy radius, not a training-load constant.

create table if not exists public.run_homes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.run_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  training_session_id uuid references public.training_sessions (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.run_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  run_session_id uuid not null references public.run_sessions (id) on delete cascade,
  recorded_at timestamptz not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m double precision
);

create index if not exists run_sessions_user_id_idx on public.run_sessions (user_id);
create index if not exists run_sessions_training_session_id_idx on public.run_sessions (training_session_id);
create index if not exists run_routes_user_id_idx on public.run_routes (user_id);
create index if not exists run_routes_run_session_id_idx on public.run_routes (run_session_id);

alter table public.run_homes enable row level security;
alter table public.run_sessions enable row level security;
alter table public.run_routes enable row level security;

create policy "Users can view own run home"
  on public.run_homes for select
  using (auth.uid() = user_id);
create policy "Users can insert own run home"
  on public.run_homes for insert
  with check (auth.uid() = user_id);
create policy "Users can update own run home"
  on public.run_homes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own run home"
  on public.run_homes for delete
  using (auth.uid() = user_id);

create policy "Users can view own run sessions"
  on public.run_sessions for select
  using (auth.uid() = user_id);
create policy "Users can insert own run sessions"
  on public.run_sessions for insert
  with check (auth.uid() = user_id);
create policy "Users can update own run sessions"
  on public.run_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own run sessions"
  on public.run_sessions for delete
  using (auth.uid() = user_id);

create policy "Users can view own run routes"
  on public.run_routes for select
  using (auth.uid() = user_id);
create policy "Users can insert own run routes"
  on public.run_routes for insert
  with check (auth.uid() = user_id);
create policy "Users can update own run routes"
  on public.run_routes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Users can delete own run routes"
  on public.run_routes for delete
  using (auth.uid() = user_id);
