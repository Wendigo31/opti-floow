import { useEffect, useRef, useCallback, useState } from 'react';
import { Loader2, AlertTriangle, Scale, CircleSlash, Mountain, ArrowLeftRight } from 'lucide-react';

// HERE Maps types (loose - the SDK injects window.H at runtime)
declare global {
  interface Window {
    H?: any;
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

// HERE Maps JS API v3.1 — multi-script loader (singleton)
let hereMapsPromise: Promise<void> | null = null;
let isHereMapsLoaded = false;
let cachedApiKey: string | null = null;

const HERE_SCRIPTS = [
  'https://js.api.here.com/v3/3.1/mapsjs-core.js',
  'https://js.api.here.com/v3/3.1/mapsjs-service.js',
  'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js',
  'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
];
const HERE_UI_CSS = 'https://js.api.here.com/v3/3.1/mapsjs-ui.css';

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false; // preserve order
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });

const loadHereMapsAPI = (): Promise<void> => {
  if (isHereMapsLoaded && window.H?.Map) return Promise.resolve();
  if (hereMapsPromise) return hereMapsPromise;

  hereMapsPromise = (async () => {
    // Load CSS once
    if (!document.querySelector(`link[href="${HERE_UI_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = HERE_UI_CSS;
      document.head.appendChild(link);
    }

    // Fetch API key from edge function (cached)
    if (!cachedApiKey) {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/here-maps-key`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error(`HERE key fetch failed: ${res.status}`);
      const data = await res.json();
      if (!data.apiKey) throw new Error('No HERE API key returned');
      cachedApiKey = data.apiKey;
    }

    // Load scripts in order (sequentially, since they depend on each other)
    for (const src of HERE_SCRIPTS) {
      await loadScript(src);
    }

    if (!window.H?.Map) {
      throw new Error('HERE Maps loaded but H.Map not available');
    }
    isHereMapsLoaded = true;
  })().catch((err) => {
    hereMapsPromise = null;
    throw err;
  });

  return hereMapsPromise;
};

const MARKER_COLORS: Record<string, string> = {
  start: '#22c55e',
  end: '#ef4444',
  stop: '#f97316',
  default: '#3b82f6',
};

const RESTRICTION_COLORS: Record<string, string> = {
  lowBridge: '#FF6B35',
  weightLimit: '#E63946',
  truckForbidden: '#D62828',
  tunnel: '#5C4033',
  narrowRoad: '#F4A261',
};

const RESTRICTION_SYMBOLS: Record<string, string> = {
  lowBridge: '🌉',
  weightLimit: '⚖',
  truckForbidden: '🚫',
  tunnel: '🚇',
  narrowRoad: '↔',
};

function getRestrictionLabel(type: RestrictionMarker['type']): string {
  const labels: Record<string, string> = {
    lowBridge: 'Pont bas - Hauteur limitée',
    weightLimit: 'Limitation de poids',
    truckForbidden: 'Interdit aux poids lourds',
    tunnel: 'Tunnel',
    narrowRoad: 'Route étroite',
  };
  return labels[type] || 'Restriction';
}

// Build a HERE H.map.Icon from inline SVG
const buildPinIcon = (color: string): any => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 18 12 18s12-9 12-18C24 5.373 18.627 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="10" r="5" fill="white"/>
  </svg>`;
  return new window.H.map.Icon(svg, { anchor: { x: 12, y: 36 } });
};

const buildRestrictionIcon = (type: RestrictionMarker['type']): any => {
  const color = RESTRICTION_COLORS[type] || '#6B7280';
  const symbol = RESTRICTION_SYMBOLS[type] || '⚠';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="35" viewBox="0 0 32 40">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24C32 7.163 24.837 0 16 0z" fill="${color}"/>
    <circle cx="16" cy="14" r="10" fill="white"/>
    <text x="16" y="18" text-anchor="middle" font-size="12">${symbol}</text>
  </svg>`;
  return new window.H.map.Icon(svg, { anchor: { x: 14, y: 35 } });
};

