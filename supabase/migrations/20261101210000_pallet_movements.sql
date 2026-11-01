-- Gestion des palettes échangées (palettes Europe et autres) : chaque mouvement
-- note les palettes laissées chez un client et celles récupérées. Le solde par
-- client dit qui doit des palettes à qui. Saisie au bureau ou par le conducteur.
-- Fichier partagé (bridge/shared/pallets) — license_id = public.get_user_license_id(auth.uid()) = test d'appartenance.
create table if not exists public.pallet_movements (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  client_id text not null,
  site text,
  movement_date date not null default (now() at time zone 'Europe/Paris')::date,
  pallet_type text not null default 'EUR',
  given integer not null default 0 check (given >= 0),
  returned integer not null default 0 check (returned >= 0),
  reference text,
  source text not null default 'bureau' check (source in ('bureau', 'conducteur')),
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (given > 0 or returned > 0)
);
create index if not exists pallet_movements_client_idx on public.pallet_movements (license_id, client_id, movement_date desc);
alter table public.pallet_movements enable row level security;
drop policy if exists pallet_movements_members on public.pallet_movements;
create policy pallet_movements_members on public.pallet_movements for all to authenticated
  using (license_id = public.get_user_license_id(auth.uid())) with check (license_id = public.get_user_license_id(auth.uid()));
