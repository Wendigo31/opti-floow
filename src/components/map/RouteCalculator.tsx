import { useState } from 'react';
import { MapPin, Navigation, Loader2, Route, Clock, Receipt, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useTomTom } from '@/hooks/useTomTom';
import { MapPreview } from './MapPreview';
import { cn } from '@/lib/utils';

interface RouteCalculatorProps {
  onRouteCalculated?: (data: {
    distance: number;
    duration: number;
    tollCost: number;
  }) => void;
  className?: string;
}

export function RouteCalculator({ onRouteCalculated, className }: RouteCalculatorProps) {
  const [originAddress, setOriginAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [routeData, setRouteData] = useState<{
    route: {
      distance: number;
      duration: number;
      tollCost: number;
      coordinates: [number, number][];
    };
    origin: { position: { lat: number; lon: number }; address: { freeformAddress: string } };
    destination: { position: { lat: number; lon: number }; address: { freeformAddress: string } };
  } | null>(null);

  const { calculateRouteFromAddresses, loading, error } = useTomTom();

  const handleCalculateRoute = async () => {
    if (!originAddress.trim() || !destinationAddress.trim()) return;

    const result = await calculateRouteFromAddresses([originAddress, destinationAddress]);
    
    if (result) {
      const [origin, destination] = result.waypoints;
      setRouteData({
        route: result.route,
        origin,
        destination,
      });
      onRouteCalculated?.({
        distance: result.route.distance,
        duration: Math.ceil(result.route.duration * 2) / 2,
        tollCost: result.route.tollCost,
      });
    }
  };

  const formatDuration = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  const markers = routeData ? [
    {
      position: [routeData.origin.position.lat, routeData.origin.position.lon] as [number, number],
      label: routeData.origin.address.freeformAddress,
      type: 'start' as const,
    },
    {
      position: [routeData.destination.position.lat, routeData.destination.position.lon] as [number, number],
      label: routeData.destination.address.freeformAddress,
      type: 'end' as const,
    },
  ] : [];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Address Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="origin" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-success" />
            Adresse de départ
          </Label>
          <Input
            id="origin"
            placeholder="Ex: Paris, France"
            value={originAddress}
            onChange={(e) => setOriginAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCalculateRoute()}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination" className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-destructive" />
            Adresse d'arrivée
          </Label>
          <Input
            id="destination"
            placeholder="Ex: Marseille, France"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCalculateRoute()}
          />
        </div>
      </div>

      {/* Calculate Button */}
      <Button 
        onClick={handleCalculateRoute} 
        disabled={loading || !originAddress.trim() || !destinationAddress.trim()}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Calcul en cours...
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4 mr-2" />
            Calculer l'itinéraire
          </>
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Route Results */}
      {routeData && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <Route className="w-5 h-5 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{routeData.route.distance}</p>
              <p className="text-xs text-muted-foreground">kilomètres</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <Clock className="w-5 h-5 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{formatDuration(routeData.route.duration)}</p>
              <p className="text-xs text-muted-foreground">de trajet</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <Receipt className="w-5 h-5 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{routeData.route.tollCost.toFixed(0)}€</p>
              <p className="text-xs text-muted-foreground">péages estimés</p>
            </div>
          </div>

          {/* Map */}
          <MapPreview 
            className="h-[300px] w-full"
            markers={markers}
            routeCoordinates={routeData.route.coordinates}
          />

          {/* Apply Button */}
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              onRouteCalculated?.({
                distance: routeData.route.distance,
                duration: Math.ceil(routeData.route.duration / 8 * 2) / 2,
                tollCost: routeData.route.tollCost,
              });
            }}
          >
            Appliquer au calculateur
          </Button>
        </div>
      )}

      {/* Empty State Map */}
      {!routeData && !loading && (
        <MapPreview 
          className="h-[200px] w-full opacity-50"
          center={[46.603354, 1.888334]}
          zoom={5}
        />
      )}
    </div>
  );
}
