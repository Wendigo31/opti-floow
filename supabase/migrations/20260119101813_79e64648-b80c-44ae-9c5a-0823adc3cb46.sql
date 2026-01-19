-- Add license_id to saved_tours for company-level sync
ALTER TABLE public.saved_tours 
ADD COLUMN IF NOT EXISTS license_id uuid;

-- Add trailer_id and trailer_data columns if not exist
ALTER TABLE public.saved_tours 
ADD COLUMN IF NOT EXISTS trailer_id text,
ADD COLUMN IF NOT EXISTS trailer_data jsonb;

-- Create user_trailers table for company-level trailer sync
CREATE TABLE IF NOT EXISTS public.user_trailers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  license_id uuid,
  local_id text NOT NULL,
  name text NOT NULL,
  license_plate text,
  brand text,
  model text,
  year integer,
  trailer_type text DEFAULT 'tautliner',
  current_km integer DEFAULT 0,
  is_active boolean DEFAULT true,
  trailer_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  synced_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, local_id)
);

-- Enable RLS on user_trailers
ALTER TABLE public.user_trailers ENABLE ROW LEVEL SECURITY;

-- Drop existing saved_tours policies
DROP POLICY IF EXISTS "Users can view their own saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can create their own saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can update their own saved tours" ON public.saved_tours;
DROP POLICY IF EXISTS "Users can delete their own saved tours" ON public.saved_tours;

-- Create new saved_tours policies with company-level access
CREATE POLICY "Company members can view saved tours" ON public.saved_tours
FOR SELECT USING (
  user_id = (auth.uid())::text 
  OR license_id IN (
    SELECT license_id FROM company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can create saved tours" ON public.saved_tours
FOR INSERT WITH CHECK (
  user_id = (auth.uid())::text
);

CREATE POLICY "Company members can update saved tours" ON public.saved_tours
FOR UPDATE USING (
  user_id = (auth.uid())::text 
  OR license_id IN (
    SELECT license_id FROM company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can delete saved tours" ON public.saved_tours
FOR DELETE USING (
  user_id = (auth.uid())::text 
  OR license_id IN (
    SELECT license_id FROM company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create user_trailers RLS policies
CREATE POLICY "Users can create their own trailers" ON public.user_trailers
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Company members can view trailers" ON public.user_trailers
FOR SELECT USING (
  user_id = auth.uid() 
  OR license_id IN (
    SELECT license_id FROM company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can insert trailers" ON public.user_trailers
FOR INSERT WITH CHECK (
  user_id = auth.uid() 
  OR license_id IN (
    SELECT license_id FROM company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can update trailers" ON public.user_trailers
FOR UPDATE USING (
  user_id = auth.uid() 
  OR license_id IN (
    SELECT license_id FROM company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Company members can delete trailers" ON public.user_trailers
FOR DELETE USING (
  user_id = auth.uid() 
  OR license_id IN (
    SELECT license_id FROM company_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create trigger for updated_at on user_trailers
CREATE TRIGGER update_user_trailers_updated_at
BEFORE UPDATE ON public.user_trailers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();