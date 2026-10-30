-- Support depuis la page de connexion (sans compte connecté) — identique dans OptiFlow, OptiFret,
-- OptiXpress. Le visiteur laisse son email ; l'appareil garde un jeton qui lui permet de lire les
-- réponses d'OptiCentral et de répondre. Rejouable sans risque. Nécessite support.sql.

alter table public.support_threads alter column license_id drop not null;
alter table public.support_threads add column if not exists guest_token uuid;
create index if not exists support_threads_guest_idx on public.support_threads (guest_token) where guest_token is not null;

create or replace function public.support_guest_create(p_email text, p_name text, p_kind text, p_subject text, p_body text,
  p_page text default null, p_context jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := nullif(left(trim(coalesce(p_name, '')), 120), '');
  v_id uuid;
  v_token uuid := gen_random_uuid();
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 200 then
    raise exception 'Indiquez une adresse email valide pour recevoir la réponse' using errcode = '22023';
  end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Message vide' using errcode = '22023'; end if;
  -- Anti-abus : 5 demandes par email et 60 demandes sans compte au total par heure.
  if (select count(*) from public.support_threads where guest_token is not null and author_email = v_email
        and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.support_threads where guest_token is not null
        and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Trop de demandes envoyées, réessayez dans une heure' using errcode = '54000';
  end if;
  insert into public.support_threads (license_id, author_email, author_name, kind, subject, page, context, guest_token)
  values (null, v_email, coalesce(v_name, split_part(v_email, '@', 1)),
          case when p_kind in ('bug', 'question', 'chat') then p_kind else 'question' end,
          left(coalesce(nullif(trim(p_subject), ''), left(trim(p_body), 80)), 140), left(p_page, 300),
          (coalesce(p_context, '{}'::jsonb) - 'password') || jsonb_build_object('guest', true), v_token)
  returning id into v_id;
  insert into public.support_messages (thread_id, from_admin, author, body)
  values (v_id, false, coalesce(v_name, v_email), left(trim(p_body), 5000));
  return jsonb_build_object('id', v_id, 'token', v_token);
end $$;

-- Demandes de cet appareil : p_items = [{"id": "...", "token": "..."}] (20 au plus).
create or replace function public.support_guest_threads(p_items jsonb)
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
  join (select (e->>'id')::uuid id, (e->>'token')::uuid token
          from jsonb_array_elements(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) e
         limit 20) k on k.id = t.id and k.token = t.guest_token;
$$;

create or replace function public.support_guest_reply(p_thread_id uuid, p_token uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_body), '') = '' then raise exception 'Message vide' using errcode = '22023'; end if;
  if not exists (select 1 from public.support_threads where id = p_thread_id and guest_token = p_token and p_token is not null) then
    raise exception 'Discussion introuvable' using errcode = 'P0002';
  end if;
  insert into public.support_messages (thread_id, from_admin, author, body)
  select p_thread_id, false, coalesce(author_name, author_email), left(trim(p_body), 5000)
    from public.support_threads where id = p_thread_id;
  update public.support_threads set status = 'open', unread_admin = true, last_message_at = now() where id = p_thread_id;
end $$;

create or replace function public.support_guest_mark_read(p_thread_id uuid, p_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.support_threads set unread_user = false where id = p_thread_id and guest_token = p_token and p_token is not null;
$$;

revoke all on function public.support_guest_create(text, text, text, text, text, text, jsonb) from public;
revoke all on function public.support_guest_threads(jsonb) from public;
revoke all on function public.support_guest_reply(uuid, uuid, text) from public;
revoke all on function public.support_guest_mark_read(uuid, uuid) from public;
grant execute on function public.support_guest_create(text, text, text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.support_guest_threads(jsonb) to anon, authenticated;
grant execute on function public.support_guest_reply(uuid, uuid, text) to anon, authenticated;
grant execute on function public.support_guest_mark_read(uuid, uuid) to anon, authenticated;

-- OptiCentral : les demandes sans compte apparaissent aussi dans support_list.
do $patch$
declare d text := pg_get_functiondef('public.central_admin_ext(text,text,jsonb)'::regprocedure);
begin
  if position('left join public.licenses sl_' in d) > 0 then return; end if;
  d := replace(d, 'join public.licenses sl_ on sl_.id = st_.license_id', 'left join public.licenses sl_ on sl_.id = st_.license_id');
  d := replace(d, $x$'company_name', coalesce(sl_.company_name, sl_.company_identifier, sl_.email),$x$,
                  $x$'company_name', coalesce(sl_.company_name, sl_.company_identifier, sl_.email, 'Sans compte · page de connexion'),$x$);
  if position('left join public.licenses sl_' in d) = 0 then raise exception 'support_list introuvable dans central_admin_ext'; end if;
  execute d;
end $patch$;
