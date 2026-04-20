DROP POLICY IF EXISTS "Users can view their own license features" ON public.license_features;

CREATE POLICY "Users can view their own license features"
ON public.license_features
FOR SELECT
TO authenticated
USING (license_id = public.get_user_license_id(auth.uid()));