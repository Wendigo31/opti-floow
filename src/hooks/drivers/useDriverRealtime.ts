import { useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Driver } from '@/types';

export interface RealtimeHandlers {
  onCdiUpdate: Dispatch<SetStateAction<Driver[]>>;
  onCddUpdate: Dispatch<SetStateAction<Driver[]>>;
  onInterimUpdate: Dispatch<SetStateAction<Driver[]>>;
  onFetch?: () => void;
}

export function useDriverRealtime(
  licenseId: string | null,
  handlers: RealtimeHandlers
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(handlers);

  // Keep handlers in sync
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!licenseId) return;

    channelRef.current = supabase
      .channel(`drivers_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_drivers',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = (payload.new as any).driver_data as Driver;
            const type = (payload.new as any).driver_type;

            if (data) {
              if (type === 'interim') {
                handlersRef.current.onInterimUpdate(prev => {
                  const exists = prev.find(d => d.id === data.id);
                  return exists ? prev.map(d => d.id === data.id ? data : d) : [data, ...prev];
                });
              } else if (type === 'cdd') {
                handlersRef.current.onCddUpdate(prev => {
                  const exists = prev.find(d => d.id === data.id);
                  return exists ? prev.map(d => d.id === data.id ? data : d) : [data, ...prev];
                });
              } else {
                handlersRef.current.onCdiUpdate(prev => {
                  const exists = prev.find(d => d.id === data.id);
                  return exists ? prev.map(d => d.id === data.id ? data : d) : [data, ...prev];
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const oldPayload = payload.old as any;
            const localId = oldPayload.local_id || oldPayload.driver_data?.id;

            handlersRef.current.onCdiUpdate(prev => prev.filter(d => d.id !== localId));
            handlersRef.current.onCddUpdate(prev => prev.filter(d => d.id !== localId));
            handlersRef.current.onInterimUpdate(prev => prev.filter(d => d.id !== localId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] drivers subscription:', status);
        if (status === 'SUBSCRIBED' && handlersRef.current.onFetch) {
          void handlersRef.current.onFetch();
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId]);
}
