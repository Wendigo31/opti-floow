import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TruckRestriction {
  lat: number;
  lng: number;
  type: 'lowBridge' | 'weightLimit' | 'truckForbidden' | 'tunnel' | 'narrowRoad';
  value?: number;
  unit?: string;
  description: string;
}

interface UseTruckRestrictionsResult {
  restrictions: TruckRestriction[];
  loading: boolean;
  error: string | null;
  fetchRestrictions: (
    routeCoordinates: [number, number][],
    vehicleParams?: {
      height?: number;
      weight?: number;
      width?: number;
      length?: number;
    }
  ) => Promise<TruckRestriction[]>;
  clearRestrictions: () => void;
}

export function useTruckRestrictions(): UseTruckRestrictionsResult {
  const [restrictions, setRestrictions] = useState<TruckRestriction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRestrictions = useCallback(async (
    routeCoordinates: [number, number][],
    vehicleParams?: {
      height?: number;
      weight?: number;
      width?: number;
      length?: number;
    }
  ): Promise<TruckRestriction[]> => {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('truck-restrictions', {
        body: {
          routeCoordinates,
          vehicleHeight: vehicleParams?.height,
          vehicleWeight: vehicleParams?.weight,
          vehicleWidth: vehicleParams?.width,
          vehicleLength: vehicleParams?.length,
        }
      });

      if (fnError) {
        console.error('Error fetching truck restrictions:', fnError);
        setError('Impossible de récupérer les restrictions PL');
        return [];
      }

      const fetchedRestrictions = data?.restrictions || [];
      setRestrictions(fetchedRestrictions);
      return fetchedRestrictions;
    } catch (err) {
      console.error('Error in useTruckRestrictions:', err);
      setError('Erreur lors de la récupération des restrictions');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clearRestrictions = useCallback(() => {
    setRestrictions([]);
    setError(null);
  }, []);

  return {
    restrictions,
    loading,
    error,
    fetchRestrictions,
    clearRestrictions,
  };
}

// Helper to get icon info for a restriction type
export function getRestrictionIcon(type: TruckRestriction['type']): {
  color: string;
  label: string;
  emoji: string;
} {
  switch (type) {
    case 'lowBridge':
      return { color: '#FF6B35', label: 'Pont bas', emoji: '🌉' };
    case 'weightLimit':
      return { color: '#E63946', label: 'Limite poids', emoji: '⚖️' };
    case 'truckForbidden':
      return { color: '#D62828', label: 'Interdit PL', emoji: '🚫' };
    case 'tunnel':
      return { color: '#5C4033', label: 'Tunnel', emoji: '🚇' };
    case 'narrowRoad':
      return { color: '#F4A261', label: 'Route étroite', emoji: '↔️' };
    default:
      return { color: '#6B7280', label: 'Restriction', emoji: '⚠️' };
  }
}
