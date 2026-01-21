import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'saved_tours' | 'trips' | 'clients' | 'quotes';

interface UseRealtimeSyncOptions {
  table: TableName;
  licenseId: string | null;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to realtime changes on a table for company-level sync
 * Only triggers callbacks for records matching the company's license_id
 */
export function useRealtimeSync({
  table,
  licenseId,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Only subscribe if we have a license_id (company member) and enabled
    if (!licenseId || !enabled) {
      return;
    }

    // Create unique channel name for this table and license
    const channelName = `realtime_${table}_${licenseId}`;

    // Subscribe to changes
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          console.log(`[Realtime] ${table} INSERT:`, payload);
          onInsert?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          console.log(`[Realtime] ${table} UPDATE:`, payload);
          onUpdate?.(payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          console.log(`[Realtime] ${table} DELETE:`, payload);
          onDelete?.(payload);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
      });

    // Cleanup on unmount or when dependencies change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, licenseId, enabled, onInsert, onUpdate, onDelete]);

  return channelRef.current;
}

/**
 * Get the current user's license_id
 */
export async function getCurrentLicenseId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('company_users')
    .select('license_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.license_id || null;
}
