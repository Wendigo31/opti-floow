import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { Driver, FixedCharge } from '@/types';
import { toast } from 'sonner';

interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: Date | null;
  vehicleCount: number;
  driverCount: number;
  chargeCount: number;
  trailerCount: number;
}

// Helper to get the user's license_id from company_users
export async function getUserLicenseId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('company_users')
    .select('license_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.license_id || null;
}

export function useDataSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    vehicleCount: 0,
    driverCount: 0,
    chargeCount: 0,
    trailerCount: 0,
  });

  const syncVehicles = useCallback(async (vehicles: Vehicle[], userId: string, licenseId: string | null) => {
    if (!userId || vehicles.length === 0) return 0;

    try {
      // Upsert each vehicle with license_id for company sharing
      for (const vehicle of vehicles) {
        const { error } = await supabase
          .from('user_vehicles')
          .upsert({
            user_id: userId,
            license_id: licenseId,
            local_id: vehicle.id,
            name: vehicle.name,
            license_plate: vehicle.licensePlate,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            vehicle_type: vehicle.type,
            fuel_consumption: vehicle.fuelConsumption,
            fuel_type: vehicle.fuelType,
            current_km: vehicle.currentKm,
            is_active: vehicle.isActive,
            vehicle_data: vehicle as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          } as any, {
            onConflict: 'user_id,local_id',
          });
        
        if (error) console.error('Vehicle upsert error:', error);
      }

      // Get current synced vehicle IDs for this company (license_id)
      // If user has a license_id, we check company-wide; otherwise just user's own
      const query = licenseId 
        ? supabase.from('user_vehicles').select('local_id, user_id').eq('license_id', licenseId)
        : supabase.from('user_vehicles').select('local_id, user_id').eq('user_id', userId);
      
      const { data: syncedVehicles } = await query;

      const localIds = vehicles.map(v => v.id);
      // Only delete vehicles that THIS USER created and no longer exist locally
      const toDelete = syncedVehicles?.filter(sv => 
        sv.user_id === userId && !localIds.includes(sv.local_id)
      ) || [];

      // Delete vehicles that no longer exist locally
      for (const item of toDelete) {
        await supabase
          .from('user_vehicles')
          .delete()
          .eq('user_id', userId)
          .eq('local_id', item.local_id);
      }

      return vehicles.length;
    } catch (error) {
      console.error('Error syncing vehicles:', error);
      return 0;
    }
  }, []);

  const syncTrailers = useCallback(async (trailers: Trailer[], userId: string, licenseId: string | null) => {
    if (!userId || trailers.length === 0) return 0;

    try {
      // Upsert each trailer with license_id for company sharing
      for (const trailer of trailers) {
        const { error } = await supabase
          .from('user_trailers')
          .upsert({
            user_id: userId,
            license_id: licenseId,
            local_id: trailer.id,
            name: trailer.name,
            license_plate: trailer.licensePlate,
            brand: trailer.brand,
            model: trailer.model,
            year: trailer.year,
            trailer_type: trailer.type,
            current_km: trailer.currentKm,
            is_active: trailer.isActive,
            trailer_data: trailer as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          } as any, {
            onConflict: 'user_id,local_id',
          });
        
        if (error) console.error('Trailer upsert error:', error);
      }

      // Get current synced trailer IDs for this company
      const query = licenseId 
        ? supabase.from('user_trailers').select('local_id, user_id').eq('license_id', licenseId)
        : supabase.from('user_trailers').select('local_id, user_id').eq('user_id', userId);
      
      const { data: syncedTrailers } = await query;

      const localIds = trailers.map(t => t.id);
      // Only delete trailers that THIS USER created and no longer exist locally
      const toDelete = syncedTrailers?.filter(st => 
        st.user_id === userId && !localIds.includes(st.local_id)
      ) || [];

      // Delete trailers that no longer exist locally
      for (const item of toDelete) {
        await supabase
          .from('user_trailers')
          .delete()
          .eq('user_id', userId)
          .eq('local_id', item.local_id);
      }

      return trailers.length;
    } catch (error) {
      console.error('Error syncing trailers:', error);
      return 0;
    }
  }, []);

  const syncDrivers = useCallback(async (drivers: Driver[], interimDrivers: Driver[], userId: string, licenseId: string | null) => {
    if (!userId) return 0;

    const allDrivers = [
      ...drivers.map(d => ({ ...d, driverType: 'cdi' })),
      ...interimDrivers.map(d => ({ ...d, driverType: 'interim' })),
    ];

    if (allDrivers.length === 0) return 0;

    try {
      // Upsert each driver with license_id for company sharing
      for (const driver of allDrivers) {
        const { error } = await supabase
          .from('user_drivers')
          .upsert({
            user_id: userId,
            license_id: licenseId,
            local_id: driver.id,
            name: driver.name,
            driver_type: driver.driverType,
            base_salary: driver.baseSalary,
            hourly_rate: driver.hourlyRate,
            driver_data: driver as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          } as any, {
            onConflict: 'user_id,local_id',
          });
        
        if (error) console.error('Driver upsert error:', error);
      }

      // Get current synced driver IDs for this company
      const query = licenseId 
        ? supabase.from('user_drivers').select('local_id, user_id').eq('license_id', licenseId)
        : supabase.from('user_drivers').select('local_id, user_id').eq('user_id', userId);
      
      const { data: syncedDrivers } = await query;

      const localIds = allDrivers.map(d => d.id);
      // Only delete drivers that THIS USER created and no longer exist locally
      const toDelete = syncedDrivers?.filter(sd => 
        sd.user_id === userId && !localIds.includes(sd.local_id)
      ) || [];

      // Delete drivers that no longer exist locally
      for (const item of toDelete) {
        await supabase
          .from('user_drivers')
          .delete()
          .eq('user_id', userId)
          .eq('local_id', item.local_id);
      }

      return allDrivers.length;
    } catch (error) {
      console.error('Error syncing drivers:', error);
      return 0;
    }
  }, []);

  const syncCharges = useCallback(async (charges: FixedCharge[], userId: string, licenseId: string | null) => {
    if (!userId || charges.length === 0) return 0;

    try {
      // Upsert each charge with license_id for company sharing
      for (const charge of charges) {
        const { error } = await supabase
          .from('user_charges')
          .upsert({
            user_id: userId,
            license_id: licenseId,
            local_id: charge.id,
            name: charge.name,
            amount: charge.amount,
            is_ht: charge.isHT,
            periodicity: charge.periodicity,
            category: charge.category,
            charge_data: charge as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          } as any, {
            onConflict: 'user_id,local_id',
          });
        
        if (error) console.error('Charge upsert error:', error);
      }

      // Get current synced charge IDs for this company
      const query = licenseId 
        ? supabase.from('user_charges').select('local_id, user_id').eq('license_id', licenseId)
        : supabase.from('user_charges').select('local_id, user_id').eq('user_id', userId);
      
      const { data: syncedCharges } = await query;

      const localIds = charges.map(c => c.id);
      // Only delete charges that THIS USER created and no longer exist locally
      const toDelete = syncedCharges?.filter(sc => 
        sc.user_id === userId && !localIds.includes(sc.local_id)
      ) || [];

      // Delete charges that no longer exist locally
      for (const item of toDelete) {
        await supabase
          .from('user_charges')
          .delete()
          .eq('user_id', userId)
          .eq('local_id', item.local_id);
      }

      return charges.length;
    } catch (error) {
      console.error('Error syncing charges:', error);
      return 0;
    }
  }, []);

  const syncAllData = useCallback(async (
    vehicles: Vehicle[],
    drivers: Driver[],
    interimDrivers: Driver[],
    charges: FixedCharge[],
    trailers: Trailer[] = []
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user, skipping sync');
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      // Get the user's license_id for company-level sync
      const licenseId = await getUserLicenseId(user.id);
      console.log('[DataSync] Syncing with license_id:', licenseId);

      const [vehicleCount, driverCount, chargeCount, trailerCount] = await Promise.all([
        syncVehicles(vehicles, user.id, licenseId),
        syncDrivers(drivers, interimDrivers, user.id, licenseId),
        syncCharges(charges, user.id, licenseId),
        syncTrailers(trailers, user.id, licenseId),
      ]);

      setSyncStatus({
        isSyncing: false,
        lastSyncAt: new Date(),
        vehicleCount: vehicleCount || 0,
        driverCount: driverCount || 0,
        chargeCount: chargeCount || 0,
        trailerCount: trailerCount || 0,
      });

      console.log('[DataSync] Sync completed:', { vehicleCount, driverCount, chargeCount, trailerCount, licenseId });
    } catch (error) {
      console.error('[DataSync] Sync error:', error);
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [syncVehicles, syncDrivers, syncCharges, syncTrailers]);

  const manualSync = useCallback(async (
    vehicles: Vehicle[],
    drivers: Driver[],
    interimDrivers: Driver[],
    charges: FixedCharge[],
    trailers: Trailer[] = []
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Vous devez être connecté pour synchroniser');
      return;
    }

    await syncAllData(vehicles, drivers, interimDrivers, charges, trailers);
    toast.success('Données synchronisées avec le cloud');
  }, [syncAllData]);

  // Load company-shared data from the cloud
  const loadCompanyData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const licenseId = await getUserLicenseId(user.id);
    if (!licenseId) return null;

    try {
      // Fetch all company vehicles
      const { data: vehicles } = await supabase
        .from('user_vehicles')
        .select('*')
        .eq('license_id', licenseId);

      // Fetch all company drivers
      const { data: drivers } = await supabase
        .from('user_drivers')
        .select('*')
        .eq('license_id', licenseId);

      // Fetch all company charges
      const { data: charges } = await supabase
        .from('user_charges')
        .select('*')
        .eq('license_id', licenseId);

      // Fetch all company trailers
      const { data: trailers } = await supabase
        .from('user_trailers')
        .select('*')
        .eq('license_id', licenseId);

      return {
        vehicles: vehicles || [],
        drivers: drivers || [],
        charges: charges || [],
        trailers: trailers || [],
      };
    } catch (error) {
      console.error('[DataSync] Error loading company data:', error);
      return null;
    }
  }, []);

  return {
    syncStatus,
    syncAllData,
    manualSync,
    syncVehicles,
    syncDrivers,
    syncCharges,
    syncTrailers,
    loadCompanyData,
    getUserLicenseId,
  };
}
