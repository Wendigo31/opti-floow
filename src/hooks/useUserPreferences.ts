import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UserPreferences {
  id: string;
  user_id: string;
  selected_driver_ids: string[];
  selected_vehicle_id: string | null;
  selected_trailer_id: string | null;
  sidebar_collapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en' | 'es';
  default_pricing_mode: string;
  default_target_margin: number;
  default_price_per_km: number;
  default_chart_type: string;
  show_ai_panel: boolean;
  custom_working_days: Record<number, number>;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  selected_driver_ids: [],
  selected_vehicle_id: null,
  selected_trailer_id: null,
  sidebar_collapsed: false,
  theme: 'system',
  language: 'fr',
  default_pricing_mode: 'km',
  default_target_margin: 15,
  default_price_per_km: 1.70,
  default_chart_type: 'bar',
  show_ai_panel: true,
  custom_working_days: {},
};

// Helper to bypass TypeScript until types are regenerated
const getPreferencesTable = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from('user_preferences');
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Reset state when user changes
  const resetState = useCallback(() => {
    setPreferences(null);
    setLoading(true);
    setUserId(null);
    currentUserIdRef.current = null;
    
    // Clear any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Cleanup realtime channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Fetch preferences for current user
  const fetchPreferences = useCallback(async (authUserId: string) => {
    // Skip if we already have this user's data
    if (currentUserIdRef.current === authUserId && preferences) {
      setLoading(false);
      return;
    }

    console.log('[UserPreferences] Fetching for user:', authUserId);
    setLoading(true);
    currentUserIdRef.current = authUserId;
    setUserId(authUserId);

    try {
      const { data, error } = await getPreferencesTable()
        .select('*')
        .eq('user_id', authUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        console.log('[UserPreferences] Found existing preferences');
        setPreferences(data as UserPreferences);
      } else {
        // Create default preferences for new user
        console.log('[UserPreferences] Creating default preferences for new user');
        const { data: newPrefs, error: createError } = await getPreferencesTable()
          .insert({
            user_id: authUserId,
            ...DEFAULT_PREFERENCES,
          })
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(newPrefs as UserPreferences);
      }
    } catch (error) {
      console.error('[useUserPreferences] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [preferences]);

  // Listen for auth state changes to detect user switching
  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    const initFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (user) {
        await fetchPreferences(user.id);
      } else {
        resetState();
        setLoading(false);
      }
    };

    void initFetch();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log('[UserPreferences] Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        resetState();
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Check if user has actually changed
          if (currentUserIdRef.current !== session.user.id) {
            console.log('[UserPreferences] User changed, resetting state');
            resetState();
            await fetchPreferences(session.user.id);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchPreferences, resetState]);

  // Setup realtime subscription for cross-device sync
  useEffect(() => {
    if (!userId) return;

    channelRef.current = supabase
      .channel(`user_preferences_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[UserPreferences] Realtime update:', payload);
          setPreferences(payload.new as UserPreferences);
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  // Debounced save to avoid too many writes
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!userId || !preferences) return;

    // Optimistic update
    setPreferences(prev => prev ? { ...prev, ...updates } : null);

    // Debounce the actual save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await getPreferencesTable()
          .update(updates)
          .eq('user_id', userId);

        if (error) throw error;
        console.log('[UserPreferences] Saved:', Object.keys(updates));
      } catch (error) {
        console.error('[UserPreferences] Save error:', error);
        toast.error('Erreur de sauvegarde des préférences');
      }
    }, 1000);
  }, [userId, preferences]);

  // Specific update helpers
  const setSelectedDriverIds = useCallback((ids: string[]) => {
    updatePreferences({ selected_driver_ids: ids });
  }, [updatePreferences]);

  const setSelectedVehicleId = useCallback((id: string | null) => {
    updatePreferences({ selected_vehicle_id: id });
  }, [updatePreferences]);

  const setSelectedTrailerId = useCallback((id: string | null) => {
    updatePreferences({ selected_trailer_id: id });
  }, [updatePreferences]);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    updatePreferences({ sidebar_collapsed: collapsed });
  }, [updatePreferences]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    updatePreferences({ theme });
  }, [updatePreferences]);

  const setLanguage = useCallback((language: 'fr' | 'en' | 'es') => {
    updatePreferences({ language });
  }, [updatePreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    setSelectedDriverIds,
    setSelectedVehicleId,
    setSelectedTrailerId,
    setSidebarCollapsed,
    setTheme,
    setLanguage,
  };
}
