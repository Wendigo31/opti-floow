-- Add policy to allow service_role to insert into login_history
CREATE POLICY "Service role can insert login_history" 
ON public.login_history 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Also allow service_role to select for admin functions
CREATE POLICY "Service role can read login_history" 
ON public.login_history 
FOR SELECT 
USING (auth.role() = 'service_role');