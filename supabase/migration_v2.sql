-- ============================================
-- MIGRATION V2: New tables for dashboard
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. TECHNIQUES DRILLED (per session)
create table if not exists public.techniques (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid references public.checkins(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('guard','passing','takedown','submission','escape','sweep','other')),
  created_at timestamptz default now()
);

alter table public.techniques enable row level security;
create policy "techniques_select" on public.techniques for select using (auth.uid() = user_id);
create policy "techniques_insert" on public.techniques for insert with check (auth.uid() = user_id);
create policy "techniques_delete" on public.techniques for delete using (auth.uid() = user_id);

-- 2. GOALS
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete cascade not null,
  title text not null,
  progress int not null default 0 check (progress between 0 and 100),
  completed boolean default false,
  created_at timestamptz default now()
);

alter table public.goals enable row level security;
create policy "goals_select" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update" on public.goals for update using (auth.uid() = user_id);
create policy "goals_delete" on public.goals for delete using (auth.uid() = user_id);

-- 3. BELT HISTORY (manual promotions)
create table if not exists public.belt_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  belt text not null check (belt in ('white','blue','purple','brown','black')),
  stripes int not null default 0,
  promoted_at date not null,
  created_at timestamptz default now()
);

alter table public.belt_history enable row level security;
create policy "belt_history_select" on public.belt_history for select using (auth.uid() = user_id);
create policy "belt_history_insert" on public.belt_history for insert with check (auth.uid() = user_id);
create policy "belt_history_delete" on public.belt_history for delete using (auth.uid() = user_id);

-- 4. ADD SUBMISSION FIELD TO ROUNDS (if rounds table exists)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'rounds' and column_name = 'result') then
    alter table public.rounds add column result text check (result in ('sweep','submission','got_swept','got_submitted','positional',null));
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'rounds' and column_name = 'submission_name') then
    alter table public.rounds add column submission_name text;
  end if;
end $$;
