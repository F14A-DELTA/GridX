-- GridX MVP trading desk tables (organisation shared)
-- Run in Supabase SQL editor after gridx_mvp_auth.sql
-- This migration expects clients to send:
--   x-gridx-org-id, x-gridx-user-id, x-gridx-role headers.

create table if not exists public.gridx_trades (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.gridx_organisations(id) on delete cascade,
  author_user_id uuid not null references public.gridx_users(id) on delete cascade,
  state text not null,
  side text check (side in ('buy', 'sell')) not null,
  quantity_mwh numeric not null check (quantity_mwh > 0),
  entry_price numeric not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  remaining_quantity_mwh numeric not null default 0 check (remaining_quantity_mwh >= 0),
  close_price numeric,
  closed_at timestamptz,
  realised_pnl numeric default 0,
  unrealised_pnl_snapshot numeric default 0,
  created_at timestamptz default now()
);

alter table public.gridx_trades
  add column if not exists status text not null default 'open';
alter table public.gridx_trades
  add column if not exists remaining_quantity_mwh numeric not null default 0;
alter table public.gridx_trades
  add column if not exists close_price numeric;
alter table public.gridx_trades
  add column if not exists closed_at timestamptz;
alter table public.gridx_trades
  add column if not exists realised_pnl numeric default 0;
alter table public.gridx_trades
  add column if not exists unrealised_pnl_snapshot numeric default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gridx_trades_status_check'
  ) then
    alter table public.gridx_trades
      add constraint gridx_trades_status_check
      check (status in ('open', 'closed'));
  end if;
end $$;

create table if not exists public.gridx_trade_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.gridx_organisations(id) on delete cascade,
  author_user_id uuid not null references public.gridx_users(id) on delete cascade,
  state text,
  note_text text not null,
  created_at timestamptz default now()
);

alter table public.gridx_trade_notes
  add column if not exists state text;

create table if not exists public.gridx_trade_activity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.gridx_organisations(id) on delete cascade,
  author_user_id uuid not null references public.gridx_users(id) on delete cascade,
  state text,
  activity_type text check (activity_type in ('trade_placed', 'trade_closed', 'note_added', 'member_updated')) not null,
  message text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.gridx_trade_activity
  add column if not exists state text;
alter table public.gridx_trade_activity
  add column if not exists payload jsonb default '{}'::jsonb;

create table if not exists public.gridx_trade_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.gridx_organisations(id) on delete cascade,
  trade_id uuid not null references public.gridx_trades(id) on delete cascade,
  author_user_id uuid not null references public.gridx_users(id) on delete cascade,
  state text not null,
  event_type text not null check (event_type in ('placed', 'closed')),
  side text not null check (side in ('buy', 'sell')),
  quantity_mwh numeric not null check (quantity_mwh > 0),
  price numeric not null,
  realised_pnl numeric default 0,
  created_at timestamptz default now()
);

create table if not exists public.gridx_order_book_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.gridx_organisations(id) on delete cascade,
  author_user_id uuid not null references public.gridx_users(id) on delete cascade,
  state text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity_mwh numeric not null check (quantity_mwh > 0),
  price numeric not null,
  created_at timestamptz default now()
);

create index if not exists idx_gridx_trades_org_state_created
  on public.gridx_trades(org_id, state, created_at desc);
create index if not exists idx_gridx_trade_notes_org_state_created
  on public.gridx_trade_notes(org_id, state, created_at desc);
create index if not exists idx_gridx_trade_activity_org_state_created
  on public.gridx_trade_activity(org_id, state, created_at desc);
create index if not exists idx_gridx_trade_events_org_state_created
  on public.gridx_trade_events(org_id, state, created_at desc);
create index if not exists idx_gridx_order_book_org_state_created
  on public.gridx_order_book_events(org_id, state, created_at desc);

create or replace function public.gridx_request_org_id()
returns uuid
language sql
stable
as $$
  select nullif(
    ((current_setting('request.headers', true))::jsonb ->> 'x-gridx-org-id'),
    ''
  )::uuid
$$;

create or replace function public.gridx_request_user_id()
returns uuid
language sql
stable
as $$
  select nullif(
    ((current_setting('request.headers', true))::jsonb ->> 'x-gridx-user-id'),
    ''
  )::uuid
$$;

create or replace function public.gridx_request_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(((current_setting('request.headers', true))::jsonb ->> 'x-gridx-role'), ''),
    'member'
  )
$$;

alter table public.gridx_trades enable row level security;
alter table public.gridx_trade_notes enable row level security;
alter table public.gridx_trade_activity enable row level security;
alter table public.gridx_trade_events enable row level security;
alter table public.gridx_order_book_events enable row level security;

drop policy if exists "gridx_trades_org_policy" on public.gridx_trades;
create policy "gridx_trades_org_policy"
  on public.gridx_trades for all
  using (org_id = public.gridx_request_org_id())
  with check (
    org_id = public.gridx_request_org_id()
    and author_user_id = public.gridx_request_user_id()
  );

drop policy if exists "gridx_trade_notes_org_policy" on public.gridx_trade_notes;
create policy "gridx_trade_notes_org_policy"
  on public.gridx_trade_notes for all
  using (org_id = public.gridx_request_org_id())
  with check (
    org_id = public.gridx_request_org_id()
    and author_user_id = public.gridx_request_user_id()
  );

drop policy if exists "gridx_trade_activity_org_policy" on public.gridx_trade_activity;
create policy "gridx_trade_activity_org_policy"
  on public.gridx_trade_activity for all
  using (org_id = public.gridx_request_org_id())
  with check (
    org_id = public.gridx_request_org_id()
    and author_user_id = public.gridx_request_user_id()
  );

drop policy if exists "gridx_trade_events_org_policy" on public.gridx_trade_events;
create policy "gridx_trade_events_org_policy"
  on public.gridx_trade_events for all
  using (org_id = public.gridx_request_org_id())
  with check (
    org_id = public.gridx_request_org_id()
    and author_user_id = public.gridx_request_user_id()
  );

drop policy if exists "gridx_order_book_org_policy" on public.gridx_order_book_events;
create policy "gridx_order_book_org_policy"
  on public.gridx_order_book_events for all
  using (org_id = public.gridx_request_org_id())
  with check (
    org_id = public.gridx_request_org_id()
    and author_user_id = public.gridx_request_user_id()
  );
