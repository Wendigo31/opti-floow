import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EntityType = 'vehicle' | 'driver' | 'charge' | 'tour' | 'trip' | 'client' | 'quote' | 'trailer' | 'preset';
export type EventType = 'create' | 'update' | 'delete';

interface SyncEvent {
  id: string;
  license_id: string;
  user_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

interface LogEventParams {
  eventType: EventType;
  entityType: EntityType;
  entityId: string;
  eventData?: Record<string, unknown>;
}

/**
 * Hook to manage sync events for a company.
 * Logs all data modifications and provides a shared history across all users.
 */
export function useSyncEvents() {
  const [recentEvents, setRecentEvents] = useState<SyncEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);

  // Fetch recent events
  const fetchRecentEvents = useCallback(async (limit = 50) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      userIdRef.current = user.id;

      // Get user's license_id
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('license_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!companyUser?.license_id) {
        setIsLoading(false);
        return;
      }

      // Use state instead of ref so useEffect reacts
      setLicenseId(companyUser.license_id);

      // Fetch recent events
      const { data, error } = await supabase
        .from('company_sync_events')
        .select('*')
        .eq('license_id', companyUser.license_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching sync events:', error);
      } else {
        setRecentEvents((data as unknown as SyncEvent[]) || []);
      }
    } catch (err) {
      console.error('Error in fetchRecentEvents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Log a new sync event
  const logEvent = useCallback(async ({
    eventType,
    entityType,
    entityId,
    eventData,
  }: LogEventParams): Promise<boolean> => {
    try {
      let currentLicenseId = licenseId;
      let currentUserId = userIdRef.current;

      if (!currentLicenseId || !currentUserId) {
        // Try to get license_id if not set
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        currentUserId = user.id;
        userIdRef.current = user.id;

        const { data: companyUser } = await supabase
          .from('company_users')
          .select('license_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();

        if (!companyUser?.license_id) return false;
        currentLicenseId = companyUser.license_id;
        setLicenseId(currentLicenseId);
      }

      const insertData = {
        license_id: currentLicenseId,
        user_id: currentUserId,
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        event_data: (eventData as Record<string, unknown>) || null,
      };

      const { error } = await supabase
        .from('company_sync_events')
        .insert(insertData as any);

      if (error) {
        console.error('Error logging sync event:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in logEvent:', err);
      return false;
    }
  }, [licenseId]);

  // Get events for a specific entity
  const getEntityHistory = useCallback(async (entityType: EntityType, entityId: string) => {
    if (!licenseId) return [];

    const { data, error } = await supabase
      .from('company_sync_events')
      .select('*')
      .eq('license_id', licenseId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching entity history:', error);
      return [];
    }

    return (data as unknown as SyncEvent[]) || [];
  }, [licenseId]);

  // Initial fetch
  useEffect(() => {
    fetchRecentEvents();
  }, [fetchRecentEvents]);

  // Subscribe to realtime updates for new events - depend on licenseId state
  useEffect(() => {
    if (!licenseId) return;

    const channel = supabase
      .channel(`company_sync_events_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'company_sync_events',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          const newEvent = payload.new as SyncEvent;
          setRecentEvents(prev => [newEvent, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [licenseId]);

  return {
    recentEvents,
    isLoading,
    logEvent,
    getEntityHistory,
    refresh: fetchRecentEvents,
  };
}
