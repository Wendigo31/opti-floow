import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';

interface SyncedDataInfo {
  localId: string;
  odId?: string; // Original database ID (for tours)
  userId: string;
  userEmail?: string;
  displayName?: string;
  licenseId?: string;
  syncedAt?: string;
  createdAt?: string;
  isFormerMember?: boolean; // User who created this is no longer active in the company
}

interface CompanyDataInfo {
  vehicles: Map<string, SyncedDataInfo>;
  drivers: Map<string, SyncedDataInfo>;
  charges: Map<string, SyncedDataInfo>;
  trailers: Map<string, SyncedDataInfo>;
  tours: Map<string, SyncedDataInfo>;
  currentUserId: string | null;
  isCompanyMember: boolean;
  companyName?: string;
  licenseId?: string;
}

export function useCompanyData() {
  const { authUserId } = useLicenseContext();
  const [companyData, setCompanyData] = useState<CompanyDataInfo>({
    vehicles: new Map(),
    drivers: new Map(),
    charges: new Map(),
    trailers: new Map(),
    tours: new Map(),
    currentUserId: null,
    isCompanyMember: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompanyData = useCallback(async () => {
    if (!authUserId) {
      setIsLoading(false);
      return;
    }

    try {
      // Check if user is part of a company
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('license_id, licenses(company_name)')
        .eq('user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle();

      if (!companyUser?.license_id) {
        setCompanyData({
          vehicles: new Map(),
          drivers: new Map(),
          charges: new Map(),
          trailers: new Map(),
          tours: new Map(),
        currentUserId: authUserId,
          isCompanyMember: false,
        });
        setIsLoading(false);
        return;
      }

      // Fetch all company members (active and inactive) for display names
      const { data: members } = await supabase
        .from('company_users')
        .select('user_id, email, display_name, is_active')
        .eq('license_id', companyUser.license_id);

      const memberMap = new Map<string, { email: string; displayName?: string; isActive: boolean }>();
      members?.forEach(m => {
        memberMap.set(m.user_id, { 
          email: m.email, 
          displayName: m.display_name || undefined,
          isActive: m.is_active ?? true
        });
      });

      // Fetch synced vehicles
      const { data: vehicles } = await supabase
        .from('user_vehicles')
        .select('local_id, user_id, license_id, synced_at')
        .eq('license_id', companyUser.license_id);

      const vehiclesMap = new Map<string, SyncedDataInfo>();
      vehicles?.forEach(v => {
        const member = memberMap.get(v.user_id);
        vehiclesMap.set(v.local_id, {
          localId: v.local_id,
          userId: v.user_id,
          userEmail: member?.email,
          displayName: member?.displayName,
          licenseId: v.license_id,
          syncedAt: v.synced_at,
          isFormerMember: member ? !member.isActive : false,
        });
      });

      // Fetch synced drivers
      const { data: drivers } = await supabase
        .from('user_drivers')
        .select('local_id, user_id, license_id, synced_at')
        .eq('license_id', companyUser.license_id);

      const driversMap = new Map<string, SyncedDataInfo>();
      drivers?.forEach(d => {
        const member = memberMap.get(d.user_id);
        driversMap.set(d.local_id, {
          localId: d.local_id,
          userId: d.user_id,
          userEmail: member?.email,
          displayName: member?.displayName,
          licenseId: d.license_id,
          syncedAt: d.synced_at,
          isFormerMember: member ? !member.isActive : false,
        });
      });

      // Fetch synced charges
      const { data: charges } = await supabase
        .from('user_charges')
        .select('local_id, user_id, license_id, synced_at')
        .eq('license_id', companyUser.license_id);

      const chargesMap = new Map<string, SyncedDataInfo>();
      charges?.forEach(c => {
        const member = memberMap.get(c.user_id);
        chargesMap.set(c.local_id, {
          localId: c.local_id,
          userId: c.user_id,
          userEmail: member?.email,
          displayName: member?.displayName,
          licenseId: c.license_id,
          syncedAt: c.synced_at,
          isFormerMember: member ? !member.isActive : false,
        });
      });

      // Fetch synced trailers
      const { data: trailers } = await supabase
        .from('user_trailers')
        .select('local_id, user_id, license_id, synced_at')
        .eq('license_id', companyUser.license_id);

      const trailersMap = new Map<string, SyncedDataInfo>();
      trailers?.forEach(t => {
        const member = memberMap.get(t.user_id);
        trailersMap.set(t.local_id, {
          localId: t.local_id,
          userId: t.user_id,
          userEmail: member?.email,
          displayName: member?.displayName,
          licenseId: t.license_id,
          syncedAt: t.synced_at,
          isFormerMember: member ? !member.isActive : false,
        });
      });

      // Fetch saved tours with license_id
      const { data: tours } = await supabase
        .from('saved_tours')
        .select('id, user_id, license_id, created_at')
        .eq('license_id', companyUser.license_id);

      const toursMap = new Map<string, SyncedDataInfo>();
      tours?.forEach(t => {
        // For tours, user_id is stored as text (license code), so we need to map differently
        // We'll use the id as the key
        toursMap.set(t.id, {
          localId: t.id,
          odId: t.id,
          userId: t.user_id, // This is the license code, not the auth user ID
          licenseId: t.license_id,
          createdAt: t.created_at,
        });
      });

      setCompanyData({
        vehicles: vehiclesMap,
        drivers: driversMap,
        charges: chargesMap,
        trailers: trailersMap,
        tours: toursMap,
        currentUserId: authUserId,
        isCompanyMember: true,
        companyName: (companyUser.licenses as any)?.company_name,
        licenseId: companyUser.license_id,
      });
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (authUserId) {
      fetchCompanyData();
    }
  }, [authUserId, fetchCompanyData]);

  // Helper functions
  const getVehicleInfo = useCallback((localId: string): SyncedDataInfo | undefined => {
    return companyData.vehicles.get(localId);
  }, [companyData.vehicles]);

  const getDriverInfo = useCallback((localId: string): SyncedDataInfo | undefined => {
    return companyData.drivers.get(localId);
  }, [companyData.drivers]);

  const getChargeInfo = useCallback((localId: string): SyncedDataInfo | undefined => {
    return companyData.charges.get(localId);
  }, [companyData.charges]);

  const getTrailerInfo = useCallback((localId: string): SyncedDataInfo | undefined => {
    return companyData.trailers.get(localId);
  }, [companyData.trailers]);

  const getTourInfo = useCallback((tourId: string): SyncedDataInfo | undefined => {
    return companyData.tours.get(tourId);
  }, [companyData.tours]);

  const isOwnData = useCallback((userId: string): boolean => {
    return userId === companyData.currentUserId;
  }, [companyData.currentUserId]);

  return {
    ...companyData,
    isLoading,
    getVehicleInfo,
    getDriverInfo,
    getChargeInfo,
    getTrailerInfo,
    getTourInfo,
    isOwnData,
    refresh: fetchCompanyData,
  };
}
