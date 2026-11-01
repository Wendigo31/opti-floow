-- Grilles tarifaires par client (une par client) : le prix calculé est proposé
-- sur les devis et les factures. Lecture et écriture par les membres de la
-- société. Fichier partagé (bridge/shared/pricing) — license_id = public.get_user_license_id(auth.uid()) = test d'appartenance.
create table if not exists public.client_rate_cards (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  client_id text not null,
  card jsonb not null,
  updated_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (license_id, client_id)
);
alter table public.client_rate_cards enable row level security;
drop policy if exists rate_cards_members on public.client_rate_cards;
create policy rate_cards_members on public.client_rate_cards for all to authenticated
  using (license_id = public.get_user_license_id(auth.uid())) with check (license_id = public.get_user_license_id(auth.uid()));
