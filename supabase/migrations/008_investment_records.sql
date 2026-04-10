-- ─────────────────────────────────────────────────────────────────────────────
-- 008  Investment records — registro de operaciones de inversión por usuario
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.investment_records (
  id           uuid           default gen_random_uuid() primary key,
  user_id      uuid           references auth.users(id) on delete cascade not null,
  created_at   timestamptz    default now() not null,

  -- ── Activo ──────────────────────────────────────────────────────────────
  asset_name   text           not null,               -- "AAPL", "BTC/USD", "IBEX 35 ETF"
  asset_type   text           not null,               -- Acción, Crypto, ETF, Fondo, Forex, Materia Prima, Otro
  ticker       text,                                  -- símbolo opcional  "AAPL", "BTC"

  -- ── Operación ────────────────────────────────────────────────────────────
  direction    text           not null default 'long'
               check (direction in ('long', 'short')),
  quantity     numeric(18,6)  not null check (quantity > 0),
  entry_price  numeric(18,6)  not null check (entry_price > 0),
  exit_price   numeric(18,6),                         -- null = posición abierta
  date_opened  date           not null default current_date,
  date_closed  date,

  -- ── Estado ───────────────────────────────────────────────────────────────
  status       text           not null default 'open'
               check (status in ('open', 'closed', 'partial')),
  fees         numeric(12,4)  not null default 0,
  notes        text
);

-- Row-level security: cada usuario solo ve sus propias operaciones
alter table public.investment_records enable row level security;

create policy "Users manage their own investment records"
  on public.investment_records for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Índices
create index if not exists investment_records_user_id_idx     on public.investment_records (user_id);
create index if not exists investment_records_created_at_idx  on public.investment_records (created_at desc);
create index if not exists investment_records_status_idx      on public.investment_records (user_id, status);
