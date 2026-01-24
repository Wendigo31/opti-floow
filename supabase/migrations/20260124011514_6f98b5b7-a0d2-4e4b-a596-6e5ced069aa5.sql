-- Create table for exploitation role metric visibility configuration
-- Direction can configure which metrics are visible to Exploitation users

CREATE TABLE public.exploitation_metric_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL,
  
  -- Financial metrics visibility for Exploitation role
  can_view_revenue boolean DEFAULT true,
  can_view_margin boolean DEFAULT true,
  can_view_profit boolean DEFAULT true,
  can_view_fuel_cost boolean DEFAULT false,
  can_view_toll_cost boolean DEFAULT true,
  can_view_driver_cost boolean DEFAULT false,
  can_view_structure_cost boolean DEFAULT false,
  can_view_total_cost boolean DEFAULT false,
  can_view_price_per_km boolean DEFAULT true,
  
  -- Dashboard visibility
  can_view_dashboard_financials boolean DEFAULT true,
  can_view_forecast boolean DEFAULT false,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Unique constraint - one settings row per license
  CONSTRAINT exploitation_metric_settings_license_unique UNIQUE (license_id)
);

-- Enable RLS
ALTER TABLE public.exploitation_metric_settings ENABLE ROW LEVEL SECURITY;

-- Direction can view their company settings
CREATE POLICY "Direction can view settings"
  ON public.exploitation_metric_settings
  FOR SELECT
  USING (
    license_id IN (
      SELECT cu.license_id FROM company_users cu
      WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true
      AND cu.role IN ('direction', 'owner')
    )
  );

-- Direction can insert settings
CREATE POLICY "Direction can insert settings"
  ON public.exploitation_metric_settings
  FOR INSERT
  WITH CHECK (
    license_id IN (
      SELECT cu.license_id FROM company_users cu
      WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true
      AND cu.role IN ('direction', 'owner')
    )
  );

-- Direction can update settings
CREATE POLICY "Direction can update settings"
  ON public.exploitation_metric_settings
  FOR UPDATE
  USING (
    license_id IN (
      SELECT cu.license_id FROM company_users cu
      WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true
      AND cu.role IN ('direction', 'owner')
    )
  );

-- Exploitation can read their company settings (to know what they can see)
CREATE POLICY "Exploitation can view settings"
  ON public.exploitation_metric_settings
  FOR SELECT
  USING (
    license_id IN (
      SELECT cu.license_id FROM company_users cu
      WHERE cu.user_id = auth.uid() 
      AND cu.is_active = true
    )
  );

-- Service role full access
CREATE POLICY "Service role full access"
  ON public.exploitation_metric_settings
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create trigger for updated_at
CREATE TRIGGER update_exploitation_metric_settings_updated_at
  BEFORE UPDATE ON public.exploitation_metric_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();