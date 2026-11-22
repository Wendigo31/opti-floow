-- Cartes carburant : relevés importés (AS24, DKV, Total, Shell, UTA…), comme dans OptiFret.
-- vehicle_id = identifiant du véhicule dans l'application (user_vehicles.local_id).
create table if not exists public.fuel_transactions (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  vehicle_id text,
  plate text,
  occurred_at timestamptz not null,
  product text,
  liters numeric(12,2),
  amount_ht numeric(12,2),
  amount_ttc numeric(12,2),
  station text,
  card text,
  mileage integer,
  source text,
  import_key text,
  created_at timestamptz not null default now()
);
create unique index if not exists fuel_transactions_dedup on public.fuel_transactions (license_id, import_key) where import_key is not null;
create index if not exists fuel_transactions_license_date on public.fuel_transactions (license_id, occurred_at desc);
alter table public.fuel_transactions enable row level security;
drop policy if exists fuel_transactions_own_license on public.fuel_transactions;
create policy fuel_transactions_own_license on public.fuel_transactions for all to authenticated
  using (license_id = public.get_user_license_id(auth.uid())) with check (license_id = public.get_user_license_id(auth.uid()));
