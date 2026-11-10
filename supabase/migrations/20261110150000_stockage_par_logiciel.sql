-- Rangement des fichiers par logiciel et par société (10/11/2026, demande de Yanis).
-- Compartiment « optiflow » (le dossier racine du logiciel), puis un dossier par société nommé
-- comme son adresse : <identifiant>.opti-flow.app
--   <identifiant>.opti-flow.app/documents/          documents envoyés par OptiGroup (factures, licence, Kbis…)
--   <identifiant>.opti-flow.app/software/           copie des données du logiciel (un CSV par table, chaque nuit)
--   <identifiant>.opti-flow.app/software/fichiers/  justificatifs (CMR, photos, signatures, preuves…)
-- Rejouable sans risque.

create extension if not exists pg_net with schema extensions;

insert into storage.buckets (id, name, public, file_size_limit)
values ('optiflow', 'optiflow', false, 20971520)
on conflict (id) do update set public = false;

alter table public.licenses add column if not exists storage_folder text;
create unique index if not exists licenses_storage_folder_key on public.licenses (storage_folder);

create or replace function public.get_user_storage_folder()
returns text language sql stable security definer set search_path = public as $$
  select storage_folder from public.licenses where id = public.get_user_license_id(auth.uid());
$$;
revoke all on function public.get_user_storage_folder() from public, anon;
grant execute on function public.get_user_storage_folder() to authenticated;

-- Partie « identifiant » du dossier : l'identifiant de la société (celui de son lien), sinon son nom.
create or replace function public.storage_folder_base(p_slug text, p_name text, p_id uuid)
returns text language plpgsql immutable set search_path = public as $$
declare
  base text := lower(coalesce(nullif(trim(p_slug), ''), nullif(trim(p_name), ''), 'societe'));
begin
  base := translate(base, 'àâäáãåçéèêëíìîïñóòôöõøúùûüýÿ', 'aaaaaaceeeeiiiinoooooouuuuyy');
  base := trim(both '-' from left(regexp_replace(base, '[^a-z0-9]+', '-', 'g'), 60));
  if base = '' then base := 'societe-' || left(replace(p_id::text, '-', ''), 8); end if;
  return base;
end $$;

-- Dossier fixé à la création ; les anciens noms (avant le 10/11) sont convertis une fois.
create or replace function public._licenses_storage_folder()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  dom constant text := '.opti-flow.app';
  base text;
  cand text;
  n int := 1;
begin
  if tg_op = 'UPDATE' and old.storage_folder like '%' || dom then
    new.storage_folder := old.storage_folder;
    return new;
  end if;
  base := public.storage_folder_base(new.slug, new.company_name, new.id);
  cand := base || dom;
  while exists (select 1 from public.licenses where storage_folder = cand and id <> new.id) loop
    n := n + 1;
    cand := base || '-' || n || dom;
  end loop;
  new.storage_folder := cand;
  return new;
end $$;

drop trigger if exists licenses_storage_folder on public.licenses;
create trigger licenses_storage_folder before insert or update on public.licenses
  for each row execute function public._licenses_storage_folder();

do $$
declare has_plan boolean := exists (select 1 from pg_trigger where tgrelid = 'public.licenses'::regclass and tgname = 'licenses_plan_apply');
begin
  if has_plan then execute 'alter table public.licenses disable trigger licenses_plan_apply'; end if;
  update public.licenses set storage_folder = null where storage_folder is null or storage_folder not like '%.opti-flow.app';
  if has_plan then execute 'alter table public.licenses enable trigger licenses_plan_apply'; end if;
end $$;

-- Règles d'accès : lecture de tout le dossier de sa société ; écriture seulement dans software/
-- (documents/ est rempli par OptiGroup).
drop policy if exists "optiflow_select_own_company" on storage.objects;
drop policy if exists "optiflow_insert_own_company" on storage.objects;
drop policy if exists "optiflow_update_own_company" on storage.objects;
drop policy if exists "optiflow_delete_own_company" on storage.objects;
create policy "optiflow_select_own_company" on storage.objects for select to authenticated
  using (bucket_id = 'optiflow' and (storage.foldername(name))[1] = public.get_user_storage_folder());
create policy "optiflow_insert_own_company" on storage.objects for insert to authenticated
  with check (bucket_id = 'optiflow' and (storage.foldername(name))[2] = 'software' and (storage.foldername(name))[1] = public.get_user_storage_folder());
create policy "optiflow_update_own_company" on storage.objects for update to authenticated
  using (bucket_id = 'optiflow' and (storage.foldername(name))[2] = 'software' and (storage.foldername(name))[1] = public.get_user_storage_folder());
create policy "optiflow_delete_own_company" on storage.objects for delete to authenticated
  using (bucket_id = 'optiflow' and (storage.foldername(name))[2] = 'software' and (storage.foldername(name))[1] = public.get_user_storage_folder());

