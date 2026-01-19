-- Add missing columns to license_features table
ALTER TABLE public.license_features
ADD COLUMN IF NOT EXISTS dashboard_basic BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS cost_analysis_basic BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_pricing_basic BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS client_analysis_basic BOOLEAN DEFAULT false;