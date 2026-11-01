-- Facturation OptiFlow : facture mensuelle par donneur d'ordre, construite à partir
-- des tournées réalisées (planning) et des trajets. Mêmes règles que OptiFret et
-- OptiXpress :
-- - un brouillon n'a pas de numéro ; le numéro (FA-2026-0001) est attribué à
--   l'émission, à la suite des précédents, sans trou ;
-- - une facture émise ne se modifie ni ne se supprime : seuls son statut
--   (envoyée / payée) et ses dates d'envoi, de paiement et de relance évoluent ;
-- - une erreur se corrige par un avoir (AV-2026-0002, même série) ;
-- - accès : Direction et Comptabilité de la société.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  number text,
  kind text not null default 'invoice' check (kind in ('invoice', 'credit_note')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'cancelled')),
  credit_of uuid references public.invoices(id),
  credit_reason text,
  client_id uuid references public.clients(id) on delete set null,
  client jsonb not null default '{}'::jsonb,
  issue_date date,
  due_date date,
  period_start date,
  period_end date,
  lines jsonb not null default '[]'::jsonb,
  tax_rate numeric not null default 20,
  amount_ht numeric not null default 0,
  tax_amount numeric not null default 0,
  total_ttc numeric not null default 0,
  fuel_amount numeric not null default 0,
  payment_terms_days integer not null default 30,
  notes text,
  sent_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  reminder_count integer not null default 0,
  last_reminder_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (license_id, number)
);
create index if not exists invoices_license_idx on public.invoices (license_id, issue_date desc);
create index if not exists invoices_client_idx on public.invoices (client_id);
alter table public.invoices enable row level security;

create or replace function public._flow_can_invoice(p_license uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public._my_role_in(p_license), '') in ('direction', 'comptabilite')
$$;

drop policy if exists invoices_select on public.invoices;
drop policy if exists invoices_insert on public.invoices;
drop policy if exists invoices_update on public.invoices;
drop policy if exists invoices_delete on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (public._flow_can_invoice(license_id));
create policy invoices_insert on public.invoices for insert to authenticated with check (public._flow_can_invoice(license_id));
create policy invoices_update on public.invoices for update to authenticated using (public._flow_can_invoice(license_id)) with check (public._flow_can_invoice(license_id));
create policy invoices_delete on public.invoices for delete to authenticated using (public._flow_can_invoice(license_id));

-- Totaux recalculés en base à partir des lignes (une facture dit toujours la même chose).
create or replace function public.invoices_totals()
returns trigger language plpgsql as $$
declare v_ht numeric; v_fuel numeric;
begin
  select round(coalesce(sum(coalesce((l->>'quantity')::numeric, 0) * coalesce((l->>'unitPrice')::numeric, 0)), 0), 2),
         round(coalesce(sum(case when (l->>'fuel')::boolean then coalesce((l->>'quantity')::numeric, 0) * coalesce((l->>'unitPrice')::numeric, 0) else 0 end), 0), 2)
    into v_ht, v_fuel
    from jsonb_array_elements(coalesce(new.lines, '[]'::jsonb)) l;
  new.amount_ht := v_ht;
  new.fuel_amount := v_fuel;
  new.tax_amount := round(v_ht * coalesce(new.tax_rate, 0) / 100, 2);
  new.total_ttc := new.amount_ht + new.tax_amount;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists invoices_totals on public.invoices;
create trigger invoices_totals before insert or update on public.invoices
  for each row execute function public.invoices_totals();

-- Garde-fou d'inaltérabilité.
create or replace function public.invoices_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_free constant text[] := array['status', 'sent_at', 'paid_at', 'cancelled_at', 'reminder_count', 'last_reminder_at', 'updated_at'];
  v_sys boolean := coalesce(current_setting('optigroup.invoice_system', true), '') = 'on';
begin
  if coalesce(auth.role(), '') = 'service_role' or (auth.uid() is null and current_user in ('postgres', 'supabase_admin')) then
    return coalesce(new, old);
  end if;
  if tg_op = 'INSERT' then
    if not v_sys and (new.status <> 'draft' or new.number is not null or new.kind <> 'invoice') then
      raise exception 'Une facture se crée en brouillon ; elle est numérotée à l''émission.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.status = 'draft' then return old; end if;
    raise exception 'La facture % ne peut pas être supprimée : créez un avoir pour l''annuler.', old.number using errcode = 'P0001';
  end if;
  if new.license_id is distinct from old.license_id or new.kind is distinct from old.kind or new.credit_of is distinct from old.credit_of then
    raise exception 'La nature d''une facture ne se modifie pas.' using errcode = 'P0001';
  end if;
  if old.status = 'draft' then
    if (new.status <> 'draft' or new.number is distinct from old.number) and not v_sys then
      raise exception 'Utilisez « Émettre » pour numéroter la facture.' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if new.status = 'draft' then raise exception 'La facture % est émise : elle ne peut pas redevenir un brouillon.', old.number using errcode = 'P0001'; end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' and not v_sys then
    raise exception 'Pour annuler la facture %, créez un avoir.', old.number using errcode = 'P0001';
  end if;
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'La facture % est annulée par un avoir.', old.number using errcode = 'P0001';
  end if;
  if (to_jsonb(new) - v_free) is distinct from (to_jsonb(old) - v_free) then
    raise exception 'La facture % est émise : elle ne se modifie plus. Créez un avoir pour la corriger.', old.number using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists invoices_guard on public.invoices;
create trigger invoices_guard before insert or update or delete on public.invoices
  for each row execute function public.invoices_guard();

