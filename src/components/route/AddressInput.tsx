import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';
import { cn } from '@/lib/utils';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, position: { lat: number; lon: number }) => void;
  placeholder?: string;
  label?: string;
  icon?: 'start' | 'end';
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  onSelect,
  placeholder = "Entrez une adresse...",
  label,
  icon = 'start',
  className,
}: AddressInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectingPlace, setSelectingPlace] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSelectedRef = useRef<string>('');
  const { suggestions, loading, searchAddress, getPlaceDetails, clearSuggestions } = useAddressAutocomplete();

  // Search when value changes and input is focused
  // Using refs to avoid dependency issues and infinite loops
  const searchAddressRef = useRef(searchAddress);
  const clearSuggestionsRef = useRef(clearSuggestions);
  
  useEffect(() => {
    searchAddressRef.current = searchAddress;
    clearSuggestionsRef.current = clearSuggestions;
  });
  
  useEffect(() => {
    // Don't search if it's a recently selected value
    if (value === lastSelectedRef.current) {
      return;
    }
    
    if (value.length >= 3 && isFocused) {
      searchAddressRef.current(value);
      setShowSuggestions(true);
    } else if (value.length < 3) {
      clearSuggestionsRef.current();
      setShowSuggestions(false);
    }
  }, [value, isFocused]);

  // Show suggestions when they arrive
  useEffect(() => {
    if (suggestions.length > 0 && isFocused) {
      setShowSuggestions(true);
    }
  }, [suggestions, isFocused]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    lastSelectedRef.current = ''; // Reset last selection
    onChange(e.target.value);
  }, [onChange]);

  const handleSelect = useCallback(async (suggestion: { address: string; placeId: string }) => {
    setSelectingPlace(true);
    lastSelectedRef.current = suggestion.address; // Remember the selected value
    onChange(suggestion.address);
    setShowSuggestions(false);
    clearSuggestions();
    
    // Fetch place details to get coordinates
    const details = await getPlaceDetails(suggestion.placeId);
    setSelectingPlace(false);
    
    if (details) {
      onSelect(suggestion.address, { lat: details.lat, lon: details.lng });
    }
  }, [onChange, onSelect, clearSuggestions, getPlaceDetails]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show suggestions if we have them
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  }, [suggestions.length]);

  const handleBlur = useCallback(() => {
    // Delay to allow click on suggestion
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium mb-2 text-foreground">
          <MapPin className={cn(
            "w-4 h-4",
            icon === 'start' ? 'text-success' : 'text-destructive'
          )} />
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="pr-10"
          autoComplete="off"
        />
        {(loading || selectingPlace) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur before click
                handleSelect(suggestion);
              }}
              className="w-full px-4 py-3 text-left text-sm hover:bg-muted/50 transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-foreground truncate">{suggestion.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
