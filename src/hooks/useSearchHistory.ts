import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

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
  calculated: boolean; // Whether the route was actually calculated
}

const MAX_HISTORY_ENTRIES = 50;
const STORAGE_KEY = 'optiflow_search_history';

export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<SearchHistoryEntry[]>(STORAGE_KEY, []);

  // Add a new search entry to history
  const addSearch = useCallback((entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'>) => {
    // Only save if we have at least origin and destination
    if (!entry.originAddress || !entry.destinationAddress) {
      return null;
    }

    const newEntry: SearchHistoryEntry = {
      ...entry,
      id: crypto.randomUUID?.() || `search-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
    };

    setHistory(prev => {
      // Check for duplicate (same origin + destination + stops in last 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      const isDuplicate = prev.some(p => {
        if (new Date(p.timestamp).getTime() < fiveMinutesAgo) return false;
        if (p.originAddress !== entry.originAddress) return false;
        if (p.destinationAddress !== entry.destinationAddress) return false;
        if (p.stops.length !== entry.stops.length) return false;
        return true;
      });

      if (isDuplicate) {
        // Update the existing entry if calculated status changed
        return prev.map(p => {
          if (p.originAddress === entry.originAddress && 
              p.destinationAddress === entry.destinationAddress &&
              new Date(p.timestamp).getTime() >= fiveMinutesAgo) {
            return { ...p, calculated: entry.calculated || p.calculated };
          }
          return p;
        });
      }

      // Add new entry at the beginning, limit to max entries
      return [newEntry, ...prev].slice(0, MAX_HISTORY_ENTRIES);
    });

    return newEntry.id;
  }, [setHistory]);

  // Mark a search as calculated
  const markAsCalculated = useCallback((searchId: string) => {
    setHistory(prev => prev.map(entry => 
      entry.id === searchId ? { ...entry, calculated: true } : entry
    ));
  }, [setHistory]);

  // Update existing search by matching recent entries
  const updateRecentSearch = useCallback((
    originAddress: string,
    destinationAddress: string,
    updates: Partial<SearchHistoryEntry>
  ) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    
    setHistory(prev => prev.map(entry => {
      if (entry.originAddress === originAddress && 
          entry.destinationAddress === destinationAddress &&
          new Date(entry.timestamp).getTime() >= fiveMinutesAgo) {
        return { ...entry, ...updates };
      }
      return entry;
    }));
  }, [setHistory]);

  // Remove a specific entry
  const removeSearch = useCallback((searchId: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== searchId));
  }, [setHistory]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  // Get uncalculated searches (searches that were never calculated)
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
    addSearch,
    markAsCalculated,
    updateRecentSearch,
    removeSearch,
    clearHistory,
  };
}
