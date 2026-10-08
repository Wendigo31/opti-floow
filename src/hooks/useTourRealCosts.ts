import { useMemo, useRef } from 'react';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudTrailers } from '@/hooks/useCloudTrailers';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useApp } from '@/context/AppContext';
import { calculateTourCosts, type TourCostResult } from '@/utils/tourCostCalculation';
import type { SavedTour } from '@/types/savedTour';

/**
 * Recalcule le "coût réel" de chaque tournée à partir de la flotte, des
 * conducteurs et des charges actuels. Cache par tournée : seules les tournées
 * dont les données d'entrée changent sont recalculées.
 */
export function useTourRealCosts(tours: SavedTour[]): Map<string, TourCostResult> {
  const { vehicles } = useCloudVehicles();
  const { trailers } = useCloudTrailers();
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const allDrivers = useMemo(
    () => [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...autreDrivers, ...jokerDrivers],
    [cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers]
  );
  const { vehicle: appVehicleParams, settings, charges } = useApp();

  const costCacheRef = useRef<Map<string, { key: string; result: TourCostResult }>>(new Map());

  return useMemo(() => {
    const cache = costCacheRef.current;
    const map = new Map<string, TourCostResult>();
    const globalKey = JSON.stringify([charges, settings, appVehicleParams]);
    for (const tour of tours) {
      const vIds = tour.vehicle_ids?.length ? tour.vehicle_ids : (tour.vehicle_id ? [tour.vehicle_id] : []);
      const selectedVehicles = vehicles.filter(v => vIds.includes(v.id));
      const selectedDrivers = allDrivers.filter(d => (tour.driver_ids || []).includes(d.id));
      const selectedTrailer = trailers.find(t => t.id === tour.trailer_id) || null;
      const key = JSON.stringify([
        tour.distance_km,
        tour.toll_cost,
        selectedVehicles,
        selectedDrivers,
        selectedTrailer,
        globalKey,
      ]);
      const cached = cache.get(tour.id);
      if (cached && cached.key === key) {
        map.set(tour.id, cached.result);
        continue;
      }
      const result = calculateTourCosts({
        distance: tour.distance_km,
        tollCost: tour.toll_cost,
        selectedDrivers,
        selectedVehicles,
        selectedTrailer,
        charges,
        settings,
        appVehicleParams,
      });
      cache.set(tour.id, { key, result });
      map.set(tour.id, result);
    }
    // Nettoyage des tournées supprimées
    for (const id of Array.from(cache.keys()) as string[]) {
      if (!map.has(id)) cache.delete(id);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, vehicles, trailers, allDrivers, charges, settings, appVehicleParams]);
}
