-- Vocab Blaster initial schema
-- Run in the Supabase SQL Editor or via: supabase db push

-- ============================================================
-- PROFILES (extends Supabase Auth users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- QUIZZES
-- ============================================================
create table public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  root_info     text not null default '',
  words         jsonb not null default '[]',  -- VocabWord[]
  source_file_name text,
  created_at    timestamptz not null default now()
);

-- Fast lookup of a user's quizzes by recency
create index idx_quizzes_user_created
  on public.quizzes (user_id, created_at desc);

-- ============================================================
-- QUIZ STATS (best score, streak, play count per quiz)
-- ============================================================
create table public.quiz_stats (
  quiz_id      uuid primary key references public.quizzes(id) on delete cascade,
  best_score   integer not null default 0,  -- percentage 0-100
  games_played integer not null default 0,
  best_streak  integer not null default 0,
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles  enable row level security;
alter table public.quizzes   enable row level security;
alter table public.quiz_stats enable row level security;

-- Profiles: own row only
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Quizzes: own rows only
create policy "Users can view own quizzes"
  on public.quizzes for select
  using (auth.uid() = user_id);

create policy "Users can insert own quizzes"
  on public.quizzes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own quizzes"
  on public.quizzes for update
  using (auth.uid() = user_id);

create policy "Users can delete own quizzes"
  on public.quizzes for delete
  using (auth.uid() = user_id);

-- Quiz stats: accessible if the user owns the parent quiz
create policy "Users can view own quiz stats"
  on public.quiz_stats for select
  using (
    exists (
      select 1 from public.quizzes
      where quizzes.id = quiz_stats.quiz_id
        and quizzes.user_id = auth.uid()
    )
  );

create policy "Users can insert own quiz stats"
  on public.quiz_stats for insert
  with check (
    exists (
      select 1 from public.quizzes
      where quizzes.id = quiz_stats.quiz_id
        and quizzes.user_id = auth.uid()
    )
  );

create policy "Users can update own quiz stats"
  on public.quiz_stats for update
  using (
    exists (
      select 1 from public.quizzes
      where quizzes.id = quiz_stats.quiz_id
        and quizzes.user_id = auth.uid()
    )
  );
