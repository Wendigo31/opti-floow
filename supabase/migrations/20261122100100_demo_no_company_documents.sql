-- Sociétés de démonstration : le bandeau « Envoyez le Kbis et la licence de transport » ne s'affiche pas.
alter table public.licenses add column if not exists is_demo boolean not null default false;

do $$
declare src text;
begin
  select prosrc into src from pg_proc where proname = 'company_documents_status';
  if src is null or position('is_demo' in src) > 0 then return; end if;
  src := replace(src, 'if v_role is null then return null; end if;',
'if v_role is null then return null; end if;
  -- Sociétés de démonstration : aucun Kbis ni licence de transport à demander.
  if exists (select 1 from public.licenses where id = p_license_id and is_demo) then
    return jsonb_build_object(''documents'', ''[]''::jsonb, ''can_upload'', false);
  end if;');
  execute format('create or replace function public.company_documents_status(p_license_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as %L', src);
end $$;
