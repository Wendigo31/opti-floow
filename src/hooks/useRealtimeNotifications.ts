import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserLicenseId } from '@/hooks/useDataSync';
import type { NotificationPreferences } from '@/components/settings/NotificationSettings';

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
}

const getStoredPreferences = (): NotificationPreferences => {
  try {
    const stored = localStorage.getItem('optiflow_notification_prefs');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return {
    enabled: true,
    vehicles: true,
    trailers: true,
    tours: true,
    drivers: true,
    clients: true,
    quotes: true,
    trips: true,
    showOwnActions: false,
  };
};

export function useRealtimeNotifications() {
  const currentUserIdRef = useRef<string | null>(null);
  const licenseIdRef = useRef<string | null>(null);
  const isSubscribedRef = useRef(false);

  const showNotification = useCallback((
    type: 'vehicle' | 'tour' | 'trailer' | 'driver' | 'client' | 'quote' | 'trip',
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    itemName: string,
    creatorEmail?: string,
    isOwnAction?: boolean,
    creatorDisplayName?: string
  ) => {
    const prefs = getStoredPreferences();
    
    // Check if notifications are enabled
    if (!prefs.enabled) return;
    
    // Check category preference
    if (type === 'vehicle' && !prefs.vehicles) return;
    if (type === 'trailer' && !prefs.trailers) return;
    if (type === 'tour' && !prefs.tours) return;
    if (type === 'driver' && !prefs.drivers) return;
    if (type === 'client' && !prefs.clients) return;
    if (type === 'quote' && !prefs.quotes) return;
    if (type === 'trip' && !prefs.trips) return;
    
    // Check own actions preference
    if (isOwnAction && !prefs.showOwnActions) return;
    
    // Don't show notification if no creator info
    if (!creatorEmail && !isOwnAction) return;

    // Use display name if available, otherwise extract from email
    let creatorName: string;
    if (isOwnAction) {
      creatorName = 'Vous avez';
    } else if (creatorDisplayName) {
      creatorName = `${creatorDisplayName} a`;
    } else {
      creatorName = `${creatorEmail?.split('@')[0]} a`;
    }
    
    const actionLabels = {
      INSERT: 'ajouté',
      UPDATE: 'modifié',
      DELETE: 'supprimé',
    };

    const typeLabels = {
      vehicle: 'véhicule',
      tour: 'tournée',
      trailer: 'remorque',
      driver: 'conducteur',
      client: 'client',
      quote: 'devis',
      trip: 'trajet',
    };

    const icons = {
      vehicle: '🚚',
      tour: '🗺️',
      trailer: '📦',
      driver: '👤',
      client: '🏢',
      quote: '📋',
      trip: '📍',
    };

    toast.info(
      `${icons[type]} ${creatorName} ${actionLabels[action]} ${typeLabels[type]}: ${itemName}`,
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

    // Fetch company members for email and display_name lookup
    const { data: members } = await supabase
      .from('company_users')
      .select('user_id, email, display_name')
      .eq('license_id', licenseId)
      .eq('is_active', true);

    const memberMap = new Map<string, { email: string; displayName?: string }>();
    members?.forEach(m => {
      if (m.user_id) {
        memberMap.set(m.user_id, { email: m.email, displayName: m.display_name || undefined });
      }
    });

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
          const isOwnAction = userId === currentUserIdRef.current;
          
          const memberInfo = memberMap.get(userId);
          showNotification('vehicle', payload.eventType, record.name || 'Véhicule', memberInfo?.email, isOwnAction, memberInfo?.displayName);
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
          const isOwnAction = userId === currentUserIdRef.current;
          
          const memberInfo = memberMap.get(userId);
          showNotification('trailer', payload.eventType, record.name || 'Remorque', memberInfo?.email, isOwnAction, memberInfo?.displayName);
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
          const isOwnAction = userId === currentUserIdRef.current;
          
          const memberInfo = memberMap.get(userId);
          showNotification('tour', payload.eventType, record.name || 'Tournée', memberInfo?.email, isOwnAction, memberInfo?.displayName);
        }
      )
      .subscribe();

    // Subscribe to drivers changes
    const driverChannel = supabase
      .channel('company-drivers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_drivers',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload: RealtimePayload) => {
          const record = payload.new || payload.old;
          const userId = record.user_id;
          const isOwnAction = userId === currentUserIdRef.current;
          
          const memberInfo = memberMap.get(userId);
          showNotification('driver', payload.eventType, record.name || 'Conducteur', memberInfo?.email, isOwnAction, memberInfo?.displayName);
        }
      )
      .subscribe();

    // Subscribe to clients changes
    const clientChannel = supabase
      .channel('company-clients')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload: RealtimePayload) => {
          const record = payload.new || payload.old;
          const userId = record.user_id;
          const isOwnAction = userId === currentUserIdRef.current;
          
          const memberInfo = memberMap.get(userId);
          showNotification('client', payload.eventType, record.name || record.company || 'Client', memberInfo?.email, isOwnAction, memberInfo?.displayName);
        }
      )
      .subscribe();

    // Subscribe to quotes changes
    const quoteChannel = supabase
      .channel('company-quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload: RealtimePayload) => {
          const record = payload.new || payload.old;
          const userId = record.user_id;
          const isOwnAction = userId === currentUserIdRef.current;
          
          const memberInfo = memberMap.get(userId);
          const quoteName = record.quote_number || `${record.origin_address?.substring(0, 15)}... → ${record.destination_address?.substring(0, 15)}...`;
          showNotification('quote', payload.eventType, quoteName, memberInfo?.email, isOwnAction, memberInfo?.displayName);
        }
      )
      .subscribe();

    // Subscribe to trips changes
    const tripChannel = supabase
      .channel('company-trips')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload: RealtimePayload) => {
          const record = payload.new || payload.old;
          const userId = record.user_id;
          const isOwnAction = userId === currentUserIdRef.current;
          
          const memberInfo = memberMap.get(userId);
          const tripName = `${record.origin_address?.substring(0, 15)}... → ${record.destination_address?.substring(0, 15)}...`;
          showNotification('trip', payload.eventType, tripName, memberInfo?.email, isOwnAction, memberInfo?.displayName);
        }
      )
      .subscribe();

    console.log('[Realtime] Subscribed to company data changes');

    // Return cleanup function
    return () => {
      supabase.removeChannel(vehicleChannel);
      supabase.removeChannel(trailerChannel);
      supabase.removeChannel(tourChannel);
      supabase.removeChannel(driverChannel);
      supabase.removeChannel(clientChannel);
      supabase.removeChannel(quoteChannel);
      supabase.removeChannel(tripChannel);
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
