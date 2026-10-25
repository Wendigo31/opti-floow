-- OptiFlow : licence de l'utilisateur connecté par email + mot de passe
-- (même contenu que la réponse de validate-license). Rejouable sans risque.
create or replace function public.flow_license_payload(p_license_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cu public.company_users;
  l public.licenses;
  f jsonb;
begin
  select * into v_cu from public.company_users
   where license_id = p_license_id and user_id = auth.uid() and coalesce(is_active, true) limit 1;
  if v_cu.id is null then raise exception 'Accès refusé' using errcode = '42501'; end if;
  select * into l from public.licenses where id = p_license_id;
  if not l.is_active then raise exception 'Licence désactivée' using errcode = '42501'; end if;
  select to_jsonb(x) - 'id' - 'license_id' - 'created_at' - 'updated_at' into f from public.license_features x where x.license_id = p_license_id;
  return jsonb_build_object(
    'license', jsonb_build_object(
      'id', l.id, 'code', l.license_code, 'email', l.email, 'firstName', l.first_name, 'lastName', l.last_name,
      'companyName', l.company_name, 'siren', l.siren, 'companyStatus', l.company_status, 'employeeCount', l.employee_count,
      'address', l.address, 'city', l.city, 'postalCode', l.postal_code, 'activatedAt', coalesce(l.activated_at, now()),
      'maxDrivers', l.max_drivers, 'maxClients', l.max_clients, 'maxDailyCharges', l.max_daily_charges,
      'maxMonthlyCharges', l.max_monthly_charges, 'maxYearlyCharges', l.max_yearly_charges,
      'showUserInfo', coalesce(l.show_user_info, true), 'showCompanyInfo', coalesce(l.show_company_info, true),
      'showAddressInfo', coalesce(l.show_address_info, true), 'showLicenseInfo', coalesce(l.show_license_info, true)),
    'features', coalesce(f, '{}'::jsonb),
    'company_user', jsonb_build_object('id', v_cu.id, 'role', v_cu.role, 'email', v_cu.email,
      'must_change_password', v_cu.must_change_password),
    'overrides', coalesce((select jsonb_agg(jsonb_build_object('feature_key', o.feature_key, 'enabled', o.enabled))
                           from public.user_feature_overrides o where o.company_user_id = v_cu.id), '[]'::jsonb));
end;
$$;
revoke all on function public.flow_license_payload(uuid) from public, anon;
grant execute on function public.flow_license_payload(uuid) to authenticated;
