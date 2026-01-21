/// <reference types="google.maps" />
import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader2, AlertTriangle, Scale, CircleSlash, Mountain, ArrowLeftRight } from 'lucide-react';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: typeof google;
  }
}

export interface RestrictionMarker {
  lat: number;
  lng: number;
  type: 'lowBridge' | 'weightLimit' | 'truckForbidden' | 'tunnel' | 'narrowRoad';
  value?: number;
  unit?: string;
  description: string;
}

interface MapPreviewProps {
  className?: string;
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    label: string;
    type?: 'start' | 'end' | 'stop' | 'default';
  }>;
  routeCoordinates?: [number, number][];
  restrictions?: RestrictionMarker[];
  showRestrictionsLegend?: boolean;
}

// Store Google Maps API loading state globally
let googleMapsPromise: Promise<void> | null = null;
let isGoogleMapsLoaded = false;

const loadGoogleMapsAPI = (): Promise<void> => {
  if (isGoogleMapsLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps) {
      isGoogleMapsLoaded = true;
      resolve();
      return;
    }

    // Fetch the API key from edge function
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-maps-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (!data.apiKey) {
          throw new Error('No API key returned');
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          isGoogleMapsLoaded = true;
          resolve();
        };
        
        script.onerror = () => {
          googleMapsPromise = null;
          reject(new Error('Failed to load Google Maps'));
        };
        
        document.head.appendChild(script);
      })
      .catch(err => {
        googleMapsPromise = null;
        reject(err);
      });
  });

  return googleMapsPromise;
};

// Custom marker URL based on type
const createMarkerIcon = (type?: 'start' | 'end' | 'stop' | 'default'): string => {
  const colors: Record<string, string> = {
    start: '22c55e',
    end: 'ef4444',
    stop: 'f97316',
    default: '3b82f6'
  };
  const color = colors[type || 'default'];
  
  // Use Google's chart API for custom markers
  return `https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|${color}|ffffff`;
};

