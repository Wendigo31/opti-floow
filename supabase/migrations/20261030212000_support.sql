-- Support : signalement de bug / erreur et discussion avec un administrateur OptiGroup.
-- Identique dans OptiFlow, OptiFret et OptiXpress ; OptiCentral lit et répond par le pont v2.
-- Rejouable sans risque. Nécessite team_usage.sql (_my_role_in).

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  company_user_id uuid,
  auth_user_id uuid,
  author_email text,
  author_name text,
  kind text not null default 'question' check (kind in ('bug', 'question', 'chat')),
  subject text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  page text,
  context jsonb not null default '{}'::jsonb,
  unread_user boolean not null default false,
  unread_admin boolean not null default true,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  from_admin boolean not null default false,
  author text,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index if not exists support_threads_license_idx on public.support_threads (license_id, last_message_at desc);
create index if not exists support_threads_user_idx on public.support_threads (auth_user_id, last_message_at desc);
create index if not exists support_messages_thread_idx on public.support_messages (thread_id, created_at);
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_threads, public.support_messages from anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.support_threads, public.support_messages to service_role;
  end if;
end $$;

-- Nouveau signalement / nouvelle discussion (utilisateur connecté, membre actif de la société).
create or replace function public.support_create(p_license_id uuid, p_kind text, p_subject text, p_body text,
  p_page text default null, p_context jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_col text := coalesce((select config->>'user_auth_col' from public.central_bridge where id = 1), 'user_id');
  v_user record;
  v_id uuid;
begin
  if public._my_role_in(p_license_id) is null then
    raise exception 'Connectez-vous avec votre compte pour contacter le support' using errcode = '42501';
  end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Message vide' using errcode = '22023'; end if;
  execute format('select id, email, display_name from public.company_users where license_id = $1 and %I = $2 limit 1', auth_col)
    into v_user using p_license_id, auth.uid();
  insert into public.support_threads (license_id, company_user_id, auth_user_id, author_email, author_name, kind, subject, page, context)
  values (p_license_id, v_user.id, auth.uid(), v_user.email, coalesce(v_user.display_name, split_part(v_user.email, '@', 1)),
          case when p_kind in ('bug', 'question', 'chat') then p_kind else 'question' end,
          left(coalesce(nullif(trim(p_subject), ''), left(trim(p_body), 80)), 140), left(p_page, 300),
          coalesce(p_context, '{}'::jsonb) - 'password')
  returning id into v_id;
  insert into public.support_messages (thread_id, from_admin, author, body)
  values (v_id, false, coalesce(v_user.display_name, v_user.email), left(trim(p_body), 5000));
  return v_id;
end $$;
revoke all on function public.support_create(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.support_create(uuid, text, text, text, text, jsonb) to authenticated;

-- Mes discussions avec le support (et leurs messages).
create or replace function public.support_my_threads(p_license_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'kind', t.kind, 'subject', t.subject, 'status', t.status, 'unread', t.unread_user,
      'created_at', t.created_at, 'last_message_at', t.last_message_at,
      'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'from_admin', m.from_admin, 'author', m.author,
                     'body', m.body, 'created_at', m.created_at) order by m.created_at), '[]'::jsonb)
                   from public.support_messages m where m.thread_id = t.id))
      order by t.last_message_at desc), '[]'::jsonb)
  from public.support_threads t
  where t.license_id = p_license_id and t.auth_user_id = auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.support_my_threads(uuid) from public, anon;
grant execute on function public.support_my_threads(uuid) to authenticated;

-- Réponse de l'utilisateur dans une discussion (la rouvre si elle était fermée).
create or replace function public.support_user_reply(p_thread_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare t public.support_threads;
begin
  select * into t from public.support_threads where id = p_thread_id and auth_user_id = auth.uid();
  if t.id is null then raise exception 'Discussion introuvable' using errcode = 'P0002'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Message vide' using errcode = '22023'; end if;
  insert into public.support_messages (thread_id, from_admin, author, body)
  values (t.id, false, coalesce(t.author_name, t.author_email), left(trim(p_body), 5000));
  update public.support_threads set status = 'open', unread_admin = true, last_message_at = now() where id = t.id;
end $$;
revoke all on function public.support_user_reply(uuid, text) from public, anon;
grant execute on function public.support_user_reply(uuid, text) to authenticated;

create or replace function public.support_mark_read(p_thread_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.support_threads set unread_user = false where id = p_thread_id and auth_user_id = auth.uid();
$$;
revoke all on function public.support_mark_read(uuid) from public, anon;
grant execute on function public.support_mark_read(uuid) to authenticated;

-- OptiCentral : actions support_list / support_reply / support_status du pont v2.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
begin
  if position('''support_list''' in d) > 0 then return; end if;
  d := replace(d, $x$  when 'autosuspend_get' then$x$, $x$  when 'support_list' then
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', st_.id, 'license_id', st_.license_id,
        'company_name', coalesce(sl_.company_name, sl_.company_identifier, sl_.email),
        'author_email', st_.author_email, 'author_name', st_.author_name, 'kind', st_.kind, 'subject', st_.subject,
        'status', st_.status, 'page', st_.page, 'context', st_.context, 'unread', st_.unread_admin,
        'created_at', st_.created_at, 'last_message_at', st_.last_message_at,
        'messages', (select coalesce(jsonb_agg(jsonb_build_object('id', sm_.id, 'from_admin', sm_.from_admin, 'author', sm_.author,
                       'body', sm_.body, 'created_at', sm_.created_at) order by sm_.created_at), '[]'::jsonb)
                     from public.support_messages sm_ where sm_.thread_id = st_.id))
        order by st_.last_message_at desc), '[]'::jsonb)
      into r
      from (select * from public.support_threads order by last_message_at desc limit coalesce((p->>'limit')::int, 300) ) st_
      join public.licenses sl_ on sl_.id = st_.license_id;
    return r;

  when 'support_reply' then
    v_id := (p->>'thread_id')::uuid;
    if coalesce(trim(p->>'body'), '') = '' then raise exception 'Message vide' using errcode = '22023'; end if;
    insert into public.support_messages (thread_id, from_admin, author, body)
    select v_id, true, coalesce(nullif(p->>'author', ''), 'OptiGroup'), left(trim(p->>'body'), 5000)
     where exists (select 1 from public.support_threads where id = v_id);
    if not found then raise exception 'Discussion introuvable' using errcode = 'P0002'; end if;
    update public.support_threads set status = 'answered', unread_user = true, unread_admin = false, last_message_at = now() where id = v_id;
    return jsonb_build_object('ok', true);

  when 'support_status' then
    v_id := (p->>'thread_id')::uuid;
    update public.support_threads
       set status = case when p->>'status' in ('open', 'answered', 'closed') then p->>'status' else status end,
           unread_admin = case when p ? 'read' then not (p->>'read')::boolean else unread_admin end
     where id = v_id;
    return jsonb_build_object('ok', true);

  when 'autosuspend_get' then$x$);
  execute d;
end $patch$;
