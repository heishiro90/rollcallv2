-- ============================================
-- MIGRATION V5: Weight, injuries, opponents, auto-goals
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. WEIGHT LOG
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  weight_kg numeric(5,1) not null,
  logged_at date not null default current_date,
  created_at timestamptz default now()
);
alter table public.weight_logs enable row level security;
create policy "weight_select" on public.weight_logs for select using (auth.uid() = user_id);
create policy "weight_insert" on public.weight_logs for insert with check (auth.uid() = user_id);
create policy "weight_delete" on public.weight_logs for delete using (auth.uid() = user_id);

-- 2. INJURIES
create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  checkin_id uuid references public.checkins(id) on delete set null,
  body_part text not null,
  injury_type text not null,
  severity text not null default 'minor' check (severity in ('minor','moderate','serious')),
  notes text,
  started_at date not null default current_date,
  resolved_at date,
  created_at timestamptz default now()
);
alter table public.injuries enable row level security;
create policy "injuries_select" on public.injuries for select using (auth.uid() = user_id);
create policy "injuries_insert" on public.injuries for insert with check (auth.uid() = user_id);
create policy "injuries_update" on public.injuries for update using (auth.uid() = user_id);
create policy "injuries_delete" on public.injuries for delete using (auth.uid() = user_id);

-- 3. ADD OPPONENT TO ROUNDS
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'rounds' and column_name = 'opponent_id') then
    alter table public.rounds add column opponent_id uuid references public.profiles(id) on delete set null;
  end if;
end $$;

-- 4. UPGRADE GOALS - add auto-tracking fields
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'goals' and column_name = 'goal_type') then
    alter table public.goals add column goal_type text default 'manual' check (goal_type in ('manual','mat_hours','sessions','rounds','submissions','techniques'));
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'goals' and column_name = 'target_value') then
    alter table public.goals add column target_value numeric;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'goals' and column_name = 'period') then
    alter table public.goals add column period text default 'all' check (period in ('week','month','semester','year','all'));
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'goals' and column_name = 'technique_filter') then
    alter table public.goals add column technique_filter text;
  end if;
end $$;

-- 5. ALLOW DELETING CHECKINS
create policy "checkins_delete" on public.checkins for delete using (auth.uid() = user_id);
