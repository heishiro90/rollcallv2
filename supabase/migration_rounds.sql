-- ============================================
-- MIGRATION: Add rounds table
-- Run this in Supabase SQL Editor
-- ============================================

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid references public.checkins(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete cascade not null,
  round_number int not null default 1,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int generated always as (
    case when ended_at is not null
      then extract(epoch from (ended_at - started_at))::int
      else null
    end
  ) stored,
  created_at timestamptz default now()
);

alter table public.rounds enable row level security;

create policy "rounds_select_own" on public.rounds
  for select using (auth.uid() = user_id);

create policy "rounds_select_gym" on public.rounds
  for select using (
    gym_id in (select gym_id from public.gym_members where user_id = auth.uid())
  );

create policy "rounds_insert" on public.rounds
  for insert with check (auth.uid() = user_id);

create policy "rounds_update" on public.rounds
  for update using (auth.uid() = user_id);
