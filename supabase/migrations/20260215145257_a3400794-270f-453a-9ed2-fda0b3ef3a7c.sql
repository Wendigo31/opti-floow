-- Add missing UPDATE policy for search_history table
CREATE POLICY "search_history_update_own"
ON public.search_history
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());