import { useEffect, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, ArrowRightLeft, Flag, Loader2 } from 'lucide-react';
import { useTomTom } from '@/hooks/useTomTom';

// Custom marker icons
const startIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const relayIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const stopIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RelayPoint {
  location: string;
  km: number;
  driverOut: string;
  driverIn: string;
  estimatedTime: string;
  waitTime: number;
  notes?: string;
}

interface RouteSegment {
  from: string;
  to: string;
  distance: number;
  duration: number;
  driver: string;
  type: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

interface AIRouteMapProps {
  origin: string;
  destination: string;
  stops?: string[];
  relayPoints?: RelayPoint[];
  segments?: RouteSegment[];
  className?: string;
}

export function AIRouteMap({
  origin,
  destination,
  stops = [],
  relayPoints = [],
  segments = [],
  className = ''
}: AIRouteMapProps) {
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routeData, setRouteData] = useState<{
    coordinates: [number, number][];
    markers: Array<{
      position: [number, number];
      label: string;
      type: 'start' | 'end' | 'relay' | 'stop';
      popup: string;
    }>;
  } | null>(null);

  const { geocodeAddress, calculateRoute } = useTomTom();

  // Fetch route and geocode addresses
  useEffect(() => {
    if (!origin || !destination) return;

    const fetchRouteData = async () => {
      setIsLoading(true);
      try {
        // Geocode all addresses
        const allAddresses = [origin, ...stops, destination];
        const geocodeResults = await Promise.all(
          allAddresses.map(addr => geocodeAddress(addr))
        );

        const validResults = geocodeResults.filter(r => r !== null);
        if (validResults.length < 2) {
          console.error('Could not geocode addresses');
          setIsLoading(false);
          return;
        }

        // Calculate route
        const waypoints = validResults.map(r => ({
          lat: r!.position.lat,
          lon: r!.position.lon
        }));

        const route = await calculateRoute(waypoints);
        
        // Build markers
        const markers: Array<{
          position: [number, number];
          label: string;
          type: 'start' | 'end' | 'relay' | 'stop';
          popup: string;
        }> = [];

        // Start marker
        if (geocodeResults[0]) {
          markers.push({
            position: [geocodeResults[0].position.lat, geocodeResults[0].position.lon],
            label: 'Départ',
            type: 'start',
            popup: `<strong>🚀 Départ</strong><br/>${origin}`
          });
        }

        // Stop markers
        stops.forEach((stop, idx) => {
          const result = geocodeResults[idx + 1];
          if (result) {
            markers.push({
              position: [result.position.lat, result.position.lon],
              label: `Étape ${idx + 1}`,
              type: 'stop',
              popup: `<strong>📍 Étape ${idx + 1}</strong><br/>${stop}`
            });
          }
        });

        // End marker
        const lastResult = geocodeResults[geocodeResults.length - 1];
        if (lastResult) {
          markers.push({
            position: [lastResult.position.lat, lastResult.position.lon],
            label: 'Arrivée',
            type: 'end',
            popup: `<strong>🏁 Arrivée</strong><br/>${destination}`
          });
        }

        // Add relay points as approximate positions along the route
        if (route && route.coordinates.length > 0 && relayPoints.length > 0) {
          const totalDistance = route.distance;
          
          relayPoints.forEach((relay, idx) => {
            // Estimate position based on km
            const progress = relay.km / totalDistance;
            const coordIndex = Math.min(
              Math.floor(progress * route.coordinates.length),
              route.coordinates.length - 1
            );
            const coord = route.coordinates[coordIndex];
            
            markers.push({
              position: coord,
              label: relay.location,
              type: 'relay',
              popup: `
                <strong>🔄 Relais ${idx + 1}: ${relay.location}</strong><br/>
                <small>Km ${relay.km}</small><br/>
                <hr style="margin: 5px 0;"/>
                <strong>Sortant:</strong> ${relay.driverOut}<br/>
                <strong>Entrant:</strong> ${relay.driverIn}<br/>
                <strong>Heure:</strong> ${relay.estimatedTime}<br/>
                <strong>Attente:</strong> ${relay.waitTime} min
                ${relay.notes ? `<br/><small>${relay.notes}</small>` : ''}
              `
            });
          });
        }

        setRouteData({
          coordinates: route?.coordinates || [],
          markers
        });
      } catch (error) {
        console.error('Error fetching route data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRouteData();
  }, [origin, destination, stops.join(','), JSON.stringify(relayPoints)]);

  // Initialize map
  useEffect(() => {
    if (!mapRef || map) return;
    
    const leafletMap = L.map(mapRef).setView([46.603354, 1.888334], 6);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(leafletMap);
    
    setMap(leafletMap);
    
    return () => {
      leafletMap.remove();
    };
  }, [mapRef]);

  // Update map with route and markers
  useEffect(() => {
    if (!map || !routeData) return;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Re-add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    // Add route polyline
    if (routeData.coordinates.length > 0) {
      const routeLine = L.polyline(routeData.coordinates, { 
        color: '#8b5cf6', 
        weight: 5, 
        opacity: 0.8 
      }).addTo(map);

      // Fit bounds
      const bounds = L.latLngBounds(routeData.coordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Add markers
    routeData.markers.forEach((marker) => {
      let icon = stopIcon;
      switch (marker.type) {
        case 'start':
          icon = startIcon;
          break;
        case 'end':
          icon = endIcon;
          break;
        case 'relay':
          icon = relayIcon;
          break;
        case 'stop':
          icon = stopIcon;
          break;
      }

      L.marker(marker.position, { icon })
        .bindPopup(marker.popup)
        .addTo(map);
    });
  }, [map, routeData]);

  return (
    <div className={`rounded-xl overflow-hidden border border-border/50 bg-background ${className}`}>
      {/* Map Legend */}
      <div className="p-3 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" />
            Carte du trajet
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Départ</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Arrivée</span>
            </div>
            {relayPoints.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-violet-500" />
                <span>Relais</span>
              </div>
            )}
            {stops.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Étapes</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Chargement de la carte...</span>
            </div>
          </div>
        )}
        <div 
          ref={setMapRef} 
          style={{ height: '350px', width: '100%' }}
          className="z-0"
        />
      </div>

      {/* Relay Points Summary */}
      {relayPoints.length > 0 && (
        <div className="p-3 border-t border-border/50 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Points de relais ({relayPoints.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {relayPoints.map((relay, idx) => (
              <div 
                key={idx}
                className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                <span>{relay.location}</span>
                <span className="text-muted-foreground">({relay.km}km)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
