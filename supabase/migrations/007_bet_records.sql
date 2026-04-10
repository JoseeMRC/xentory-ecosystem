-- ─────────────────────────────────────────────────────────────────────────────
-- 007  Bet records — registro personal de apuestas por usuario
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.bet_records (
  id           uuid          default gen_random_uuid() primary key,
  user_id      uuid          references auth.users(id) on delete cascade not null,
  created_at   timestamptz   default now() not null,
  match_name   text          not null,
  competition  text,
  bet_type     text          not null,
  selection    text          not null,
  bookmaker    text          not null default 'Bet365',
  odds         numeric(8,2)  not null check (odds > 1),
  stake        numeric(10,2) not null check (stake > 0),
  status       text          not null default 'pending'
               check (status in ('pending', 'won', 'lost', 'void')),
  notes        text
);

-- Row-level security: each user only sees their own records
alter table public.bet_records enable row level security;

create policy "Users manage their own bet records"
  on public.bet_records for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index if not exists bet_records_user_id_idx   on public.bet_records (user_id);
create index if not exists bet_records_created_at_idx on public.bet_records (created_at desc);
