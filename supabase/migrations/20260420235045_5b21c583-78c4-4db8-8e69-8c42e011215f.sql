-- Tighten Realtime authorization: remove catch-all branch
DROP POLICY IF EXISTS "Users only receive own company broadcasts" ON realtime.messages;

CREATE POLICY "Users only receive own company broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Company-scoped topic must match the user's license
  (
    realtime.topic() LIKE 'company:%'
    AND realtime.topic() = 'company:' || COALESCE(public.get_user_license_id(auth.uid())::text, '__none__')
  )
  OR
  -- Personal user-scoped topic must match the authenticated user
  (
    realtime.topic() LIKE 'user:%'
    AND realtime.topic() = 'user:' || auth.uid()::text
  )
);