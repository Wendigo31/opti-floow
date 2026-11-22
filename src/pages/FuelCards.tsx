import { useEffect, useMemo } from 'react';
import { FuelCardsView } from '@/components/fuel/FuelCardsView';
import { useLicenseContext } from '@/context/LicenseContext';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';

/** Véhicules › Carburant : relevés des cartes carburant (nov. 2026). */
export default function FuelCards() {
  const { licenseId } = useLicenseContext();
  const { vehicles, fetchVehicles } = useCloudVehicles();
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  const list = useMemo(() => vehicles.map((v) => ({ id: v.id, name: v.name, plate: v.licensePlate || '', planned: v.fuelConsumption || null })), [vehicles]);
  return <FuelCardsView licenseId={licenseId} vehicles={list} fleetLabel="Véhicules" />;
}
