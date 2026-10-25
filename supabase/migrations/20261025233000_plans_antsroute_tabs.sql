-- Les 3 forfaits (Essentiel 34 €, Pro 54 €, Entreprise 74 € HT par véhicule et par mois) : fonctionnalités et onglets. Rejouable.
update public.central_bridge set config = config || jsonb_build_object('plans', '{"start":{"license":{"max_drivers":null,"max_clients":null,"max_users":999,"hidden_pages":["/ai-analysis","/forecast","/vehicle-reports","/tenders","/line-montage"],"base_monthly_price":34,"billing_period":"monthly"},"features":{"dashboard_analytics":false,"forecast":false,"page_forecast":false,"monthly_tracking":false,"dynamic_charts":false,"margin_alerts":false,"cost_analysis":false,"client_analysis":false,"page_vehicle_reports":false,"page_toxic_clients":false,"auto_pricing":false,"smart_quotes":false,"pdf_export_pro":false,"ai_optimization":false,"ai_pdf_analysis":false,"page_ai_analysis":false,"btn_ai_optimize":false,"multi_agency":false,"tms_erp_integration":false,"basic_calculator":true,"itinerary_planning":true,"trip_history":true,"multi_drivers":true,"excel_export":true,"saved_tours":true,"multi_users":true,"unlimited_vehicles":true,"dashboard_basic":true,"cost_analysis_basic":true,"auto_pricing_basic":true,"client_analysis_basic":true}},"pro":{"license":{"max_drivers":null,"max_clients":null,"max_users":999,"hidden_pages":["/ai-analysis"],"base_monthly_price":54,"billing_period":"monthly"},"features":{"ai_optimization":false,"ai_pdf_analysis":false,"page_ai_analysis":false,"btn_ai_optimize":false,"multi_agency":false,"tms_erp_integration":false,"basic_calculator":true,"itinerary_planning":true,"trip_history":true,"multi_drivers":true,"excel_export":true,"saved_tours":true,"multi_users":true,"unlimited_vehicles":true,"dashboard_basic":true,"cost_analysis_basic":true,"auto_pricing_basic":true,"client_analysis_basic":true,"dashboard_analytics":true,"forecast":true,"page_forecast":true,"monthly_tracking":true,"dynamic_charts":true,"margin_alerts":true,"cost_analysis":true,"client_analysis":true,"page_vehicle_reports":true,"page_toxic_clients":true,"auto_pricing":true,"smart_quotes":true,"pdf_export_pro":true}},"enterprise":{"license":{"max_drivers":null,"max_clients":null,"max_users":999,"hidden_pages":[],"base_monthly_price":74,"billing_period":"monthly"},"features":{"basic_calculator":true,"itinerary_planning":true,"trip_history":true,"multi_drivers":true,"excel_export":true,"saved_tours":true,"multi_users":true,"unlimited_vehicles":true,"dashboard_basic":true,"cost_analysis_basic":true,"auto_pricing_basic":true,"client_analysis_basic":true,"dashboard_analytics":true,"forecast":true,"page_forecast":true,"monthly_tracking":true,"dynamic_charts":true,"margin_alerts":true,"cost_analysis":true,"client_analysis":true,"page_vehicle_reports":true,"page_toxic_clients":true,"auto_pricing":true,"smart_quotes":true,"pdf_export_pro":true,"ai_optimization":true,"ai_pdf_analysis":true,"page_ai_analysis":true,"btn_ai_optimize":true,"multi_agency":true,"tms_erp_integration":true}}}'::jsonb, 'default_plan', 'pro') where id = 1;
-- Onglets bloqués par le forfait : toujours masqués dans le logiciel (menu et lien direct),
-- même si un onglet a été réactivé à la main pour la société. Identique dans OptiFlow,
-- OptiFret et OptiXpress (onglets du forfait dans central_bridge.config->'plans'). Rejouable.
create or replace function public.company_access(p_license_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with cfg as (select public._plan_cfg() c),
  lic as (
    select l.*, to_jsonb(l) ->> coalesce((select c->>'plan_col' from cfg), 'plan') as plan_key
    from public.licenses l where l.id = p_license_id)
  select coalesce((
    select jsonb_build_object(
      'hidden_pages', (
        select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
          select unnest(coalesce(lic.hidden_pages, '{}'::text[])) x
          union
          select jsonb_array_elements_text(coalesce((select c->'plans'->lic.plan_key->'license'->'hidden_pages' from cfg), '[]'::jsonb))
        ) h),
      'plan', lic.plan_key,
      'contact_complete', coalesce(nullif(trim(lic.company_phone), ''), '') <> '' and coalesce(nullif(trim(lic.company_email), ''), '') <> '',
      'company_name', lic.company_name)
    from lic),
    jsonb_build_object('hidden_pages', '[]'::jsonb, 'contact_complete', true));
$$;
revoke all on function public.company_access(uuid) from public;
grant execute on function public.company_access(uuid) to anon, authenticated;
