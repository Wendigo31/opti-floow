import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Fallback realtime channel for tables whose direct SELECT is Direction-only
 * (user_drivers, trips, quotes, saved_tours).
 *
 * Non-Direction members no longer receive `postgres_changes` on those tables
 * (RLS filters the payload). A DB trigger publishes a lightweight, non-sensitive
 * event into `company_sync_events` for every change; this hook listens to it and
 * triggers a debounced refetch through the masked RPC path.
 */
export function useCompanySyncRefetch(
  licenseId: string | null | undefined,
  entityType: 'user_drivers' | 'trips' | 'quotes' | 'saved_tours',
  refetch: () => void | Promise<unknown>,
  options?: { debounceMs?: number; skipUserId?: string | null }
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refetchRef = useRef(refetch);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipUserRef = useRef(options?.skipUserId ?? null);
  const debounceMs = options?.debounceMs ?? 400;

  useEffect(() => { refetchRef.current = refetch; }, [refetch]);
  useEffect(() => { skipUserRef.current = options?.skipUserId ?? null; }, [options?.skipUserId]);

  useEffect(() => {
    if (!licenseId) return;

    channelRef.current = supabase
      .channel(`sync_refetch_${entityType}_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_sync_events',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          const event = payload.new as { entity_type?: string; user_id?: string };
          if (event.entity_type !== entityType) return;
          // Own changes are already applied locally (optimistic / direct channel)
          if (skipUserRef.current && event.user_id === skipUserRef.current) return;

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            void refetchRef.current();
          }, debounceMs);
        }
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId, entityType, debounceMs]);
}
