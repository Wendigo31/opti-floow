import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AddressSuggestion {
  id: string;
  address: string;
  placeId: string;
  streetNumber?: string;
  streetName?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  position?: {
    lat: number;
    lon: number;
  };
}

export function useAddressAutocomplete() {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddress = useCallback((query: string): void => {
    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        // HERE Autosuggest – PL-grade precision
        const { data, error } = await supabase.functions.invoke('here-search', {
          body: { query }
        });

        if (error) {
          console.error('HERE search error:', error);
          throw new Error('Search failed');
        }

        const results: AddressSuggestion[] = (data.items || [])
          .filter((item: any) => item.id && item.title)
          .map((item: any) => ({
            id: item.id,
            placeId: item.id,
            address: item.address?.label || item.title,
            streetName: item.address?.street,
            city: item.address?.city,
            postalCode: item.address?.postalCode,
            country: item.address?.countryName,
            position: item.position ? { lat: item.position.lat, lon: item.position.lng } : undefined,
          }));

        setSuggestions(results);
      } catch (error) {
        console.error('Address search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  // Get place details (coordinates) for a selected suggestion
  const getPlaceDetails = useCallback(async (placeId: string): Promise<{
    lat: number;
    lng: number;
    formattedAddress: string;
    addressComponents: {
      streetNumber?: string;
      streetName?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    };
  } | null> => {
    try {
      // HERE Lookup by place id
      const { data, error } = await supabase.functions.invoke('here-geocode', {
        body: { id: placeId }
      });

      if (error || !data) {
        console.error('HERE Lookup error:', error);
        return null;
      }

      // here-geocode returns either a single item (lookup) or { items: [...] } (geocode)
      const result = data.items?.[0] || data;
      const position = result.position;
      if (!position) return null;

      const addr = result.address || {};
      return {
        lat: position.lat,
        lng: position.lng,
        formattedAddress: addr.label || result.title || '',
        addressComponents: {
          streetNumber: addr.houseNumber,
          streetName: addr.street,
          city: addr.city,
          postalCode: addr.postalCode,
          country: addr.countryName,
        },
      };
    } catch (error) {
      console.error('Get place details error:', error);
      return null;
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    loading,
    searchAddress,
    getPlaceDetails,
    clearSuggestions,
  };
}
