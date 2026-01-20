-- Create access_requests table for feature access requests
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_user_id UUID NOT NULL REFERENCES public.company_users(id) ON DELETE CASCADE,
  license_id UUID NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  requested_features TEXT[] NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_comment TEXT,
  processed_by TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own requests"
  ON public.access_requests FOR SELECT
  USING (company_user_id IN (
    SELECT id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their own requests"
  ON public.access_requests FOR INSERT
  WITH CHECK (company_user_id IN (
    SELECT id FROM public.company_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all requests for their company"
  ON public.access_requests FOR SELECT
  USING (license_id IN (
    SELECT license_id FROM public.company_users 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

CREATE POLICY "Service role full access"
  ON public.access_requests FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_access_requests_license_id ON public.access_requests(license_id);
CREATE INDEX idx_access_requests_status ON public.access_requests(status);
CREATE INDEX idx_access_requests_company_user ON public.access_requests(company_user_id);

-- Add last_activity_at to company_users for tracking
ALTER TABLE public.company_users ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- Create function to update user activity
CREATE OR REPLACE FUNCTION public.update_user_activity(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_users 
  SET last_activity_at = now(), updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_activity TO authenticated;

-- Create RPC to create access request (bypasses RLS for easier use)
CREATE OR REPLACE FUNCTION public.create_access_request(
  p_requested_features TEXT[],
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_user_id UUID;
  v_license_id UUID;
  v_new_id UUID;
BEGIN
  -- Get the company_user record for current user
  SELECT id, license_id INTO v_company_user_id, v_license_id
  FROM public.company_users
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  IF v_company_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in any company';
  END IF;
  
  INSERT INTO public.access_requests (
    company_user_id,
    license_id,
    requested_features,
    message
  ) VALUES (
    v_company_user_id,
    v_license_id,
    p_requested_features,
    p_message
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_access_request TO authenticated;

-- Create RPC to process access request (for admin)
CREATE OR REPLACE FUNCTION public.process_access_request(
  p_request_id UUID,
  p_status TEXT,
  p_comment TEXT DEFAULT NULL,
  p_processed_by TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.access_requests
  SET 
    status = p_status,
    admin_comment = p_comment,
    processed_by = p_processed_by,
    processed_at = now(),
    updated_at = now()
  WHERE id = p_request_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_access_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_access_request TO anon;