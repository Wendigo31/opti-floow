-- Activation des fonctionnalités depuis OptiCentral (nov. 2026).
-- Avant : le plafond « rien au-delà du forfait » s'appliquait aussi à l'administrateur.
-- Une fonctionnalité activée dans OptiCentral était donc remise à « non » en silence par
-- ce déclencheur, et l'activation semblait ne rien faire.
-- Désormais, une écriture faite par OptiCentral (contexte administrateur) est appliquée
-- telle quelle : l'administrateur peut ouvrir une option en plus du forfait. Un changement
-- de forfait remet ensuite les fonctionnalités à celles du nouveau forfait.
-- Le plafond reste en place pour toute autre écriture.
create or replace function public.license_features_plan_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := public._plan_cfg();
  f jsonb := public.plan_features_of(new.license_id);
  offs jsonb;
  pv jsonb;
begin
  if coalesce(current_setting('app.admin_context', true), '') = 'true' then return new; end if;
  if f is null then return new; end if;
  if cfg->>'features_mode' = 'rows' then
    if f->>new.feature_code = 'false' and new.is_enabled then
      new.is_enabled := false;
      new.disabled_at := coalesce(new.disabled_at, now());
    end if;
    return new;
  end if;
  select coalesce(jsonb_object_agg(key, false), '{}'::jsonb) into offs
    from jsonb_each(f) where jsonb_typeof(value) = 'boolean' and value = 'false'::jsonb;
  new := jsonb_populate_record(new, offs);
  if jsonb_typeof(f->'page_visibility') = 'object' and to_jsonb(new) ? 'page_visibility' then
    select coalesce(jsonb_object_agg(key, false), '{}'::jsonb) into pv
      from jsonb_each(f->'page_visibility') where value = 'false'::jsonb;
    new := jsonb_populate_record(new, jsonb_build_object('page_visibility',
      coalesce(to_jsonb(new)->'page_visibility', '{}'::jsonb) || pv));
  end if;
  return new;
end $$;
