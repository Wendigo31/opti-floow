-- Table de configuration par société (remplace localStorage pour la config)
CREATE TABLE IF NOT EXISTS public.company_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  config_type TEXT NOT NULL, -- 'license_cache', 'sync_state', 'user_preferences'
  config_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID, -- user_id qui a fait la dernière modif
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(license_id, config_type)
);

-- Activer RLS
ALTER TABLE public.company_config ENABLE ROW LEVEL SECURITY;

-- Politique : les membres actifs de la société peuvent voir la config
CREATE POLICY "Company members can view config"
  ON public.company_config FOR SELECT
  USING (license_id = get_user_license_id(auth.uid()));

-- Politique : les membres actifs peuvent créer/modifier la config
CREATE POLICY "Company members can insert config"
  ON public.company_config FOR INSERT
  WITH CHECK (license_id = get_user_license_id(auth.uid()));

CREATE POLICY "Company members can update config"
  ON public.company_config FOR UPDATE
  USING (license_id = get_user_license_id(auth.uid()));

CREATE POLICY "Company members can delete config"
  ON public.company_config FOR DELETE
  USING (license_id = get_user_license_id(auth.uid()));

-- Table d'événements de synchronisation (journal partagé des modifications)
CREATE TABLE IF NOT EXISTS public.company_sync_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- qui a fait la modification
  event_type TEXT NOT NULL, -- 'vehicle_add', 'driver_update', 'tour_save', 'charge_delete', etc.
  entity_type TEXT NOT NULL, -- 'vehicle', 'driver', 'charge', 'tour', 'trip', 'client', 'quote'
  entity_id TEXT NOT NULL, -- ID de l'entité modifiée
  event_data JSONB, -- données de l'événement (optionnel, pour rollback)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_company_sync_events_license_id ON public.company_sync_events(license_id);
CREATE INDEX idx_company_sync_events_created_at ON public.company_sync_events(created_at DESC);
CREATE INDEX idx_company_sync_events_entity ON public.company_sync_events(license_id, entity_type, entity_id);

-- Activer RLS
ALTER TABLE public.company_sync_events ENABLE ROW LEVEL SECURITY;

-- Politique : les membres actifs de la société peuvent voir les événements
CREATE POLICY "Company members can view sync events"
  ON public.company_sync_events FOR SELECT
  USING (license_id = get_user_license_id(auth.uid()));

-- Politique : les membres actifs peuvent créer des événements
CREATE POLICY "Company members can create sync events"
  ON public.company_sync_events FOR INSERT
  WITH CHECK (license_id = get_user_license_id(auth.uid()) AND user_id = auth.uid());

-- Trigger pour auto-update updated_at sur company_config
CREATE TRIGGER update_company_config_updated_at
  BEFORE UPDATE ON public.company_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Activer Realtime pour les deux tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_sync_events;

-- Politique service role pour accès complet (edge functions)
CREATE POLICY "Service role full access config"
  ON public.company_config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access sync events"
  ON public.company_sync_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');