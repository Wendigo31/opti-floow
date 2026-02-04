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
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
        // Use Google Places Autocomplete via edge function
        // supabase.functions.invoke automatically includes the auth token
        const { data, error } = await supabase.functions.invoke('google-places-search', {
          body: { query }
        });

        if (error) {
          console.error('Google Places search error:', error);
          throw new Error('Search failed');
        }
        
        const results: AddressSuggestion[] = data.predictions?.map((prediction: any) => {
          return {
            id: prediction.place_id,
            placeId: prediction.place_id,
            address: prediction.description,
            city: prediction.structured_formatting?.secondary_text,
          };
        }) || [];

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
      // supabase.functions.invoke automatically includes the auth token
      const { data, error } = await supabase.functions.invoke('google-place-details', {
        body: { placeId }
      });

      if (error || !data.result) {
        console.error('Google Place Details error:', error);
        return null;
      }

      const result = data.result;
      const location = result.geometry?.location;
      
      // Extract address components
      const components = result.address_components || [];
      const addressComponents: any = {};
      
      for (const component of components) {
        if (component.types.includes('street_number')) {
          addressComponents.streetNumber = component.long_name;
        }
        if (component.types.includes('route')) {
          addressComponents.streetName = component.long_name;
        }
        if (component.types.includes('locality')) {
          addressComponents.city = component.long_name;
        }
        if (component.types.includes('postal_code')) {
          addressComponents.postalCode = component.long_name;
        }
        if (component.types.includes('country')) {
          addressComponents.country = component.long_name;
        }
      }

      return {
        lat: location?.lat,
        lng: location?.lng,
        formattedAddress: result.formatted_address,
        addressComponents,
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
