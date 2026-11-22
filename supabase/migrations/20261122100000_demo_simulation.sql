-- Simulation continue des sociétés de démonstration (OptiFlow).
-- Chaque soir : les tractions du jour sont réalisées (planning, trajets, pointages de l'appli),
-- la semaine suivante est planifiée, les factures de quinzaine sont émises puis réglées et chaque
-- mois écoulé reçoit ses fiches de paie. Le tout rejoue un cycle de référence de 4 semaines.

create table if not exists public.demo_sim_state (
  license_id uuid primary key,
  base_start date not null,          -- lundi du cycle de référence de 28 jours (planning, trajets)
  app_base date not null,            -- lundi du cycle de 14 jours des pointages de l'appli
  template_month date not null,      -- mois de référence des paies
  last_day date not null,
  late_client uuid,
  updated_at timestamptz not null default now()
);
alter table public.demo_sim_state enable row level security;
revoke all on public.demo_sim_state from anon, authenticated;

create or replace function public._demo_dates(t text, s date, d date) returns text
language sql immutable as $$
  select replace(replace(t, to_char(s, 'YYYY-MM-DD'), to_char(d, 'YYYY-MM-DD')),
                 to_char(s, 'DD/MM/YYYY'), to_char(d, 'DD/MM/YYYY'))
$$;

create or replace function public._demo_src(base date, d date, n int default 28) returns date
language sql immutable as $$
  select base + ((((d - base) % n) + n) % n)
$$;

create or replace function public._demo_mois(m date) returns text
language sql immutable as $$
  select (array['janvier','février','mars','avril','mai','juin','juillet','août',
                'septembre','octobre','novembre','décembre'])[extract(month from m)::int]
         || ' ' || extract(year from m)::int
$$;

-- Une journée : planning (réalisé ou prévu), trajets réalisés et pointages de l'appli.
create or replace function public.demo_flow_day(p_license uuid, p_day date, p_today date) returns void
language plpgsql set search_path = public as $$
declare st public.demo_sim_state; s date; a date; v_planned boolean := p_day > p_today;
begin
  select * into st from public.demo_sim_state where license_id = p_license;
  if not found then return; end if;
  s := public._demo_src(st.base_start, p_day);

  if exists (select 1 from public.planning_entries where license_id = p_license and planning_date = p_day) then
    if not v_planned and exists (select 1 from public.planning_entries where license_id = p_license
                                  and planning_date = p_day and status = 'planned') then
      delete from public.planning_entries where license_id = p_license and planning_date = p_day and status = 'planned';
    end if;
  end if;
  if not exists (select 1 from public.planning_entries where license_id = p_license and planning_date = p_day) then
    insert into public.planning_entries
    select (jsonb_populate_record(null::public.planning_entries,
             public._demo_dates(to_jsonb(p)::text, s, p_day)::jsonb
             || jsonb_build_object('id', gen_random_uuid(),
                                   'mission_order', replace(p.mission_order, to_char(s, 'MMDD'), to_char(p_day, 'MMDD')),
                                   'status', case when v_planned then 'planned' else 'completed' end))).*
      from public.planning_entries p
     where p.license_id = p_license and p.planning_date = s and p.status = 'completed';
  end if;

  if v_planned then return; end if;

  if not exists (select 1 from public.trips where license_id = p_license and trip_date = p_day) then
    insert into public.trips
    select (jsonb_populate_record(null::public.trips,
             public._demo_dates(to_jsonb(t)::text, s, p_day)::jsonb || jsonb_build_object('id', gen_random_uuid()))).*
      from public.trips t where t.license_id = p_license and t.trip_date = s;
  end if;

  -- Pointages de l'appli conducteur : seulement à partir du cycle de référence (pas d'historique ancien).
  if p_day >= st.app_base and not exists (select 1 from public.driver_time_entries where license_id = p_license and work_date = p_day) then
    a := public._demo_src(st.app_base, p_day, 14);
    insert into public.driver_time_entries
    select (jsonb_populate_record(null::public.driver_time_entries,
             public._demo_dates(to_jsonb(e)::text, a, p_day)::jsonb || jsonb_build_object('id', gen_random_uuid()))).*
      from public.driver_time_entries e where e.license_id = p_license and e.work_date = a;
    insert into public.driver_day_reports
    select (jsonb_populate_record(null::public.driver_day_reports,
             public._demo_dates(to_jsonb(r)::text, a, p_day)::jsonb)).*
      from public.driver_day_reports r where r.license_id = p_license and r.work_date = a
    on conflict do nothing;
  end if;
end $$;

