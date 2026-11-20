-- Stock de palettes de la société (par type), pour savoir combien sont au dépôt,
-- combien sont chez les clients (dues) et combien on doit rendre.
create table if not exists public.pallet_stock (
  license_id uuid not null,
  pallet_type text not null,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (license_id, pallet_type)
);
alter table public.pallet_stock enable row level security;
drop policy if exists pallet_stock_members on public.pallet_stock;
create policy pallet_stock_members on public.pallet_stock for all
  using (license_id = get_user_license_id(auth.uid()))
  with check (license_id = get_user_license_id(auth.uid()));
grant select, insert, update, delete on public.pallet_stock to authenticated;
