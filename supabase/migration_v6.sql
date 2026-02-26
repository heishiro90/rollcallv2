-- ============================================
-- MIGRATION V6: Avatar URL, weight goal, event position
-- Run in Supabase SQL Editor
-- ============================================

-- Avatar URL on profiles
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'avatar_url') then
    alter table public.profiles add column avatar_url text;
  end if;
end $$;

-- Position field on round_events (from which position)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'round_events' and column_name = 'position') then
    alter table public.round_events add column position text;
  end if;
end $$;

-- Weight goal
create table if not exists public.weight_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  target_kg numeric(5,1) not null,
  target_date date,
  created_at timestamptz default now()
);
alter table public.weight_goals enable row level security;
create policy "wg_select" on public.weight_goals for select using (auth.uid() = user_id);
create policy "wg_insert" on public.weight_goals for insert with check (auth.uid() = user_id);
create policy "wg_update" on public.weight_goals for update using (auth.uid() = user_id);
create policy "wg_delete" on public.weight_goals for delete using (auth.uid() = user_id);
