-- Create a security definer function to update company_user on first login
-- This bypasses RLS for the specific case of updating user_id on first login
CREATE OR REPLACE FUNCTION public.link_user_to_company(
  p_company_user_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_users
  SET 
    user_id = p_user_id,
    accepted_at = NOW(),
    is_active = true
  WHERE id = p_company_user_id
    -- Only update if user_id is a placeholder (random UUID not in auth.users)
    AND NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = company_users.user_id
    );
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users (edge functions use service role anyway)
GRANT EXECUTE ON FUNCTION public.link_user_to_company(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.link_user_to_company(uuid, uuid) TO authenticated;