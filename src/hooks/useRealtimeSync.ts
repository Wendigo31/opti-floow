import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 'saved_tours' | 'trips' | 'clients' | 'quotes' | 'user_charges' | 'user_vehicles' | 'user_drivers' | 'user_trailers' | 'company_settings';

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
 * Hook to subscribe to multiple company tables at once for full company sync
 */
export function useCompanyRealtimeSync({
  licenseId,
  onDataChange,
  enabled = true,
}: {
  licenseId: string | null;
  onDataChange: (table: TableName, eventType: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;
  enabled?: boolean;
}) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Use ref to store callback to avoid re-subscription on callback changes
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  useEffect(() => {
    if (!licenseId || !enabled) {
      return;
    }

    // Don't re-subscribe if we already have a channel for this license
    if (channelRef.current) {
      return;
    }

    const channelName = `company_sync_${licenseId}`;
    const tables: TableName[] = ['user_charges', 'user_vehicles', 'user_drivers', 'user_trailers', 'saved_tours', 'trips', 'clients', 'quotes', 'company_settings'];

    console.log(`[CompanySync] Setting up realtime subscription for license: ${licenseId}`);

    let channel = supabase.channel(channelName);

    // Subscribe to all tables
    for (const table of tables) {
      channel = channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table,
            filter: `license_id=eq.${licenseId}`,
          },
          (payload) => {
            console.log(`[CompanySync] ${table} INSERT:`, payload);
            onDataChangeRef.current(table, 'INSERT', payload);
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
            console.log(`[CompanySync] ${table} UPDATE:`, payload);
            onDataChangeRef.current(table, 'UPDATE', payload);
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
            console.log(`[CompanySync] ${table} DELETE:`, payload);
            onDataChangeRef.current(table, 'DELETE', payload);
          }
        );
    }

    channelRef.current = channel.subscribe((status) => {
      console.log(`[CompanySync] Subscription status for ${licenseId}:`, status);
      if (status === 'SUBSCRIBED') {
        console.log(`[CompanySync] ✅ Successfully subscribed to realtime updates`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[CompanySync] ❌ Channel error - check if tables have REPLICA IDENTITY FULL`);
      }
    });

    return () => {
      if (channelRef.current) {
        console.log(`[CompanySync] Cleaning up subscription for ${licenseId}`);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId, enabled]); // Removed onDataChange from deps - using ref instead

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
