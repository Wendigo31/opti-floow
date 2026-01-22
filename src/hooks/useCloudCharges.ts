import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FixedCharge } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CACHE_KEY = 'optiflow_charges_cache';

function isDemoModeActive(): boolean {
  try {
    const demoState = JSON.parse(localStorage.getItem('optiflow_demo_mode') || '{}');
    return demoState.isActive === true;
  } catch {
    return false;
  }
}

function getDemoCharges(): FixedCharge[] {
  try {
    return JSON.parse(localStorage.getItem('optiflow_charges') || '[]');
  } catch {
    return [];
  }
}

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

async function getUserLicenseId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data } = await supabase
    .from('company_users')
    .select('license_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.license_id || null;
}

export function useCloudCharges() {
  const [charges, setCharges] = useState<FixedCharge[]>(() => getCachedCharges());
  const [loading, setLoading] = useState(false);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isDemo = isDemoModeActive();

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      setAuthUserId(user?.id || null);
      if (user) {
        const lid = await getUserLicenseId();
        if (!isMounted) return;
        setLicenseId(lid);
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setAuthUserId(session?.user?.id || null);
      if (session?.user) {
        const lid = await getUserLicenseId();
        setLicenseId(lid);
      } else {
        setLicenseId(null);
        setCharges([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchCharges = useCallback(async (): Promise<void> => {
    setLoading(true);

    if (isDemo) {
      setCharges(getDemoCharges());
      setLoading(false);
      return;
    }

    if (!authUserId) {
      setLoading(false);
      return;
    }

    try {
      const fetchedLicenseId = await getUserLicenseId();
      setLicenseId(fetchedLicenseId);

      const { data, error } = await supabase
        .from('user_charges')
        .select('*')
        .eq('license_id', fetchedLicenseId || '')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: FixedCharge[] = (data || []).map(row => row.charge_data as unknown as FixedCharge).filter(Boolean);
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
    }
  }, [isDemo, authUserId]);

  useEffect(() => {
    if (authUserId && !isDemo) {
      fetchCharges();
    }
  }, [authUserId, isDemo, fetchCharges]);

  useEffect(() => {
    if (isDemo || !licenseId) return;

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
  }, [licenseId, isDemo]);

  const createCharge = useCallback(async (charge: FixedCharge): Promise<boolean> => {
    if (isDemo) {
      const demo = getDemoCharges();
      localStorage.setItem('optiflow_charges', JSON.stringify([charge, ...demo]));
      setCharges([charge, ...demo]);
      toast.success('Charge ajoutée (mode démo)');
      return true;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const currentLicenseId = await getUserLicenseId();

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

      setCharges(prev => [charge, ...prev]);
      setCachedCharges([charge, ...charges]);
      toast.success('Charge ajoutée');
      return true;
    } catch (error) {
      console.error('Error creating charge:', error);
      toast.error('Erreur lors de la création');
      return false;
    }
  }, [isDemo, charges]);

  const updateCharge = useCallback(async (charge: FixedCharge): Promise<boolean> => {
    if (isDemo) {
      const demo = getDemoCharges();
      const updated = demo.map(c => c.id === charge.id ? charge : c);
      localStorage.setItem('optiflow_charges', JSON.stringify(updated));
      setCharges(updated);
      toast.success('Charge mise à jour (mode démo)');
      return true;
    }

    try {
      const currentLicenseId = await getUserLicenseId();

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
  }, [isDemo]);

  const deleteCharge = useCallback(async (id: string): Promise<boolean> => {
    if (isDemo) {
      const demo = getDemoCharges();
      const updated = demo.filter(c => c.id !== id);
      localStorage.setItem('optiflow_charges', JSON.stringify(updated));
      setCharges(updated);
      toast.success('Charge supprimée (mode démo)');
      return true;
    }

    try {
      const currentLicenseId = await getUserLicenseId();

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
  }, [isDemo]);

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
