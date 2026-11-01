-- L'abonnement OptiGroup payé par la société est une charge fixe : il figure
-- d'office dans « Charges fixes » (ligne verrouillée, ni modifiable ni supprimable)
-- et entre donc dans tous les calculs de coût de revient et de rentabilité.
-- Montant = prix mensuel HT de la licence + options, réglés depuis OptiCentral.
-- Les synchronisations de l'application qui tenteraient de la modifier ou de la
-- supprimer sont ignorées sans erreur (pour ne pas bloquer le reste de l'envoi).

alter table public.user_charges add column if not exists is_system boolean not null default false;
create unique index if not exists user_charges_license_local_uniq on public.user_charges (license_id, local_id);

create or replace function public._sync_subscription_charge(p_license uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_price numeric; v_data jsonb;
begin
  select round((coalesce(base_monthly_price, 0) + coalesce(addons_monthly_total, 0))::numeric, 2)
    into v_price from public.licenses where id = p_license;
  if not found then return; end if;
  v_data := jsonb_build_object('id', 'optigroup-abonnement', 'name', 'Abonnement OptiGroup', 'amount', v_price,
                               'isHT', true, 'periodicity', 'monthly', 'category', 'administrative', 'system', true);
  perform set_config('optigroup.system_charge', 'on', true);
  insert into public.user_charges (user_id, license_id, local_id, name, amount, is_ht, periodicity, category, charge_data, is_system)
  values (p_license, p_license, 'optigroup-abonnement', 'Abonnement OptiGroup', v_price, true, 'monthly', 'administrative', v_data, true)
  on conflict (license_id, local_id) do update
     set name = excluded.name, amount = excluded.amount, is_ht = true, periodicity = 'monthly',
         category = 'administrative', charge_data = excluded.charge_data, is_system = true, updated_at = now();
  perform set_config('optigroup.system_charge', 'off', true);
end $$;
revoke all on function public._sync_subscription_charge(uuid) from public, anon, authenticated;

create or replace function public.user_charges_system_guard()
returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('optigroup.system_charge', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'INSERT' then
    if new.local_id = 'optigroup-abonnement' then return null; end if;
    new.is_system := false; return new;
  end if;
  if old.is_system then
    if tg_op = 'DELETE' and not exists (select 1 from public.licenses where id = old.license_id) then return old; end if;
    return null; -- ignoré : la ligne reste telle quelle
  end if;
  new.is_system := false;
  return new;
end $$;
drop trigger if exists user_charges_system_guard on public.user_charges;
create trigger user_charges_system_guard before insert or update or delete on public.user_charges
  for each row execute function public.user_charges_system_guard();

create or replace function public.licenses_subscription_charge()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._sync_subscription_charge(new.id);
  return null;
end $$;
drop trigger if exists licenses_subscription_charge on public.licenses;
create trigger licenses_subscription_charge after insert or update of base_monthly_price, addons_monthly_total on public.licenses
  for each row execute function public.licenses_subscription_charge();

do $$ declare r record; begin
  for r in select id from public.licenses loop perform public._sync_subscription_charge(r.id); end loop;
end $$;
