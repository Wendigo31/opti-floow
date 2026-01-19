import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Truck, Route, Container, User } from 'lucide-react';
import { getUserLicenseId } from '@/hooks/useDataSync';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}

export function useRealtimeNotifications() {
  const currentUserIdRef = useRef<string | null>(null);
  const licenseIdRef = useRef<string | null>(null);
  const isSubscribedRef = useRef(false);

  const showNotification = useCallback((
    type: 'vehicle' | 'tour' | 'trailer',
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    itemName: string,
    creatorEmail?: string
  ) => {
    const currentUserId = currentUserIdRef.current;
    
    // Don't show notification for own actions
    if (!creatorEmail) return;
    
    const creatorName = creatorEmail.split('@')[0];
    
    const actionLabels = {
      INSERT: 'ajouté',
      UPDATE: 'modifié',
      DELETE: 'supprimé',
    };

    const typeLabels = {
      vehicle: 'véhicule',
      tour: 'tournée',
      trailer: 'remorque',
    };

    const icons = {
      vehicle: '🚚',
      tour: '🗺️',
      trailer: '📦',
    };

    toast.info(
      `${icons[type]} ${creatorName} a ${actionLabels[action]} ${typeLabels[type]}: ${itemName}`,
      {
        duration: 5000,
        position: 'top-right',
      }
    );
  }, []);

  const setupSubscriptions = useCallback(async () => {
    if (isSubscribedRef.current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    currentUserIdRef.current = user.id;
    const licenseId = await getUserLicenseId(user.id);
    
    if (!licenseId) {
      console.log('[Realtime] No license ID, skipping realtime subscriptions');
      return;
    }
    
    licenseIdRef.current = licenseId;
    isSubscribedRef.current = true;

    // Fetch company members for email lookup
    const { data: members } = await supabase
      .from('company_users')
      .select('user_id, email')
      .eq('license_id', licenseId)
      .eq('is_active', true);

    const memberMap = new Map<string, string>();
    members?.forEach(m => memberMap.set(m.user_id, m.email));

    // Subscribe to vehicles changes
    const vehicleChannel = supabase
      .channel('company-vehicles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_vehicles',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload: RealtimePayload) => {
          const record = payload.new || payload.old;
          const userId = record.user_id;
          
          // Skip own changes
          if (userId === currentUserIdRef.current) return;
          
          const creatorEmail = memberMap.get(userId);
          showNotification('vehicle', payload.eventType, record.name || 'Véhicule', creatorEmail);
        }
      )
      .subscribe();

    // Subscribe to trailers changes
    const trailerChannel = supabase
      .channel('company-trailers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_trailers',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload: RealtimePayload) => {
          const record = payload.new || payload.old;
          const userId = record.user_id;
          
          if (userId === currentUserIdRef.current) return;
          
          const creatorEmail = memberMap.get(userId);
          showNotification('trailer', payload.eventType, record.name || 'Remorque', creatorEmail);
        }
      )
      .subscribe();

    // Subscribe to saved tours changes
    const tourChannel = supabase
      .channel('company-tours')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_tours',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload: RealtimePayload) => {
          const record = payload.new || payload.old;
          const userId = record.user_id;
          
          // For tours, user_id might be the license code, so we check differently
          if (userId === currentUserIdRef.current) return;
          
          const creatorEmail = memberMap.get(userId);
          showNotification('tour', payload.eventType, record.name || 'Tournée', creatorEmail);
        }
      )
      .subscribe();

    console.log('[Realtime] Subscribed to company data changes');

    // Return cleanup function
    return () => {
      supabase.removeChannel(vehicleChannel);
      supabase.removeChannel(trailerChannel);
      supabase.removeChannel(tourChannel);
      isSubscribedRef.current = false;
    };
  }, [showNotification]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    setupSubscriptions().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [setupSubscriptions]);

  return {
    currentUserId: currentUserIdRef.current,
    licenseId: licenseIdRef.current,
  };
}
