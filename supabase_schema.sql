-- ============================================================
-- ROKDIV Egg Tracker — Supabase Schema (v3 — with partial payments)
-- Run this in your Supabase project → SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Sales ──────────────────────────────────────────────────
create table if not exists sales (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  date            date not null,
  customer_name   text not null,
  crates          integer not null default 0,
  singles         integer not null default 0,
  amount          numeric(12,2) not null default 0,
  payment_status  text not null check (payment_status in ('Paid','Credit')) default 'Paid',
  paid_at         date,
  crates_loaned   integer not null default 0,
  crates_returned integer not null default 0,
  notes           text,
  created_at      timestamptz default now()
);

-- ── Payments (partial payments against credit sales) ───────
create table if not exists payments (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  sale_id    uuid references sales(id) on delete cascade not null,
  amount     numeric(12,2) not null,
  date       date not null,
  notes      text,
  created_at timestamptz default now()
);

-- ── Collections ────────────────────────────────────────────
create table if not exists collections (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       date not null,
  crates     integer not null default 0,
  singles    integer not null default 0,
  notes      text,
  created_at timestamptz default now()
);

-- ── Crate Inventory ────────────────────────────────────────
create table if not exists crate_inventory (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  total_owned integer not null default 0,
  updated_at  timestamptz default now()
);

-- ── Row Level Security ─────────────────────────────────────
alter table sales           enable row level security;
alter table payments        enable row level security;
alter table collections     enable row level security;
alter table crate_inventory enable row level security;

create policy "sales_owner"           on sales            for all using (auth.uid() = user_id);
create policy "payments_owner"        on payments         for all using (auth.uid() = user_id);
create policy "collections_owner"     on collections      for all using (auth.uid() = user_id);
create policy "crate_inventory_owner" on crate_inventory  for all using (auth.uid() = user_id);

-- ── Indexes ────────────────────────────────────────────────
create index if not exists sales_user_date       on sales(user_id, date desc);
create index if not exists payments_sale         on payments(sale_id);
create index if not exists collections_user_date on collections(user_id, date desc);

-- ── Realtime: enable in Dashboard → Database → Replication ─
--   toggle on: sales, payments, collections, crate_inventory