// Create restriction marker icon as SVG data URL
const createRestrictionIcon = (type: RestrictionMarker['type']): google.maps.Icon => {
  const colors: Record<string, string> = {
    lowBridge: '#FF6B35',
    weightLimit: '#E63946',
    truckForbidden: '#D62828',
    tunnel: '#5C4033',
    narrowRoad: '#F4A261'
  };
  
  const symbols: Record<string, string> = {
    lowBridge: '🌉',
    weightLimit: '⚖',
    truckForbidden: '🚫',
    tunnel: '🚇',
    narrowRoad: '↔'
  };
  
  const color = colors[type] || '#6B7280';
  const symbol = symbols[type] || '⚠';
  
  // Create SVG marker
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="${color}"/>
      <circle cx="16" cy="14" r="10" fill="white"/>
      <text x="16" y="18" text-anchor="middle" font-size="12">${symbol}</text>
    </svg>
  `;
  
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(28, 35),
    anchor: new google.maps.Point(14, 35)
  };
};

export function MapPreview({ 
  className = '', 
  center = [46.603354, 1.888334],
  zoom = 6,
  markers = [],
  routeCoordinates = [],
  restrictions = [],
  showRestrictionsLegend = true
}: MapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const restrictionMarkersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      await loadGoogleMapsAPI();
      
      if (mapInstanceRef.current) return; // Already initialized

      const mapOptions: google.maps.MapOptions = {
        center: { lat: center[0], lng: center[1] },
        zoom: zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize Google Maps:', err);
      setError('Impossible de charger la carte');
      setIsLoading(false);
    }
  }, [center, zoom]);

  // Initialize on mount
  useEffect(() => {
    initMap();
    
    return () => {
      // Cleanup markers
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      
      // Cleanup restriction markers
      restrictionMarkersRef.current.forEach(m => m.setMap(null));
      restrictionMarkersRef.current = [];
      
      // Cleanup polyline
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [initMap]);

  // Update route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isGoogleMapsLoaded) return;

    // Remove existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (routeCoordinates.length > 0) {
      const path = routeCoordinates.map(coord => ({
        lat: coord[0],
        lng: coord[1]
      }));

      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#0ea5e9',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map
      });

      // Fit bounds to route
      const bounds = new google.maps.LatLngBounds();
      path.forEach(point => bounds.extend(point));
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }, [routeCoordinates]);

  // Update markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isGoogleMapsLoaded) return;

    // Remove existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData, index) => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.position[0], lng: markerData.position[1] },
        map,
        title: markerData.label,
        icon: createMarkerIcon(markerData.type),
        zIndex: markerData.type === 'start' ? 100 : markerData.type === 'end' ? 99 : 50 + index
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `<div style="font-weight: 500; padding: 4px;">${markerData.label}</div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers but no route
    if (markers.length > 0 && routeCoordinates.length === 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m.position[0], lng: m.position[1] }));
      
      if (markers.length === 1) {
        map.setCenter({ lat: markers[0].position[0], lng: markers[0].position[1] });
        map.setZoom(12);
      } else {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }
    }
  }, [markers, routeCoordinates.length]);

  // Update restriction markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isGoogleMapsLoaded) return;

    // Remove existing restriction markers
    restrictionMarkersRef.current.forEach(m => m.setMap(null));
    restrictionMarkersRef.current = [];

    // Add new restriction markers
    restrictions.forEach((restriction) => {
      const marker = new google.maps.Marker({
        position: { lat: restriction.lat, lng: restriction.lng },
        map,
        title: restriction.description,
        icon: createRestrictionIcon(restriction.type),
        zIndex: 200 // Above route markers
      });

      // Add info window with restriction details
      const valueInfo = restriction.value 
        ? `<div style="font-size: 14px; font-weight: bold; color: #E63946;">${restriction.value}${restriction.unit || ''}</div>`
        : '';
      
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <div style="font-weight: 600; margin-bottom: 4px; color: #1f2937;">${getRestrictionLabel(restriction.type)}</div>
            ${valueInfo}
            <div style="font-size: 12px; color: #6b7280;">${restriction.description}</div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      restrictionMarkersRef.current.push(marker);
    });
  }, [restrictions]);

  // Update center when no route/markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isGoogleMapsLoaded) return;

    if (routeCoordinates.length === 0 && markers.length === 0) {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
  }, [center, zoom, routeCoordinates.length, markers.length]);

  if (error) {
    return (
      <div className={`rounded-lg overflow-hidden bg-muted flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground p-4">
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-1">Vérifiez votre connexion internet</p>
        </div>
      </div>
    );
  }

  const restrictionTypes = [
    { type: 'lowBridge' as const, label: 'Pont bas', icon: AlertTriangle, color: '#FF6B35' },
    { type: 'weightLimit' as const, label: 'Limite poids', icon: Scale, color: '#E63946' },
    { type: 'truckForbidden' as const, label: 'Interdit PL', icon: CircleSlash, color: '#D62828' },
    { type: 'tunnel' as const, label: 'Tunnel', icon: Mountain, color: '#5C4033' },
    { type: 'narrowRoad' as const, label: 'Route étroite', icon: ArrowLeftRight, color: '#F4A261' },
  ];

  return (
    <div className={`rounded-lg overflow-hidden relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      <div 
        ref={mapRef} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      />
      
      {/* Restrictions Legend */}
      {showRestrictionsLegend && restrictions.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-2 z-20">
          <div className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            Restrictions PL ({restrictions.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictionTypes.map(({ type, label, icon: Icon, color }) => {
              const count = restrictions.filter(r => r.type === type).length;
              if (count === 0) return null;
              return (
                <div 
                  key={type}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  <Icon className="w-3 h-3" />
                  <span>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get label for restriction type
function getRestrictionLabel(type: RestrictionMarker['type']): string {
  const labels: Record<string, string> = {
    lowBridge: 'Pont bas - Hauteur limitée',
    weightLimit: 'Limitation de poids',
    truckForbidden: 'Interdit aux poids lourds',
    tunnel: 'Tunnel',
    narrowRoad: 'Route étroite'
  };
  return labels[type] || 'Restriction';
}
