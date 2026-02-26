-- ============================================
-- MIGRATION V3: Round events (multiple per round)
-- Run this in Supabase SQL Editor
-- ============================================

create table if not exists public.round_events (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.rounds(id) on delete cascade not null,
  checkin_id uuid references public.checkins(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  gym_id uuid references public.gyms(id) on delete cascade not null,
  event_type text not null check (event_type in ('submission','sweep','pass','takedown','escape')),
  direction text not null check (direction in ('offensive','defensive')),
  technique text not null,
  created_at timestamptz default now()
);

alter table public.round_events enable row level security;
create policy "round_events_select" on public.round_events for select using (auth.uid() = user_id);
create policy "round_events_insert" on public.round_events for insert with check (auth.uid() = user_id);
create policy "round_events_delete" on public.round_events for delete using (auth.uid() = user_id);
