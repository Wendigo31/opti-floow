-- Conserve automatiquement les données de paie lors d'une modification par un membre non-Direction
CREATE OR REPLACE FUNCTION public.pick_driver_salary_keys(p_data jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT jsonb_object_agg(k, v)
       FROM jsonb_each(COALESCE(p_data, '{}'::jsonb)) AS e(k, v)
      WHERE k IN (
        'baseSalary','hourlyRate','patronalCharges',
        'mealAllowance','overnightAllowance',
        'sundayBonus','nightBonus','seniorityBonus','unloadingBonus',
        'interimHourlyRate','interimCoefficient'
      )),
    '{}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.pick_driver_salary_keys(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pick_driver_salary_keys(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.preserve_driver_salary_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Contexte admin explicite ou service_role : aucune restriction
  IF COALESCE(current_setting('app.admin_context', true), '') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Utilisateur authentifié qui n'a pas le droit de voir les salaires :
  -- on restaure les valeurs de paie existantes (il travaille sur une copie masquée)
  IF auth.uid() IS NOT NULL
     AND NOT public.is_company_owner(OLD.license_id, auth.uid()) THEN
    NEW.base_salary := OLD.base_salary;
    NEW.hourly_rate := OLD.hourly_rate;
    NEW.driver_data := public.strip_driver_salary_keys(COALESCE(NEW.driver_data, '{}'::jsonb))
                       || public.pick_driver_salary_keys(OLD.driver_data);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preserve_driver_salary ON public.user_drivers;
CREATE TRIGGER preserve_driver_salary
  BEFORE UPDATE ON public.user_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_driver_salary_on_update();