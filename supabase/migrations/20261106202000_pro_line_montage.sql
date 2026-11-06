-- Découpage des forfaits OptiFlow (nov. 2026).
-- Le catalogue OptiCentral affiche l'onglet « Création de ligne » dans le forfait Pro, mais
-- cet onglet demandait ai_optimization, réservé à Entreprise : un client Pro voyait l'onglet
-- puis un écran « non inclus dans votre forfait ».
-- Désormais, Pro inclut la création de ligne et l'optimisation des tournées
-- (ai_optimization, btn_ai_optimize). Entreprise garde l'analyse par IA des documents
-- (ai_pdf_analysis, page « Analyse par IA »), le multi-agences et l'intégration TMS/ERP.
update public.central_bridge
   set config = jsonb_set(config, '{plans,pro,features}',
         (config->'plans'->'pro'->'features') || '{"ai_optimization": true, "btn_ai_optimize": true}'::jsonb)
 where id = 1 and config->'plans'->'pro' is not null;

-- Licences Pro existantes : on ouvre ces deux options sans toucher aux autres réglages.
do $$
begin
  perform set_config('app.admin_context', 'true', true);
  update public.license_features f set ai_optimization = true, btn_ai_optimize = true
    from public.licenses l
   where l.id = f.license_id and l.plan_type = 'pro';
end $$;