-- Tous les fichiers d'une société (nouveau compartiment + anciens, pour ce qui y reste).
create or replace function public._company_storage_objects(p_license_id uuid)
returns table(bucket_id text, name text, size bigint, mime text, created_at timestamptz)
language sql stable security definer set search_path = public, storage as $$
  select o.bucket_id, o.name, (o.metadata->>'size')::bigint, o.metadata->>'mimetype', o.created_at
    from storage.objects o
   where o.bucket_id in ('optiflow')
     and (
       (storage.foldername(o.name))[1] = (select l.storage_folder from public.licenses l where l.id = p_license_id)
     );
$$;
revoke all on function public._company_storage_objects(uuid) from public, anon, authenticated;

create or replace function public.central_files(p_secret text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  p jsonb := coalesce(p_payload, '{}'::jsonb);
  v_id uuid;
  v_folder text;
  r jsonb;
begin
  if p_secret is null or length(p_secret) < 32
     or encode(extensions.digest(p_secret, 'sha256'), 'hex') is distinct from (select secret_hash from public.central_bridge where id = 1) then
    raise exception 'Accès refusé' using errcode = '28000';
  end if;
  v_id := nullif(p->>'license_id', '')::uuid;
  if v_id is null then raise exception 'license_id manquant' using errcode = '22023'; end if;
  select storage_folder into v_folder from public.licenses where id = v_id;
  if not found then raise exception 'Licence introuvable' using errcode = 'P0002'; end if;

  case p_action
  when 'list' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'bucket', o.bucket_id, 'path', o.name, 'size', o.size, 'mime', o.mime, 'created_at', o.created_at,
             'legacy', o.bucket_id <> 'optiflow' or (storage.foldername(o.name))[1] is distinct from v_folder)
             order by o.name), '[]'::jsonb)
      into r from public._company_storage_objects(v_id) o;
    return jsonb_build_object('folder', v_folder, 'app', 'optiflow', 'bucket', 'optiflow', 'domain', 'opti-flow.app', 'files', r);
  else
    raise exception 'Action inconnue : %', p_action using errcode = '22023';
  end case;
end $$;
revoke all on function public.central_files(text, text, jsonb) from public;
grant execute on function public.central_files(text, text, jsonb) to anon, authenticated;

-- Copie des données d'une société (une entrée par table qui a une colonne license_id).
create or replace function public._company_export(p_license_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  t record;
  rows jsonb;
  r jsonb := '{}'::jsonb;
begin
  for t in
    select c.table_name
      from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
     where c.table_schema = 'public' and c.column_name = 'license_id' and tb.table_type = 'BASE TABLE'
       and c.table_name !~ '(error|live_position|session|history|usage|log|^support_|invitation|access|link|notification|announcement|sync_event|activity|preference|^license_|token|ticket|_safe$|^central_|^company_users$)'
     order by c.table_name
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from (select * from public.%I where license_id::text = $1 limit 50000) x', t.table_name)
      into rows using p_license_id::text;
    r := r || jsonb_build_object(t.table_name, rows);
  end loop;
  r := r || jsonb_build_object('societe', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from public.licenses l where l.id = p_license_id));
  return r;
end $$;
revoke all on function public._company_export(uuid) from public, anon, authenticated;
grant execute on function public._company_export(uuid) to service_role;

-- Copie de nuit : jeton aléatoire gardé dans le coffre de la base (vault), jamais ailleurs.
create table if not exists public.storage_export_settings (
  id int primary key default 1 check (id = 1),
  token_hash text not null
);
alter table public.storage_export_settings enable row level security;

do $$
declare tok text;
begin
  if not exists (select 1 from vault.secrets where name = 'storage_export_token') then
    tok := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(tok, 'storage_export_token', 'Copie de nuit des données vers le stockage');
    insert into public.storage_export_settings (id, token_hash)
    values (1, encode(extensions.digest(tok, 'sha256'), 'hex'))
    on conflict (id) do update set token_hash = excluded.token_hash;
  end if;
end $$;

create or replace function public._storage_export_token_ok(p_token text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce(length(p_token) >= 32 and encode(extensions.digest(p_token, 'sha256'), 'hex') = (select token_hash from public.storage_export_settings where id = 1), false);
$$;
revoke all on function public._storage_export_token_ok(text) from public, anon, authenticated;
grant execute on function public._storage_export_token_ok(text) to service_role;

create or replace function public._storage_export_targets()
returns table(license_id uuid, folder text, bucket text)
language sql stable security definer set search_path = public as $$
  select l.id, l.storage_folder, 'optiflow'::text from public.licenses l where l.storage_folder is not null;
$$;
revoke all on function public._storage_export_targets() from public, anon, authenticated;
grant execute on function public._storage_export_targets() to service_role;

do $$
begin
  perform cron.unschedule('storage-export-nightly') where exists (select 1 from cron.job where jobname = 'storage-export-nightly');
  perform cron.schedule('storage-export-nightly', '23 2 * * *', $job$
    select net.http_post(
      url := 'https://zlesqkxvydmljcctnrez.supabase.co/functions/v1/company-files',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('action', 'export_all',
        'token', (select decrypted_secret from vault.decrypted_secrets where name = 'storage_export_token')),
      timeout_milliseconds := 60000
    );
  $job$);
end $$;