-- Facture d'un client pour une période (une ligne par ligne de traction).
create or replace function public.demo_flow_invoice(p_license uuid, p_client uuid, p_start date, p_end date) returns void
language plpgsql set search_path = public as $$
declare tpl public.invoices; v_lines jsonb; v_issue date := p_end + 1; v_year text; v_num int; v_terms int;
begin
  if exists (select 1 from public.invoices where license_id = p_license and client_id = p_client
              and period_start = p_start and kind = 'invoice') then return; end if;
  select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'quantity', n, 'unitPrice', price,
                   'description', format('%s — %s (%s nuits)', tour, public._demo_mois(p_start), n)) order by tour)
    into v_lines
    from (select notes tour, count(*) n, round(avg(revenue)::numeric, 2) price
            from public.trips where license_id = p_license and client_id = p_client and trip_date between p_start and p_end
           group by notes) x;
  if v_lines is null then return; end if;
  select * into tpl from public.invoices where license_id = p_license and client_id = p_client and kind = 'invoice'
   order by issue_date desc limit 1;
  v_terms := coalesce(tpl.payment_terms_days, 30);
  v_year := extract(year from v_issue)::text;
  select coalesce(max(nullif(split_part(number, '-', 3), '')::int), 0) + 1 into v_num
    from public.invoices where license_id = p_license and split_part(number, '-', 2) = v_year;
  insert into public.invoices (id, license_id, number, kind, status, client_id, client, issue_date, due_date,
                               period_start, period_end, lines, tax_rate, payment_terms_days, notes, sent_at,
                               created_by, created_at, updated_at)
  values (gen_random_uuid(), p_license, 'FA-' || v_year || '-' || lpad(v_num::text, 4, '0'), 'invoice', 'sent',
          p_client, tpl.client, v_issue, v_issue + v_terms, p_start, p_end, v_lines, coalesce(tpl.tax_rate, 20),
          v_terms, tpl.notes, v_issue::timestamp + time '10:05', tpl.created_by,
          v_issue::timestamp + time '10:00', v_issue::timestamp + time '10:00');
end $$;

-- Mois écoulé : fiches de paie d'après le mois de référence.
create or replace function public.demo_flow_month(p_license uuid, p_month date) returns void
language plpgsql set search_path = public as $$
declare st public.demo_sim_state; v_end date := (p_month + interval '1 month - 1 day')::date;
begin
  select * into st from public.demo_sim_state where license_id = p_license;
  if not found or p_month = st.template_month then return; end if;
  if not exists (select 1 from public.trips where license_id = p_license and trip_date between p_month and v_end) then return; end if;
  insert into public.payslips
  select (jsonb_populate_record(null::public.payslips, to_jsonb(p) || jsonb_build_object(
            'id', gen_random_uuid(), 'period', to_char(p_month, 'YYYY-MM'), 'status', 'validated',
            'created_at', v_end::timestamp + time '16:00', 'validated_at', v_end::timestamp + time '17:00',
            'updated_at', v_end::timestamp + time '17:00'))).*
    from public.payslips p
   where p.license_id = p_license and p.period = to_char(st.template_month, 'YYYY-MM')
     and not exists (select 1 from public.payslips q where q.license_id = p_license
                      and q.employee_name = p.employee_name and q.period = to_char(p_month, 'YYYY-MM'));
end $$;

create or replace function public.demo_sim_run(p_today date default (now() at time zone 'Europe/Paris')::date)
returns void language plpgsql set search_path = public as $$
declare st public.demo_sim_state; d date; m date; c uuid; v_start timestamptz := clock_timestamp();
begin
  for st in select * from public.demo_sim_state loop
    d := st.last_day + 1;
    while d <= p_today + 7 loop perform public.demo_flow_day(st.license_id, d, p_today); d := d + 1; end loop;

    -- Factures : au mois jusqu'en octobre 2026, à la quinzaine ensuite.
    m := (date_trunc('month', p_today) - interval '6 months')::date;
    while m <= p_today loop
      for c in select distinct client_id from public.trips where license_id = st.license_id and client_id is not null loop
        if m < date '2026-11-01' then
          if (m + interval '1 month')::date <= p_today then
            perform public.demo_flow_invoice(st.license_id, c, m, (m + interval '1 month - 1 day')::date);
          end if;
        else
          if m + 15 <= p_today then perform public.demo_flow_invoice(st.license_id, c, m, m + 14); end if;
          if (m + interval '1 month')::date <= p_today then
            perform public.demo_flow_invoice(st.license_id, c, m + 15, (m + interval '1 month - 1 day')::date);
          end if;
        end if;
      end loop;
      if (m + interval '1 month')::date <= p_today then perform public.demo_flow_month(st.license_id, m); end if;
      m := (m + interval '1 month')::date;
    end loop;

    -- Règlements : 18 jours après émission, sauf le client qui paie avec un mois de retard.
    update public.invoices
       set status = 'paid',
           paid_at = (issue_date + case when client_id is not distinct from st.late_client then payment_terms_days + 30 else 18 end)::timestamp
                     + time '11:00'
     where license_id = st.license_id and kind = 'invoice' and status = 'sent'
       and issue_date + case when client_id is not distinct from st.late_client then payment_terms_days + 30 else 18 end <= p_today;

    -- Les insertions de la simulation ne doivent pas apparaître comme activité de l'équipe.
    delete from public.company_sync_events where license_id = st.license_id and created_at >= v_start;

    update public.demo_sim_state set last_day = greatest(last_day, p_today), updated_at = now()
     where license_id = st.license_id;
  end loop;
end $$;

revoke all on function public.demo_sim_run(date) from public, anon, authenticated;

-- Tâche planifiée : tous les soirs à 20 h 30 (heure de Paris en hiver).
-- select cron.schedule('demo-simulation', '30 19 * * *', $$select public.demo_sim_run()$$);
