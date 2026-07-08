-- Align client_addresses write policies with client_contacts:
-- only users allowed to view a client's sensitive data can create/modify/delete its addresses.

DROP POLICY IF EXISTS client_addresses_insert_own_company ON public.client_addresses;
DROP POLICY IF EXISTS client_addresses_update_own_company ON public.client_addresses;
DROP POLICY IF EXISTS client_addresses_delete_own_company ON public.client_addresses;

CREATE POLICY client_addresses_insert_privileged
ON public.client_addresses
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (
    SELECT c.id
    FROM public.clients c
    WHERE c.license_id = get_user_license_id(auth.uid())
      AND can_view_client_sensitive_data(c.license_id)
  )
);

CREATE POLICY client_addresses_update_privileged
ON public.client_addresses
FOR UPDATE
TO authenticated
USING (
  client_id IN (
    SELECT c.id
    FROM public.clients c
    WHERE c.license_id = get_user_license_id(auth.uid())
      AND can_view_client_sensitive_data(c.license_id)
  )
)
WITH CHECK (
  client_id IN (
    SELECT c.id
    FROM public.clients c
    WHERE c.license_id = get_user_license_id(auth.uid())
      AND can_view_client_sensitive_data(c.license_id)
  )
);

CREATE POLICY client_addresses_delete_privileged
ON public.client_addresses
FOR DELETE
TO authenticated
USING (
  client_id IN (
    SELECT c.id
    FROM public.clients c
    WHERE c.license_id = get_user_license_id(auth.uid())
      AND can_view_client_sensitive_data(c.license_id)
  )
);