export function MapPreview({
  className = '',
  center = [46.603354, 1.888334],
  zoom = 6,
  markers = [],
  routeCoordinates = [],
  restrictions = [],
  showRestrictionsLegend = true,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const platformRef = useRef<any>(null);
  const behaviorRef = useRef<any>(null);
  const uiRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const restrictionsGroupRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize HERE Map
  const initMap = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      await loadHereMapsAPI();
      if (mapRef.current) return; // already initialized

      const H = window.H;
      const platform = new H.service.Platform({ apikey: cachedApiKey });
      platformRef.current = platform;

      const defaultLayers = platform.createDefaultLayers({
        lg: 'fre',
      });

      // Prefer the "truck" vector style when available — it emphasises road
      // numbers (A1, N7, D920…), motorway/national/departmental classes and
      // street names, which is exactly what the user asked for.
      const baseLayer =
        defaultLayers.vector?.normal?.truck ||
        defaultLayers.vector?.normal?.logistics ||
        defaultLayers.vector.normal.map;

      const map = new H.Map(
        containerRef.current,
        baseLayer,
        {
          center: { lat: center[0], lng: center[1] },
          zoom,
          pixelRatio: window.devicePixelRatio || 1,
        }
      );
      mapRef.current = map;

      // Enable interaction & UI — explicitly enable all behaviors
      const mapEvents = new H.mapevents.MapEvents(map);
      const behavior = new H.mapevents.Behavior(mapEvents);
      // Ensure pan, zoom (wheel + pinch), and double-tap zoom are all on
      const B = H.mapevents.Behavior;
      behavior.enable(
        B.DRAGGING | B.WHEELZOOM | B.PINCHZOOM | B.DBLTAPZOOM
      );
      behaviorRef.current = behavior;
      uiRef.current = H.ui.UI.createDefault(map, defaultLayers, 'fr-FR');

      // Init groups
      markersGroupRef.current = new H.map.Group();
      restrictionsGroupRef.current = new H.map.Group();
      map.addObject(markersGroupRef.current);
      map.addObject(restrictionsGroupRef.current);

      // Handle container resize
      resizeObserverRef.current = new ResizeObserver(() => {
        try {
          map.getViewPort().resize();
        } catch {
          /* noop */
        }
      });
      resizeObserverRef.current.observe(containerRef.current);

      // Force an initial resize after layout settles (fixes interaction bugs
      // when container starts at 0px or grows after mount)
      requestAnimationFrame(() => {
        try { map.getViewPort().resize(); } catch { /* noop */ }
      });

      setIsLoading(false);
      setMapReady(true);
    } catch (err) {
      console.error('Failed to initialize HERE Maps:', err);
      setError('Impossible de charger la carte');
      setIsLoading(false);
    }
  }, [center, zoom]);

  useEffect(() => {
    initMap();
    return () => {
      try {
        resizeObserverRef.current?.disconnect();
        resizeObserverRef.current = null;
        if (mapRef.current) {
          mapRef.current.dispose();
          mapRef.current = null;
        }
        markersGroupRef.current = null;
        restrictionsGroupRef.current = null;
        polylineRef.current = null;
        uiRef.current = null;
        behaviorRef.current = null;
        platformRef.current = null;
      } catch (e) {
        console.warn('HERE Map cleanup error:', e);
      }
    };
  }, [initMap]);

  // Update route polyline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !window.H) return;
    const H = window.H;

    if (polylineRef.current) {
      map.removeObject(polylineRef.current);
      polylineRef.current = null;
    }

    if (routeCoordinates.length > 0) {
      const lineString = new H.geo.LineString();
      routeCoordinates.forEach(([lat, lng]) => lineString.pushPoint({ lat, lng }));

      polylineRef.current = new H.map.Polyline(lineString, {
        style: { strokeColor: '#0ea5e9', lineWidth: 5 },
      });
      map.addObject(polylineRef.current);

      // Fit viewport to route
      try {
        const bbox = polylineRef.current.getBoundingBox();
        if (bbox) map.getViewModel().setLookAtData({ bounds: bbox }, true);
      } catch (e) {
        console.warn('HERE fit bounds error:', e);
      }
    }
  }, [routeCoordinates, mapReady]);

  // Update route markers
  useEffect(() => {
    const map = mapRef.current;
    const group = markersGroupRef.current;
    if (!map || !group || !mapReady || !window.H) return;
    const H = window.H;

    group.removeAll();

    markers.forEach((m) => {
      const color = MARKER_COLORS[m.type || 'default'];
      const icon = buildPinIcon(color);
      const marker = new H.map.Marker(
        { lat: m.position[0], lng: m.position[1] },
        { icon, data: m.label }
      );
      // Tooltip via tap event
      marker.addEventListener('tap', (evt: any) => {
        const ui = uiRef.current;
        if (!ui) return;
        const bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
          content: `<div style="font-weight:500;padding:4px;">${m.label}</div>`,
        });
        // close existing
        ui.getBubbles().forEach((b: any) => ui.removeBubble(b));
        ui.addBubble(bubble);
      });
      group.addObject(marker);
    });

    // Fit bounds if markers but no route
    if (markers.length > 0 && routeCoordinates.length === 0) {
      try {
        if (markers.length === 1) {
          map.setCenter({ lat: markers[0].position[0], lng: markers[0].position[1] });
          map.setZoom(12);
        } else {
          const bbox = group.getBoundingBox();
          if (bbox) map.getViewModel().setLookAtData({ bounds: bbox }, true);
        }
      } catch (e) {
        console.warn('HERE markers fit error:', e);
      }
    }
  }, [markers, routeCoordinates.length, mapReady]);

  // Update restriction markers
  useEffect(() => {
    const map = mapRef.current;
    const group = restrictionsGroupRef.current;
    if (!map || !group || !mapReady || !window.H) return;
    const H = window.H;

    group.removeAll();

    restrictions.forEach((r) => {
      const icon = buildRestrictionIcon(r.type);
      const marker = new H.map.Marker({ lat: r.lat, lng: r.lng }, { icon });
      marker.addEventListener('tap', (evt: any) => {
        const ui = uiRef.current;
        if (!ui) return;
        const valueInfo = r.value
          ? `<div style="font-size:14px;font-weight:bold;color:#E63946;">${r.value}${r.unit || ''}</div>`
          : '';
        const bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
          content: `
            <div style="padding:8px;max-width:200px;">
              <div style="font-weight:600;margin-bottom:4px;color:#1f2937;">${getRestrictionLabel(r.type)}</div>
              ${valueInfo}
              <div style="font-size:12px;color:#6b7280;">${r.description}</div>
            </div>
          `,
        });
        ui.getBubbles().forEach((b: any) => ui.removeBubble(b));
        ui.addBubble(bubble);
      });
      group.addObject(marker);
    });
  }, [restrictions, mapReady]);

  // Update center when no route/markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (routeCoordinates.length === 0 && markers.length === 0) {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
  }, [center, zoom, routeCoordinates.length, markers.length, mapReady]);

  const retryLoadMap = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setMapReady(false);
    hereMapsPromise = null;
    isHereMapsLoaded = false;
    if (mapRef.current) {
      try {
        mapRef.current.dispose();
      } catch {
        /* noop */
      }
      mapRef.current = null;
    }
    initMap();
  }, [initMap]);

  if (error) {
    return (
      <div className={`rounded-lg overflow-hidden bg-muted flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground p-4">
          <p className="text-sm font-medium">{error}</p>
          <p className="text-xs mt-1 mb-3">Vérifiez votre connexion internet</p>
          <button
            onClick={retryLoadMap}
            className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
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
        ref={containerRef}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      />

      {showRestrictionsLegend && restrictions.length > 0 && (
        <div className="absolute bottom-2 left-2 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-2 z-20">
          <div className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" />
            Restrictions PL ({restrictions.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {restrictionTypes.map(({ type, label, icon: Icon, color }) => {
              const count = restrictions.filter((r) => r.type === type).length;
              if (count === 0) return null;
              return (
                <div
                  key={type}
                  className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${color}20`, color }}
                  title={label}
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