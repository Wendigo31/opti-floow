-- Compléter le temps réel pour la synchro OptiPlan <-> OptiFlow
-- 1) REPLICA IDENTITY FULL sur les tables qui ne l'ont pas encore
ALTER TABLE public.company_users REPLICA IDENTITY FULL;
ALTER TABLE public.client_contacts REPLICA IDENTITY FULL;
ALTER TABLE public.exploitation_metric_settings REPLICA IDENTITY FULL;
ALTER TABLE public.user_feature_overrides REPLICA IDENTITY FULL;

-- 2) Ajout à la publication supabase_realtime (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='company_users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='client_addresses') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_addresses;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='client_contacts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_contacts;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='exploitation_metric_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exploitation_metric_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_feature_overrides') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_feature_overrides;
  END IF;
END $$;