-- Prochain numéro de la série (factures et avoirs ensemble), verrou par société.
create or replace function public._flow_next_number(p_license uuid, p_prefix text)
returns text language plpgsql security definer set search_path = public as $$
declare v_year text := to_char(now() at time zone 'Europe/Paris', 'YYYY'); v_n int;
begin
  perform pg_advisory_xact_lock(hashtext('invoice-number-' || p_license::text));
  select coalesce(max(nullif(split_part(number, '-', 3), '')::int), 0) + 1 into v_n
    from public.invoices where license_id = p_license and split_part(number, '-', 2) = v_year;
  return format('%s-%s-%s', p_prefix, v_year, lpad(v_n::text, 4, '0'));
end $$;
revoke all on function public._flow_next_number(uuid, text) from public, anon, authenticated;

-- Émettre un brouillon : numéro, date d'émission et échéance.
create or replace function public.issue_invoice(p_id uuid)
returns public.invoices language plpgsql security definer set search_path = public as $$
declare inv public.invoices;
begin
  select * into inv from public.invoices where id = p_id for update;
  if inv.id is null or not public._flow_can_invoice(inv.license_id) then
    raise exception 'Facture introuvable ou accès refusé' using errcode = '42501';
  end if;
  if inv.status <> 'draft' then return inv; end if;
  if inv.client_id is null and coalesce(inv.client->>'name', '') = '' then raise exception 'Choisissez le client.' using errcode = '22023'; end if;
  if jsonb_array_length(inv.lines) = 0 then raise exception 'Ajoutez au moins une ligne.' using errcode = '22023'; end if;
  perform set_config('optigroup.invoice_system', 'on', true);
  update public.invoices
     set number = public._flow_next_number(inv.license_id, 'FA'),
         status = 'sent',
         issue_date = (now() at time zone 'Europe/Paris')::date,
         due_date = (now() at time zone 'Europe/Paris')::date + inv.payment_terms_days
   where id = p_id
  returning * into inv;
  perform set_config('optigroup.invoice_system', 'off', true);
  return inv;
end $$;
revoke all on function public.issue_invoice(uuid) from public, anon;
grant execute on function public.issue_invoice(uuid) to authenticated;

-- Avoir total (p_amount_ht nul) ou partiel. Avoir total : facture « annulée ».
create or replace function public.create_credit_note(p_invoice uuid, p_reason text, p_amount_ht numeric default null)
returns public.invoices language plpgsql security definer set search_path = public as $$
declare inv public.invoices; cn public.invoices; v_credited numeric; v_left numeric; v_amount numeric; v_today date;
begin
  select * into inv from public.invoices where id = p_invoice for update;
  if inv.id is null or not public._flow_can_invoice(inv.license_id) then
    raise exception 'Facture introuvable ou accès refusé' using errcode = '42501';
  end if;
  if inv.kind <> 'invoice' then raise exception 'Un avoir ne s''annule pas par un autre avoir.' using errcode = '22023'; end if;
  if inv.status = 'draft' then raise exception 'Un brouillon se modifie ou se supprime directement.' using errcode = '22023'; end if;
  if inv.status = 'cancelled' then raise exception 'La facture % est déjà annulée.', inv.number using errcode = '22023'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Indiquez le motif de l''avoir.' using errcode = '22023'; end if;
  select coalesce(-sum(amount_ht), 0) into v_credited from public.invoices where credit_of = inv.id;
  v_left := round(inv.amount_ht - v_credited, 2);
  v_amount := round(coalesce(p_amount_ht, v_left), 2);
  if v_amount <= 0 or v_amount > v_left then
    raise exception 'Montant de l''avoir invalide : entre 0,01 et % € HT.', replace(v_left::text, '.', ',') using errcode = '22023';
  end if;
  v_today := (now() at time zone 'Europe/Paris')::date;
  perform set_config('optigroup.invoice_system', 'on', true);
  insert into public.invoices (license_id, number, kind, status, credit_of, credit_reason, client_id, client, issue_date, due_date,
                               period_start, period_end, lines, tax_rate, payment_terms_days, paid_at)
  values (inv.license_id, public._flow_next_number(inv.license_id, 'AV'), 'credit_note', 'paid', inv.id, left(trim(p_reason), 500),
          inv.client_id, inv.client, v_today, v_today, inv.period_start, inv.period_end,
          jsonb_build_array(jsonb_build_object('id', 'cn', 'description', format('Avoir sur la facture %s — %s', inv.number, left(trim(p_reason), 300)),
                                               'quantity', 1, 'unitPrice', -v_amount)),
          inv.tax_rate, 0, now())
  returning * into cn;
  if v_amount = v_left then
    update public.invoices set status = 'cancelled', cancelled_at = now() where id = inv.id;
  end if;
  perform set_config('optigroup.invoice_system', 'off', true);
  return cn;
end $$;
revoke all on function public.create_credit_note(uuid, text, numeric) from public, anon;
grant execute on function public.create_credit_note(uuid, text, numeric) to authenticated;

-- Réglages de facturation de la société : émetteur (coordonnées, IBAN, mentions)
-- et indexation gazole CNR. Lus par les membres, modifiés par Direction / Comptabilité.
create table if not exists public.invoice_settings (
  license_id uuid primary key references public.licenses(id) on delete cascade,
  issuer jsonb not null default '{}'::jsonb,
  fuel jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.invoice_settings enable row level security;
drop policy if exists invoice_settings_read on public.invoice_settings;
drop policy if exists invoice_settings_write on public.invoice_settings;
create policy invoice_settings_read on public.invoice_settings for select to authenticated
  using (license_id = public.get_user_license_id(auth.uid()));
create policy invoice_settings_write on public.invoice_settings for all to authenticated
  using (public._flow_can_invoice(license_id)) with check (public._flow_can_invoice(license_id));
