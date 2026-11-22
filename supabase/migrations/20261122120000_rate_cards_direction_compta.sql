-- Grilles tarifaires clients : lecture par tous les membres de la société,
-- modification par la Direction et la Comptabilité seulement.
drop policy if exists rate_cards_members on public.client_rate_cards;
drop policy if exists rate_cards_read on public.client_rate_cards;
drop policy if exists rate_cards_write on public.client_rate_cards;
create policy rate_cards_read on public.client_rate_cards for select to authenticated
  using (license_id = public.get_user_license_id(auth.uid()));
create policy rate_cards_write on public.client_rate_cards for all to authenticated
  using (license_id = public.get_user_license_id(auth.uid()) and exists (
    select 1 from public.company_users cu
     where cu.license_id = client_rate_cards.license_id and cu.user_id = auth.uid()
       and coalesce(cu.is_active, true) and cu.role::text in ('direction', 'comptabilite')))
  with check (license_id = public.get_user_license_id(auth.uid()) and exists (
    select 1 from public.company_users cu
     where cu.license_id = client_rate_cards.license_id and cu.user_id = auth.uid()
       and coalesce(cu.is_active, true) and cu.role::text in ('direction', 'comptabilite')));
