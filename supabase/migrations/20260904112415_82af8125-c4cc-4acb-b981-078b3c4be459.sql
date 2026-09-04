CREATE OR REPLACE FUNCTION public.emit_company_sync_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_license uuid;
  v_user uuid;
  v_name text;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  v_license := v_row.license_id;
  IF v_license IS NULL THEN
    RETURN v_row;
  END IF;

  v_user := auth.uid();
  IF v_user IS NULL THEN
    BEGIN
      v_user := (to_jsonb(v_row)->>'user_id')::uuid;
    EXCEPTION WHEN others THEN
      v_user := NULL;
    END;
  END IF;
  IF v_user IS NULL THEN
    RETURN v_row;
  END IF;

  v_name := COALESCE(to_jsonb(v_row)->>'name', to_jsonb(v_row)->>'quote_number', to_jsonb(v_row)->>'destination_address');

  INSERT INTO public.company_sync_events (license_id, user_id, event_type, entity_type, entity_id, event_data)
  VALUES (
    v_license,
    v_user,
    lower(TG_OP),
    TG_TABLE_NAME,
    (to_jsonb(v_row)->>'id'),
    jsonb_build_object('name', v_name, 'source', 'trigger')
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.emit_company_sync_event() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_sync_event_trips ON public.trips;
CREATE TRIGGER trg_sync_event_trips
AFTER INSERT OR UPDATE OR DELETE ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.emit_company_sync_event();

DROP TRIGGER IF EXISTS trg_sync_event_quotes ON public.quotes;
CREATE TRIGGER trg_sync_event_quotes
AFTER INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.emit_company_sync_event();

DROP TRIGGER IF EXISTS trg_sync_event_saved_tours ON public.saved_tours;
CREATE TRIGGER trg_sync_event_saved_tours
AFTER INSERT OR UPDATE OR DELETE ON public.saved_tours
FOR EACH ROW EXECUTE FUNCTION public.emit_company_sync_event();

DROP TRIGGER IF EXISTS trg_sync_event_user_drivers ON public.user_drivers;
CREATE TRIGGER trg_sync_event_user_drivers
AFTER INSERT OR UPDATE OR DELETE ON public.user_drivers
FOR EACH ROW EXECUTE FUNCTION public.emit_company_sync_event();

-- Keep the events table lean
CREATE INDEX IF NOT EXISTS idx_company_sync_events_license_created ON public.company_sync_events (license_id, created_at DESC);