import { useEffect, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

const stopIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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
}

export function MapPreview({ 
  className = '', 
  center = [46.603354, 1.888334],
  zoom = 6,
  markers = [],
  routeCoordinates = []
}: MapPreviewProps) {
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  const getMarkerIcon = (type?: 'start' | 'end' | 'stop' | 'default') => {
    switch (type) {
      case 'start': return startIcon;
      case 'end': return endIcon;
      case 'stop': return stopIcon;
      default: return defaultIcon;
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef || map) return;
    
    const leafletMap = L.map(mapRef).setView(center, zoom);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(leafletMap);
    
    setMap(leafletMap);
    
    return () => {
      leafletMap.remove();
    };
  }, [mapRef]);

  // Update view when center/zoom changes
  useEffect(() => {
    if (!map) return;
    
    if (routeCoordinates.length > 0) {
      const bounds = L.latLngBounds(routeCoordinates);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, routeCoordinates]);

  // Handle route polyline
  useEffect(() => {
    if (!map) return;
    
    // Clear existing polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline && !(layer instanceof L.Marker)) {
        map.removeLayer(layer);
      }
    });
    
    if (routeCoordinates.length > 0) {
      L.polyline(routeCoordinates, { 
        color: '#0ea5e9', 
        weight: 4, 
        opacity: 0.8 
      }).addTo(map);
    }
  }, [map, routeCoordinates]);

  // Handle markers
  useEffect(() => {
    if (!map) return;
    
    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });
    
    markers.forEach((marker) => {
      L.marker(marker.position, { icon: getMarkerIcon(marker.type) })
        .bindPopup(marker.label)
        .addTo(map);
    });
  }, [map, markers]);

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <div 
        ref={setMapRef} 
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      />
    </div>
  );
}
