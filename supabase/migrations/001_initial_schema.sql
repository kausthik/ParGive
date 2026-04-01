-- ============================================================
-- ParGive — Complete Database Schema
-- Run this in your Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users. Created automatically on signup via trigger.

create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  email         text not null,
  full_name     text,
  avatar_url    text,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── CHARITIES ───────────────────────────────────────────────────────────────

create table public.charities (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text not null default '',
  image_url     text,
  website_url   text,
  is_featured   boolean not null default false,
  is_active     boolean not null default true,
  total_raised  numeric(12,2) not null default 0,
  member_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.charities enable row level security;

create policy "Anyone can view active charities"
  on public.charities for select
  using (is_active = true);

create policy "Admins can manage charities"
  on public.charities for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- Seed default charities
insert into public.charities (name, description, image_url, is_featured) values
  ('Greenfields Trust', 'Restoring natural habitats and green spaces across the UK through community-led conservation.', null, true),
  ('Caddie Care', 'Mental health support for junior and amateur golfers — because the course should be a safe space.', null, false),
  ('Drive for Education', 'Funding sports scholarships and physical education programmes for underprivileged schools.', null, false),
  ('Clear Fairways', 'Removing plastic waste from coastal golf courses and ocean-facing natural reserves.', null, false);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────

create type subscription_status as enum ('active', 'cancelled', 'lapsed', 'trialing');
create type subscription_plan   as enum ('monthly', 'yearly');

create table public.subscriptions (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id      text not null,
  stripe_subscription_id  text not null unique,
  plan                    subscription_plan not null,
  status                  subscription_status not null default 'trialing',
  charity_id              uuid references public.charities(id),
  charity_percentage      integer not null default 10 check (charity_percentage between 10 and 50),
  current_period_start    timestamptz not null,
  current_period_end      timestamptz not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Admins can view all subscriptions"
  on public.subscriptions for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (true)
  with check (true);

-- ─── SCORES ──────────────────────────────────────────────────────────────────

create table public.scores (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  value       integer not null check (value between 1 and 45),
  played_at   date not null,
  created_at  timestamptz not null default now()
);

alter table public.scores enable row level security;

create policy "Users can manage their own scores"
  on public.scores for all
  using (auth.uid() = user_id);

create policy "Admins can view all scores"
  on public.scores for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

create policy "Admins can update all scores"
  on public.scores for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- Function: enforce rolling 5-score rule
-- After a new score is inserted, delete excess scores (keep only latest 5)
create or replace function public.enforce_score_limit()
returns trigger as $$
declare
  score_count integer;
begin
  select count(*) into score_count
  from public.scores
  where user_id = new.user_id;

  if score_count > 5 then
    delete from public.scores
    where id in (
      select id from public.scores
      where user_id = new.user_id
      order by played_at asc, created_at asc
      limit (score_count - 5)
    );
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_score_limit_trigger
  after insert on public.scores
  for each row execute procedure public.enforce_score_limit();

-- ─── DRAWS ───────────────────────────────────────────────────────────────────

create type draw_status as enum ('pending', 'simulated', 'published', 'closed');

create table public.draws (
  id              uuid primary key default uuid_generate_v4(),
  month           text not null unique,       -- YYYY-MM
  draw_numbers    integer[] not null default '{}',
  draw_type       text not null default 'random' check (draw_type in ('random', 'algorithmic')),
  status          draw_status not null default 'pending',
  jackpot_amount  numeric(12,2) not null default 0,
  pool_match_5    numeric(12,2) not null default 0,
  pool_match_4    numeric(12,2) not null default 0,
  pool_match_3    numeric(12,2) not null default 0,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.draws enable row level security;

create policy "Anyone can view published draws"
  on public.draws for select
  using (status in ('published', 'closed'));

create policy "Admins can manage draws"
  on public.draws for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- ─── DRAW ENTRIES ────────────────────────────────────────────────────────────
-- Snapshot of each user's scores when a draw is run

create table public.draw_entries (
  id               uuid primary key default uuid_generate_v4(),
  draw_id          uuid not null references public.draws(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  scores_snapshot  integer[] not null,
  match_count      integer not null default 0,
  match_type       text check (match_type in ('match_3', 'match_4', 'match_5')),
  created_at       timestamptz not null default now(),
  unique (draw_id, user_id)
);

alter table public.draw_entries enable row level security;

create policy "Users can view their own draw entries"
  on public.draw_entries for select
  using (auth.uid() = user_id);

create policy "Admins can manage draw entries"
  on public.draw_entries for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- ─── WINNERS ─────────────────────────────────────────────────────────────────

create type winner_status  as enum ('pending_verification', 'approved', 'rejected', 'paid');
create type payment_status as enum ('pending', 'paid');

create table public.winners (
  id              uuid primary key default uuid_generate_v4(),
  draw_id         uuid not null references public.draws(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  draw_entry_id   uuid not null references public.draw_entries(id),
  match_type      text not null check (match_type in ('match_3', 'match_4', 'match_5')),
  prize_amount    numeric(12,2) not null,
  status          winner_status not null default 'pending_verification',
  proof_url       text,
  payment_status  payment_status not null default 'pending',
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.winners enable row level security;

create policy "Users can view their own winnings"
  on public.winners for select
  using (auth.uid() = user_id);

create policy "Users can upload proof"
  on public.winners for update
  using (auth.uid() = user_id);

create policy "Admins can manage winners"
  on public.winners for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ));

-- ─── STORAGE BUCKETS ─────────────────────────────────────────────────────────
-- Run these in Supabase dashboard → Storage → New bucket

-- Winner proofs bucket (private — only visible to uploader and admins)
-- Name: winner-proofs
-- Public: false

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index idx_scores_user_played on public.scores(user_id, played_at desc);
create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_draw_entries_draw on public.draw_entries(draw_id);
create index idx_draw_entries_user on public.draw_entries(user_id);
create index idx_winners_user on public.winners(user_id);
create index idx_winners_draw on public.winners(draw_id);

-- ─── VIEWS ───────────────────────────────────────────────────────────────────

-- Active subscriber count (for prize pool calculation)
create view public.active_subscriber_count as
  select count(*) as count, sum(
    case plan
      when 'monthly' then 9.99
      when 'yearly'  then 89.99 / 12.0
    end
  ) as monthly_revenue
  from public.subscriptions
  where status = 'active';

-- User draw summary
create view public.user_draw_summary as
  select
    de.user_id,
    de.draw_id,
    de.scores_snapshot,
    de.match_count,
    de.match_type,
    d.draw_numbers,
    d.month,
    d.status as draw_status
  from public.draw_entries de
  join public.draws d on d.id = de.draw_id;
