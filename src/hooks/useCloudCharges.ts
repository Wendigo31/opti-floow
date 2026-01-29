import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FixedCharge } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';

const CACHE_KEY = 'optiflow_charges_cache';

function getCachedCharges(): FixedCharge[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setCachedCharges(charges: FixedCharge[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(charges));
  } catch (e) {
    console.error('Failed to cache charges:', e);
  }
}

export function useCloudCharges() {
  const { licenseId, authUserId } = useLicenseContext();
  const [charges, setCharges] = useState<FixedCharge[]>(() => getCachedCharges());
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchInProgressRef = useRef(false);

  const fetchCharges = useCallback(async (): Promise<void> => {
    if (fetchInProgressRef.current) return;
    
    if (!authUserId || !licenseId) {
      setCharges(getCachedCharges());
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_charges')
        .select('charge_data')
        .eq('license_id', licenseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: FixedCharge[] = (data || [])
        .map(row => row.charge_data as unknown as FixedCharge)
        .filter(Boolean);
      setCharges(mapped);
      setCachedCharges(mapped);
    } catch (error) {
      console.error('Error fetching charges:', error);
      const cached = getCachedCharges();
      if (cached.length > 0) {
        setCharges(cached);
        toast.warning('Mode hors-ligne : données du cache');
      }
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [authUserId, licenseId]);

  // Realtime subscription
  useEffect(() => {
    if (!licenseId) return;

    channelRef.current = supabase
      .channel(`charges_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_charges',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = (payload.new as any).charge_data as FixedCharge;
            if (data) {
              setCharges(prev => {
                const exists = prev.find(c => c.id === data.id);
                const updated = exists ? prev.map(c => c.id === data.id ? data : c) : [data, ...prev];
                setCachedCharges(updated);
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const localId = (payload.old as any).local_id;
            setCharges(prev => {
              const updated = prev.filter(c => c.id !== localId);
              setCachedCharges(updated);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId]);

  const createCharge = useCallback(async (charge: FixedCharge): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const currentLicenseId = await getLicenseId();

      const { error } = await supabase
        .from('user_charges')
        .insert([{
          user_id: user.id,
          license_id: currentLicenseId,
          local_id: charge.id,
          name: charge.name,
          amount: charge.amount,
          is_ht: charge.isHT,
          periodicity: charge.periodicity,
          category: charge.category,
          charge_data: JSON.parse(JSON.stringify(charge)),
        }]);

      if (error) throw error;

      setCharges(prev => {
        const updated = [charge, ...prev];
        setCachedCharges(updated);
        return updated;
      });
      toast.success('Charge ajoutée');
      return true;
    } catch (error) {
      console.error('Error creating charge:', error);
      toast.error('Erreur lors de la création');
      return false;
    }
  }, []);

  const updateCharge = useCallback(async (charge: FixedCharge): Promise<boolean> => {
    try {
      const currentLicenseId = await getLicenseId();

      const { error } = await supabase
        .from('user_charges')
        .update({
          name: charge.name,
          amount: charge.amount,
          is_ht: charge.isHT,
          periodicity: charge.periodicity,
          category: charge.category,
          charge_data: JSON.parse(JSON.stringify(charge)),
          synced_at: new Date().toISOString(),
        })
        .eq('license_id', currentLicenseId)
        .eq('local_id', charge.id);

      if (error) throw error;

      setCharges(prev => {
        const updated = prev.map(c => c.id === charge.id ? charge : c);
        setCachedCharges(updated);
        return updated;
      });
      toast.success('Charge mise à jour');
      return true;
    } catch (error) {
      console.error('Error updating charge:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  const deleteCharge = useCallback(async (id: string): Promise<boolean> => {
    try {
      const currentLicenseId = await getLicenseId();

      const { error } = await supabase
        .from('user_charges')
        .delete()
        .eq('license_id', currentLicenseId)
        .eq('local_id', id);

      if (error) throw error;

      setCharges(prev => {
        const updated = prev.filter(c => c.id !== id);
        setCachedCharges(updated);
        return updated;
      });
      toast.success('Charge supprimée');
      return true;
    } catch (error) {
      console.error('Error deleting charge:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, []);

  return {
    charges,
    loading,
    fetchCharges,
    createCharge,
    updateCharge,
    deleteCharge,
    setCharges,
  };
}
