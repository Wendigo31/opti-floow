-- Lien de connexion propre à chaque société (identifiant « slug »)
--
-- Chaque société reçoit un identifiant tiré de son nom, par ex.
-- « Transports Dupont SARL » → transports-dupont. Il sert :
--  - au lien privé de l'application : <adresse de l'app>/?societe=transports-dupont
--    (puis transports-dupont.<domaine> quand le domaine générique sera branché) ;
--  - à la page « Se connecter » du site OptiGroup, qui retrouve la société
--    dans chaque logiciel à partir de cet identifiant (ou du code société).
--
-- L'identifiant est créé par la base elle-même à chaque création de société,
-- quel que soit le chemin (administration, inscription en ligne, import) :
-- rien à faire dans le code de création. Même calcul dans OptiFret,
-- OptiXpress et OptiFlow, pour qu'une société abonnée à plusieurs logiciels
-- garde le même identifiant partout.

alter table public.licenses add column if not exists slug text;

create unique index if not exists licenses_slug_unique on public.licenses (lower(slug)) where slug is not null;

do $$
begin
  alter table public.licenses add constraint licenses_slug_format
    check (slug is null or slug ~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$');
exception when duplicate_object then null;
end $$;

-- « Transports Dupont & Fils SARL » → « transports-dupont-fils »
create or replace function public.company_slugify(p_label text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(
    trim(both '-' from left(
      trim(both '-' from regexp_replace(
        trim(both '-' from regexp_replace(
          lower(translate(coalesce(p_label, ''),
            'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖòóôõöÙÚÛÜùúûüÇçÑñŸÿ',
            'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNnYy')),
          '[^a-z0-9]+', '-', 'g')),
        '^(sas|sasu|sarl|eurl|sa|sci|snc|selarl)-|-(sas|sasu|sarl|eurl|sa|sci|snc|selarl)$', '', 'g')),
      40)),
    ''), 'societe');
$$;

-- Identifiant libre le plus proche (transports-dupont, transports-dupont-2…)
create or replace function public.company_unique_slug(p_base text, p_exclude uuid default null)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  base text := coalesce(nullif(p_base, ''), 'societe');
  candidate text := base;
  n int := 1;
begin
  while exists (
    select 1 from public.licenses l
    where lower(l.slug) = candidate and (p_exclude is null or l.id <> p_exclude)
  ) loop
    n := n + 1;
    candidate := left(base, 44) || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- À chaque création (et si l'identifiant a été vidé), la base le génère.
create or replace function public.licenses_assign_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is not null and new.slug <> '' then
    new.slug := lower(new.slug);
    if new.slug !~ '^[a-z0-9]([a-z0-9-]{0,46}[a-z0-9])?$' then
      new.slug := public.company_slugify(new.slug);
    end if;
    if exists (select 1 from public.licenses l where lower(l.slug) = new.slug and l.id <> new.id) then
      new.slug := public.company_unique_slug(new.slug, new.id);
    end if;
    return new;
  end if;
  new.slug := public.company_unique_slug(
    public.company_slugify(coalesce(nullif(new.company_name, ''), nullif(new.company_identifier, ''), 'societe')),
    new.id
  );
  return new;
end;
$$;

revoke all on function public.company_unique_slug(text, uuid) from public, anon, authenticated;

drop trigger if exists licenses_assign_slug on public.licenses;
create trigger licenses_assign_slug
  before insert or update of slug on public.licenses
  for each row execute function public.licenses_assign_slug();

-- Sociétés existantes sans identifiant.
do $$
declare
  r record;
begin
  for r in select id from public.licenses where slug is null or slug = '' order by created_at loop
    update public.licenses set slug = null where id = r.id;
  end loop;
end $$;

-- Recherche publique utilisée par la page de connexion de l'application et
-- par le site OptiGroup : à partir de l'identifiant (ou du nom tapé en
-- toutes lettres, ou du code société), renvoie seulement le nom de la
-- société et son identifiant. Jamais le code société ni aucune autre donnée.
create or replace function public.resolve_company_link(p_query text)
returns table (name text, slug text)
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select left(trim(coalesce(p_query, '')), 100) as raw
  )
  select coalesce(nullif(l.company_name, ''), l.slug) as name, l.slug
  from public.licenses l, q
  where l.is_active
    and l.slug is not null
    and q.raw <> ''
    and (
      lower(l.slug) = lower(q.raw)
      or lower(l.slug) = public.company_slugify(q.raw)
      or lower(l.company_identifier) = lower(q.raw)
    )
  order by (lower(l.slug) = lower(q.raw)) desc, l.created_at
  limit 1;
$$;

revoke all on function public.resolve_company_link(text) from public;
grant execute on function public.resolve_company_link(text) to anon, authenticated;
