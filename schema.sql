-- =====================================================================
-- COMMAND CENTER — SUPABASE SCHEMA
-- Paste this entire file into the Supabase SQL Editor and click "Run"
-- =====================================================================

-- 1. Schedule blocks (hour-by-hour for each day)
create table if not exists schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  label text not null default '',
  position int not null default 0,
  created_at timestamptz default now()
);
create index if not exists schedule_blocks_user_date_idx on schedule_blocks(user_id, date);

-- 2. Tasks (the to-do list under the schedule)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  title text not null,
  completed boolean default false,
  estimated_minutes int,
  actual_minutes int,
  category text,
  position int not null default 0,
  from_idea_id uuid,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists tasks_user_date_idx on tasks(user_id, date);

-- Migration for existing databases (safe to run repeatedly):
alter table tasks add column if not exists category text;

-- 3. Ideas (the inbox with 7-day expiration)
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  first_action text,
  status text not null default 'fresh',
  scheduled_for date,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz default now()
);
create index if not exists ideas_user_status_idx on ideas(user_id, status);

-- 4. Morning anchor entries (one per day)
create table if not exists morning_anchors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  feeling text,
  win text,
  focus text,
  completed_at timestamptz default now(),
  unique(user_id, date)
);

-- 5. North stars (90-day goals per business, fully editable)
create table if not exists north_stars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  business text not null,
  goal text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

-- 6. Streak tracking (single row per user)
create table if not exists streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int default 0,
  longest_streak int default 0,
  last_shipped_date date
);

-- =====================================================================
-- ROW LEVEL SECURITY — each user can only see/edit their own data
-- =====================================================================
alter table schedule_blocks enable row level security;
alter table tasks enable row level security;
alter table ideas enable row level security;
alter table morning_anchors enable row level security;
alter table north_stars enable row level security;
alter table streaks enable row level security;

-- Policies (one per table covering all operations)
create policy "own schedule_blocks" on schedule_blocks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ideas" on ideas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own morning_anchors" on morning_anchors for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own north_stars" on north_stars for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own streaks" on streaks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
