-- Relevés de chronotachygraphe : une ligne par carte conducteur et par jour (heure UTC de la carte).
-- Alimentée par l'import des fichiers .ddd (RH › Relevés tachy) ; sert aux contrôles et à la pré-paie.
create table if not exists public.tacho_days (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  driver_id text,
  driver_name text,
  card_number text not null default '',
  day date not null,
  distance_km integer not null default 0,
  minutes jsonb not null,
  changes jsonb not null,
  longest_continuous integer not null default 0,
  source text,
  created_at timestamptz not null default now(),
  unique (license_id, card_number, day)
);
create index if not exists tacho_days_license_day on public.tacho_days (license_id, day desc);
alter table public.tacho_days enable row level security;
drop policy if exists tacho_days_own_license on public.tacho_days;
create policy tacho_days_own_license on public.tacho_days for all to authenticated
  using (license_id = public.get_user_license_id(auth.uid())) with check (license_id = public.get_user_license_id(auth.uid()));

-- ---------------------------------------------------------------------------
-- Démonstration : journées de carte plausibles pour chaque conducteur des sociétés de démo.
-- Profils : 'ld' grand routier, 'cd' courte distance, 'nuit' prise de service vers 3 h.
-- Les durées varient chaque jour (hash du conducteur et de la date) ; de temps en temps une
-- conduite continue de 4 h 35 pour montrer une infraction.
-- ---------------------------------------------------------------------------
create or replace function public._demo_h(k text, i int, m int) returns int
language sql immutable as $$ select abs(hashtext(k || ':' || i)) % m $$;

create or replace function public.demo_tacho_day(p_license uuid, p_driver text, p_name text, p_profile text, p_day date)
returns void language plpgsql set search_path = public as $$
declare
  k text := p_driver || p_day::text;
  blocks text[]; durs int[];
  t int; off int; i int; ch jsonb := '[]'::jsonb;
  mins jsonb; drv int := 0; wrk int := 0; av int := 0; longest int := 0;
  first_drive int;
begin
  off := extract(epoch from ((p_day + time '12:00') - (((p_day + time '12:00') at time zone 'Europe/Paris') at time zone 'UTC'))) / 60;
  first_drive := case when public._demo_h(k, 0, 31) = 0 then 275 else null end;
  if p_profile = 'ld' then
    t := 285 + public._demo_h(k, 1, 75);
    blocks := array['work','driving','rest','work','availability','driving','rest','driving','work'];
    durs := array[15, coalesce(first_drive, 180 + public._demo_h(k, 2, 60)), 45, 30 + public._demo_h(k, 3, 30),
                  public._demo_h(k, 4, 30), 120 + public._demo_h(k, 5, 60), 60, 60 + public._demo_h(k, 6, 60), 25];
  elsif p_profile = 'nuit' then
    t := 150 + public._demo_h(k, 1, 60);
    blocks := array['work','driving','rest','work','driving','work'];
    durs := array[15, coalesce(first_drive, 180 + public._demo_h(k, 2, 60)), 45, 30 + public._demo_h(k, 3, 30),
                  120 + public._demo_h(k, 5, 60), 20];
  else
    t := 360 + public._demo_h(k, 1, 90);
    blocks := array['work','driving','rest','work','driving','rest','work','driving','work'];
    durs := array[20, coalesce(first_drive, 150 + public._demo_h(k, 2, 60)), 45, 45 + public._demo_h(k, 3, 45),
                  120 + public._demo_h(k, 5, 50), 60, 30 + public._demo_h(k, 6, 30), 40 + public._demo_h(k, 7, 40), 15];
  end if;
  t := t - off;                         -- heure UTC de la carte
  ch := jsonb_build_array(jsonb_build_object('minute', 0, 'activity', 'rest', 'cardOut', false, 'crew', false));
  for i in 1 .. array_length(blocks, 1) loop
    continue when durs[i] <= 0;
    ch := ch || jsonb_build_object('minute', t, 'activity', blocks[i], 'cardOut', false, 'crew', false);
    if blocks[i] = 'driving' then drv := drv + durs[i]; longest := greatest(longest, durs[i]);
    elsif blocks[i] = 'work' then wrk := wrk + durs[i];
    elsif blocks[i] = 'availability' then av := av + durs[i]; end if;
    t := t + durs[i];
  end loop;
  ch := ch || jsonb_build_object('minute', t, 'activity', 'rest', 'cardOut', false, 'crew', false);
  mins := jsonb_build_object('driving', drv, 'work', wrk, 'availability', av, 'rest', 1440 - drv - wrk - av);
  insert into public.tacho_days (license_id, driver_id, driver_name, card_number, day, distance_km, minutes, changes, longest_continuous, source)
  values (p_license, p_driver, p_name, 'DEMO' || upper(left(md5(p_license::text || p_driver), 12)), p_day,
          round(drv * (0.95 + public._demo_h(k, 9, 20) / 100.0)), mins, ch, longest, 'démonstration')
  on conflict (license_id, card_number, day) do nothing;
end $$;

-- Conducteurs de la démo (OptiFlow : table user_drivers, identifiant local_id).
create or replace function public.demo_tacho_fill(p_license uuid, p_from date, p_to date)
returns void language plpgsql set search_path = public as $$
declare d date; r record;
begin
  for r in select local_id as id, name, coalesce(driver_data->>'tacho_profile', 'cd') as profile
             from public.user_drivers where license_id = p_license and local_id is not null loop
    d := p_from;
    while d <= p_to loop
      if extract(isodow from d) <= 5 then perform public.demo_tacho_day(p_license, r.id, r.name, r.profile, d); end if;
      d := d + 1;
    end loop;
  end loop;
end $$;

create or replace function public.demo_tacho_run(p_today date default (now() at time zone 'Europe/Paris')::date)
returns void language plpgsql set search_path = public as $$
declare st public.demo_sim_state;
begin
  for st in select * from public.demo_sim_state loop
    perform public.demo_tacho_fill(st.license_id, (date_trunc('month', p_today) - interval '6 months')::date, p_today);
  end loop;
end $$;

revoke all on function public.demo_tacho_day(uuid, text, text, text, date) from public, anon, authenticated;
revoke all on function public.demo_tacho_fill(uuid, date, date) from public, anon, authenticated;
revoke all on function public.demo_tacho_run(date) from public, anon, authenticated;

-- Tâche planifiée (après la simulation du soir) :
-- select cron.schedule('demo-tacho', '40 19 * * *', $$select public.demo_tacho_run()$$);
