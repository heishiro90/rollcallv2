-- ============================================
-- MIGRATION V4: Coach curriculum system
-- Run this in Supabase SQL Editor
-- ============================================

-- Coach posts what was taught per class
create table if not exists public.class_curriculum (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id) on delete cascade not null,
  posted_by uuid references public.profiles(id) on delete cascade not null,
  class_date date not null,
  start_time time not null,
  end_time time not null,
  session_type text not null default 'gi' check (session_type in ('gi','nogi','open_mat')),
  title text,
  created_at timestamptz default now()
);

alter table public.class_curriculum enable row level security;
create policy "curriculum_select" on public.class_curriculum for select using (
  gym_id in (select gym_id from public.gym_members where user_id = auth.uid())
);
create policy "curriculum_insert" on public.class_curriculum for insert with check (
  gym_id in (select gym_id from public.gym_members where user_id = auth.uid() and role in ('owner','admin'))
);
create policy "curriculum_update" on public.class_curriculum for update using (
  gym_id in (select gym_id from public.gym_members where user_id = auth.uid() and role in ('owner','admin'))
);
create policy "curriculum_delete" on public.class_curriculum for delete using (
  gym_id in (select gym_id from public.gym_members where user_id = auth.uid() and role in ('owner','admin'))
);

-- Techniques within a class
create table if not exists public.curriculum_techniques (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid references public.class_curriculum(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('guard','passing','takedown','submission','escape','sweep','other')),
  youtube_url text,
  position_from text,
  position_to text,
  created_at timestamptz default now()
);

alter table public.curriculum_techniques enable row level security;
create policy "curr_tech_select" on public.curriculum_techniques for select using (
  curriculum_id in (select id from public.class_curriculum where gym_id in (select gym_id from public.gym_members where user_id = auth.uid()))
);
create policy "curr_tech_insert" on public.curriculum_techniques for insert with check (
  curriculum_id in (select id from public.class_curriculum where gym_id in (select gym_id from public.gym_members where user_id = auth.uid() and role in ('owner','admin')))
);
create policy "curr_tech_delete" on public.curriculum_techniques for delete using (
  curriculum_id in (select id from public.class_curriculum where gym_id in (select gym_id from public.gym_members where user_id = auth.uid() and role in ('owner','admin')))
);
