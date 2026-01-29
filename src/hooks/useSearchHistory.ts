import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Position {
  lat: number;
  lon: number;
}

interface Waypoint {
  id: string;
  address: string;
  position: Position | null;
}

export interface SearchHistoryEntry {
  id: string;
  timestamp: string;
  originAddress: string;
  originPosition: Position | null;
  destinationAddress: string;
  destinationPosition: Position | null;
  stops: Waypoint[];
  vehicleId: string | null;
  clientId: string | null;
  calculated: boolean;
}

interface DbSearchHistory {
  id: string;
  user_id: string;
  license_id: string | null;
  origin_address: string;
  origin_lat: number | null;
  origin_lon: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lon: number | null;
  stops: Waypoint[];
  vehicle_id: string | null;
  client_id: string | null;
  calculated: boolean;
  created_at: string;
  updated_at: string;
}

const MAX_HISTORY_ENTRIES = 50;

function dbToEntry(db: DbSearchHistory): SearchHistoryEntry {
  return {
    id: db.id,
    timestamp: db.created_at,
    originAddress: db.origin_address,
    originPosition: db.origin_lat && db.origin_lon ? { lat: db.origin_lat, lon: db.origin_lon } : null,
    destinationAddress: db.destination_address,
    destinationPosition: db.destination_lat && db.destination_lon ? { lat: db.destination_lat, lon: db.destination_lon } : null,
    stops: Array.isArray(db.stops) ? db.stops : [],
    vehicleId: db.vehicle_id,
    clientId: db.client_id,
    calculated: db.calculated,
  };
}

async function getUserLicenseId(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('company_users')
      .select('license_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();
    return data?.license_id || null;
  } catch {
    return null;
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch history from cloud
  const fetchHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHistory([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_ENTRIES);

      if (error) {
        console.error('Error fetching search history:', error);
        return;
      }

      const entries = (data || []).map((row) => dbToEntry(row as unknown as DbSearchHistory));
      setHistory(entries);
    } catch (e) {
      console.error('Error fetching search history:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('search_history_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'search_history',
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory]);

  // Add a new search entry to history
  const addSearch = useCallback(async (entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'>): Promise<string | null> => {
    if (!entry.originAddress || !entry.destinationAddress) {
      return null;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for duplicate in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data: existing } = await supabase
        .from('search_history')
        .select('id, calculated')
        .eq('origin_address', entry.originAddress)
        .eq('destination_address', entry.destinationAddress)
        .gte('created_at', fiveMinutesAgo)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing entry if calculated status changed
        if (entry.calculated && !existing[0].calculated) {
          await supabase
            .from('search_history')
            .update({ calculated: true, updated_at: new Date().toISOString() })
            .eq('id', existing[0].id);
        }
        return existing[0].id;
      }

      // Get license_id
      const licenseId = await getUserLicenseId(user.id);

      // Insert new entry using raw insert to avoid type issues with new table
      const insertData = {
        user_id: user.id,
        license_id: licenseId,
        origin_address: entry.originAddress,
        origin_lat: entry.originPosition?.lat || null,
        origin_lon: entry.originPosition?.lon || null,
        destination_address: entry.destinationAddress,
        destination_lat: entry.destinationPosition?.lat || null,
        destination_lon: entry.destinationPosition?.lon || null,
        stops: entry.stops as unknown as Record<string, unknown>[],
        vehicle_id: entry.vehicleId,
        client_id: entry.clientId,
        calculated: entry.calculated,
      };

      const { data, error } = await supabase
        .from('search_history')
        .insert(insertData as never)
        .select('id')
        .single();

      if (error) {
        console.error('Error adding search history:', error);
        return null;
      }

      return data?.id || null;
    } catch (e) {
      console.error('Error adding search history:', e);
      return null;
    }
  }, []);

  // Mark a search as calculated
  const markAsCalculated = useCallback(async (searchId: string) => {
    try {
      await supabase
        .from('search_history')
        .update({ calculated: true, updated_at: new Date().toISOString() })
        .eq('id', searchId);
    } catch (e) {
      console.error('Error marking search as calculated:', e);
    }
  }, []);

  // Update existing search by matching recent entries
  const updateRecentSearch = useCallback(async (
    originAddress: string,
    destinationAddress: string,
    updates: Partial<SearchHistoryEntry>
  ) => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.calculated !== undefined) updateData.calculated = updates.calculated;
      if (updates.vehicleId !== undefined) updateData.vehicle_id = updates.vehicleId;
      if (updates.clientId !== undefined) updateData.client_id = updates.clientId;

      await supabase
        .from('search_history')
        .update(updateData)
        .eq('origin_address', originAddress)
        .eq('destination_address', destinationAddress)
        .gte('created_at', fiveMinutesAgo);
    } catch (e) {
      console.error('Error updating search history:', e);
    }
  }, []);

  // Remove a specific entry
  const removeSearch = useCallback(async (searchId: string) => {
    try {
      await supabase
        .from('search_history')
        .delete()
        .eq('id', searchId);
    } catch (e) {
      console.error('Error removing search history:', e);
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('search_history')
        .delete()
        .eq('user_id', user.id);
    } catch (e) {
      console.error('Error clearing search history:', e);
    }
  }, []);

  // Get uncalculated searches
  const uncalculatedSearches = history.filter(entry => !entry.calculated);

  // Get recent searches (last 24 hours)
  const recentSearches = history.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return entryDate.getTime() >= oneDayAgo;
  });

  return {
    history,
    recentSearches,
    uncalculatedSearches,
    isLoading,
    addSearch,
    markAsCalculated,
    updateRecentSearch,
    removeSearch,
    clearHistory,
    refetch: fetchHistory,
  };
}
