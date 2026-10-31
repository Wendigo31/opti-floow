-- Documents société (Kbis, licence de transport) envoyés depuis le logiciel par la Direction
-- ou l'Exploitation. Une IA lit chaque document (fonction analyze-company-document) ; OptiGroup
-- les contrôle et les valide dans OptiCentral (fonction central_documents).
-- Validité : Kbis 3 mois après sa date d'édition ; licence de transport 3 ans (ou sa date de fin
-- si elle est plus proche). Fichier partagé : identique dans OptiFret, OptiFlow et OptiXpress.

create table if not exists public.company_documents (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  kind text not null check (kind in ('kbis', 'licence')),
  file_name text,
  mime text not null,
  data_url text not null check (length(data_url) <= 8000000),
  uploaded_by text,
  uploaded_at timestamptz not null default now(),
  issued_on date,
  expires_on date,
  extracted jsonb not null default '{}'::jsonb,
  issues text[] not null default '{}',
  ai_status text not null default 'pending' check (ai_status in ('pending', 'done', 'failed')),
  status text not null default 'pending' check (status in ('pending', 'validated', 'rejected')),
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz
);
create index if not exists company_documents_license_idx on public.company_documents (license_id, kind, uploaded_at desc);
alter table public.company_documents enable row level security;
revoke all on public.company_documents from anon, authenticated;

-- Fin de validité d'un document.
create or replace function public._company_doc_valid_until(p_kind text, p_issued date, p_expires date)
returns date language sql immutable as $$
  select case p_kind
    when 'kbis' then (p_issued + interval '3 months')::date
    else case
      when p_issued is null then p_expires
      when p_expires is null then (p_issued + interval '3 years')::date
      else least(p_expires, (p_issued + interval '3 years')::date) end
  end;
$$;

-- La Direction et l'Exploitation peuvent envoyer les documents.
create or replace function public.company_document_can_upload(p_license_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public._my_role_in(p_license_id) in ('direction', 'exploitation'), false);
$$;
revoke all on function public.company_document_can_upload(uuid) from public, anon;
grant execute on function public.company_document_can_upload(uuid) to authenticated;

-- État des deux documents pour le bandeau du logiciel (membres de la société seulement).
create or replace function public.company_documents_status(p_license_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_role text := public._my_role_in(p_license_id);
  out jsonb := '[]'::jsonb;
  k text;
  d record;
  v_until date;
  v_state text;
begin
  if v_role is null then return null; end if;
  foreach k in array array['kbis', 'licence'] loop
    select * into d from public.company_documents
     where license_id = p_license_id and kind = k and status <> 'rejected'
     order by uploaded_at desc limit 1;
    if not found then
      -- Dernier refus éventuel, pour en afficher le motif.
      select * into d from public.company_documents
       where license_id = p_license_id and kind = k order by uploaded_at desc limit 1;
      out := out || jsonb_build_object('kind', k,
        'state', case when found then 'rejected' else 'missing' end,
        'note', case when found then d.review_note end,
        'uploaded_at', case when found then d.uploaded_at end);
      continue;
    end if;
    v_until := public._company_doc_valid_until(k, d.issued_on, d.expires_on);
    v_state := case
      when v_until is not null and v_until < current_date then 'expired'
      when v_until is not null and v_until < current_date + (case k when 'kbis' then 15 else 60 end) then 'expiring'
      when d.status = 'pending' then 'pending'
      else 'ok' end;
    out := out || jsonb_build_object('kind', k, 'state', v_state, 'status', d.status,
      'issued_on', d.issued_on, 'expires_on', d.expires_on, 'valid_until', v_until,
      'issues', to_jsonb(d.issues), 'uploaded_at', d.uploaded_at, 'uploaded_by', d.uploaded_by);
  end loop;
  return jsonb_build_object('documents', out,
    'can_upload', v_role in ('direction', 'exploitation'));
end; $$;
revoke all on function public.company_documents_status(uuid) from public, anon;
grant execute on function public.company_documents_status(uuid) to authenticated;

-- Pont OptiCentral : liste, fichier, décision.
create or replace function public.central_documents(p_secret text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  cfg jsonb := (select config from public.central_bridge where id = 1);
  p jsonb := coalesce(p_payload, '{}'::jsonb);
  actor text := left(coalesce(nullif(p->>'_actor', ''), 'opticentral'), 120);
  v_id uuid;
  r jsonb;
begin
  if p_secret is null or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.central_bridge where id = 1) then
    raise exception 'Accès refusé' using errcode = '28000';
  end if;

  case p_action
  when 'list' then
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'license_id', d.license_id, 'company_name', l.company_name, 'siren', l.siren,
        'kind', d.kind, 'file_name', d.file_name, 'mime', d.mime, 'uploaded_by', d.uploaded_by,
        'uploaded_at', d.uploaded_at, 'issued_on', d.issued_on, 'expires_on', d.expires_on,
        'valid_until', public._company_doc_valid_until(d.kind, d.issued_on, d.expires_on),
        'extracted', d.extracted, 'issues', to_jsonb(d.issues), 'ai_status', d.ai_status,
        'status', d.status, 'review_note', d.review_note, 'reviewed_by', d.reviewed_by, 'reviewed_at', d.reviewed_at,
        'latest', not exists (select 1 from public.company_documents n
                               where n.license_id = d.license_id and n.kind = d.kind and n.uploaded_at > d.uploaded_at))
        order by d.uploaded_at desc), '[]'::jsonb)
      into r
      from public.company_documents d join public.licenses l on l.id = d.license_id
     where nullif(p->>'license_id', '') is null or d.license_id = (p->>'license_id')::uuid;
    return r;

  when 'get' then
    select jsonb_build_object('id', id, 'kind', kind, 'mime', mime, 'file_name', file_name, 'data_url', data_url)
      into r from public.company_documents where id = (p->>'id')::uuid;
    if r is null then raise exception 'Document introuvable' using errcode = 'P0002'; end if;
    return r;

  when 'review' then
    if coalesce(p->>'status', '') not in ('validated', 'rejected', 'pending') then
      raise exception 'Décision invalide' using errcode = '22023';
    end if;
    update public.company_documents
       set status = p->>'status',
           review_note = nullif(left(trim(coalesce(p->>'note', '')), 1000), ''),
           issued_on = case when p ? 'issued_on' then nullif(p->>'issued_on', '')::date else issued_on end,
           expires_on = case when p ? 'expires_on' then nullif(p->>'expires_on', '')::date else expires_on end,
           reviewed_by = actor, reviewed_at = now()
     where id = (p->>'id')::uuid
     returning id into v_id;
    if v_id is null then raise exception 'Document introuvable' using errcode = 'P0002'; end if;
    perform public._central_log(cfg, actor, 'central_document_' || (p->>'status'), v_id, p - '_actor');
    select jsonb_build_object('id', id, 'kind', kind, 'license_id', license_id, 'issued_on', issued_on, 'expires_on', expires_on,
             'valid_until', public._company_doc_valid_until(kind, issued_on, expires_on), 'status', status)
      into r from public.company_documents where id = v_id;
    return r;

  else
    raise exception 'Action inconnue : %', p_action using errcode = '22023';
  end case;
end; $$;
revoke all on function public.central_documents(text, text, jsonb) from public;
grant execute on function public.central_documents(text, text, jsonb) to anon, authenticated;
