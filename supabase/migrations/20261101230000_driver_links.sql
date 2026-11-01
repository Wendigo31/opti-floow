-- Application conducteur OptiFlow : chaque conducteur reçoit un lien personnel
-- (/conducteur?token=…), sans mot de passe, qui ouvre ses tournées du jour. Il
-- peut démarrer et terminer une tournée, laisser une remarque et noter les
-- palettes échangées. Le lien peut être régénéré (l'ancien ne marche plus).
-- Les tournées terminées alimentent la facturation du mois.

create table if not exists public.driver_access_links (
  token text primary key default encode(gen_random_bytes(18), 'hex'),
  license_id uuid not null references public.licenses(id) on delete cascade,
  driver_id text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (license_id, driver_id)
);
alter table public.driver_access_links enable row level security;
drop policy if exists driver_links_office on public.driver_access_links;
create policy driver_links_office on public.driver_access_links for select to authenticated
  using (coalesce(public._my_role_in(license_id), '') in ('direction', 'exploitation', 'rh'));

-- Crée ou retrouve le lien d'un conducteur ; p_reset = true en crée un nouveau.
create or replace function public.driver_access_link(p_driver_id text, p_reset boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare v_license uuid := public.get_user_license_id(auth.uid()); v_token text;
begin
  if v_license is null or coalesce(public._my_role_in(v_license), '') not in ('direction', 'exploitation', 'rh') then
    raise exception 'Réservé à la Direction, à l''Exploitation et aux RH' using errcode = '42501';
  end if;
  if not exists (select 1 from public.user_drivers where license_id = v_license and local_id = p_driver_id) then
    raise exception 'Conducteur introuvable' using errcode = 'P0002';
  end if;
  if p_reset then delete from public.driver_access_links where license_id = v_license and driver_id = p_driver_id; end if;
  select token into v_token from public.driver_access_links where license_id = v_license and driver_id = p_driver_id;
  if v_token is null then
    insert into public.driver_access_links (license_id, driver_id) values (v_license, p_driver_id) returning token into v_token;
  end if;
  return v_token;
end $$;
revoke all on function public.driver_access_link(text, boolean) from public, anon;
grant execute on function public.driver_access_link(text, boolean) to authenticated;

-- Journée du conducteur (page publique, par jeton) : ses tournées et relais du jour.
create or replace function public.driver_day(p_token text, p_date date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.driver_access_links; v_day date := coalesce(p_date, (now() at time zone 'Europe/Paris')::date);
        v_name text; v_company text; v_tours jsonb;
begin
  if p_token is null or length(p_token) < 20 then return null; end if;
  select * into l from public.driver_access_links where token = p_token;
  if l.token is null then return null; end if;
  update public.driver_access_links set last_used_at = now() where token = p_token;
  select name into v_name from public.user_drivers where license_id = l.license_id and local_id = l.driver_id limit 1;
  select company_name into v_company from public.licenses where id = l.license_id;
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id, 'name', coalesce(e.tour_name, e.line_reference, 'Tournée'), 'status', e.status,
           'start', e.start_time, 'end', e.end_time, 'origin', e.origin_address, 'destination', e.destination_address,
           'stops', coalesce(e.stops, '[]'::jsonb), 'mission_order', e.mission_order, 'notes', e.notes,
           'relay', e.relay_driver_id = l.driver_id, 'relay_location', e.relay_location, 'relay_time', e.relay_time,
           'client', coalesce(nullif(c.company, ''), c.name), 'client_id', e.client_id)
         order by e.start_time nulls last, e.created_at), '[]'::jsonb)
    into v_tours
    from public.planning_entries e
    left join public.clients c on c.id = e.client_id
   where e.license_id = l.license_id and e.planning_date = v_day and e.status <> 'cancelled'
     and (e.driver_id = l.driver_id or e.relay_driver_id = l.driver_id);
  return jsonb_build_object('driver', v_name, 'company', v_company, 'date', v_day, 'tours', v_tours);
end $$;
revoke all on function public.driver_day(text, date) from public;
grant execute on function public.driver_day(text, date) to anon, authenticated;

-- Le conducteur démarre / termine une tournée, avec remarque et palettes échangées.
create or replace function public.driver_update_tour(p_token text, p_entry uuid, p_status text, p_note text default null,
                                                     p_pallets_given integer default 0, p_pallets_returned integer default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.driver_access_links; e public.planning_entries; v_note text;
begin
  select * into l from public.driver_access_links where token = p_token;
  if l.token is null then raise exception 'Lien conducteur invalide' using errcode = '42501'; end if;
  select * into e from public.planning_entries where id = p_entry and license_id = l.license_id
     and (driver_id = l.driver_id or relay_driver_id = l.driver_id);
  if e.id is null then raise exception 'Tournée introuvable' using errcode = 'P0002'; end if;
  if p_status not in ('in_progress', 'completed') then raise exception 'Statut invalide' using errcode = '22023'; end if;
  v_note := nullif(left(trim(coalesce(p_note, '')), 500), '');
  update public.planning_entries
     set status = p_status,
         notes = case when v_note is null then notes
                      else concat_ws(E'\n', nullif(notes, ''), format('[Conducteur %s] %s', to_char(now() at time zone 'Europe/Paris', 'DD/MM HH24:MI'), v_note)) end,
         updated_at = now()
   where id = e.id;
  if (coalesce(p_pallets_given, 0) > 0 or coalesce(p_pallets_returned, 0) > 0) and e.client_id is not null
     and to_regclass('public.pallet_movements') is not null then
    execute 'insert into public.pallet_movements (license_id, client_id, movement_date, pallet_type, given, returned, reference, source, created_by)
             values ($1, $2, $3, ''EUR'', $4, $5, $6, ''conducteur'', null)'
      using l.license_id, e.client_id::text, e.planning_date, greatest(coalesce(p_pallets_given, 0), 0),
            greatest(coalesce(p_pallets_returned, 0), 0), coalesce(e.tour_name, 'Tournée') || ' du ' || to_char(e.planning_date, 'DD/MM/YYYY');
  end if;
  return jsonb_build_object('ok', true, 'status', p_status);
end $$;
revoke all on function public.driver_update_tour(text, uuid, text, text, integer, integer) from public;
grant execute on function public.driver_update_tour(text, uuid, text, text, integer, integer) to anon, authenticated;
