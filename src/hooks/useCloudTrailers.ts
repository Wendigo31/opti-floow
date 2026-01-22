import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Trailer } from '@/types/trailer';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CACHE_KEY = 'optiflow_trailers_cache';

function isDemoModeActive(): boolean {
  try {
    const demoState = JSON.parse(localStorage.getItem('optiflow_demo_mode') || '{}');
    return demoState.isActive === true;
  } catch {
    return false;
  }
}

function getDemoTrailers(): Trailer[] {
  try {
    return JSON.parse(localStorage.getItem('optiflow_trailers') || '[]');
  } catch {
    return [];
  }
}

function getCachedTrailers(): Trailer[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setCachedTrailers(trailers: Trailer[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(trailers));
  } catch (e) {
    console.error('Failed to cache trailers:', e);
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

export function useCloudTrailers() {
  const [trailers, setTrailers] = useState<Trailer[]>(() => getCachedTrailers());
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
        setTrailers([]);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchTrailers = useCallback(async (): Promise<void> => {
    setLoading(true);

    if (isDemo) {
      setTrailers(getDemoTrailers());
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

      // Skip query if no license_id - user might not be part of a company yet
      if (!fetchedLicenseId) {
        console.log('[useCloudTrailers] No license_id, using cache');
        setTrailers(getCachedTrailers());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_trailers')
        .select('*')
        .eq('license_id', fetchedLicenseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Trailer[] = (data || []).map(row => row.trailer_data as unknown as Trailer).filter(Boolean);
      setTrailers(mapped);
      setCachedTrailers(mapped);
    } catch (error) {
      console.error('Error fetching trailers:', error);
      const cached = getCachedTrailers();
      if (cached.length > 0) {
        setTrailers(cached);
        toast.warning('Mode hors-ligne : données du cache');
      }
    } finally {
      setLoading(false);
    }
  }, [isDemo, authUserId]);

  useEffect(() => {
    if (authUserId && !isDemo) {
      fetchTrailers();
    }
  }, [authUserId, isDemo, fetchTrailers]);

  useEffect(() => {
    if (isDemo || !licenseId) return;

    channelRef.current = supabase
      .channel(`trailers_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_trailers',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const data = (payload.new as any).trailer_data as Trailer;
            if (data) {
              setTrailers(prev => {
                const exists = prev.find(t => t.id === data.id);
                const updated = exists ? prev.map(t => t.id === data.id ? data : t) : [data, ...prev];
                setCachedTrailers(updated);
                return updated;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const localId = (payload.old as any).local_id;
            setTrailers(prev => {
              const updated = prev.filter(t => t.id !== localId);
              setCachedTrailers(updated);
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

  const createTrailer = useCallback(async (trailer: Trailer): Promise<boolean> => {
    if (isDemo) {
      const demo = getDemoTrailers();
      localStorage.setItem('optiflow_trailers', JSON.stringify([trailer, ...demo]));
      setTrailers([trailer, ...demo]);
      toast.success('Remorque ajoutée (mode démo)');
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
        .from('user_trailers')
        .insert([{
          user_id: user.id,
          license_id: currentLicenseId,
          local_id: trailer.id,
          name: trailer.name,
          license_plate: trailer.licensePlate,
          brand: trailer.brand,
          model: trailer.model,
          year: trailer.year,
          trailer_type: trailer.type,
          current_km: trailer.currentKm,
          is_active: trailer.isActive,
          trailer_data: JSON.parse(JSON.stringify(trailer)),
        }]);

      if (error) throw error;

      setTrailers(prev => [trailer, ...prev]);
      setCachedTrailers([trailer, ...trailers]);
      toast.success('Remorque ajoutée');
      return true;
    } catch (error) {
      console.error('Error creating trailer:', error);
      toast.error('Erreur lors de la création');
      return false;
    }
  }, [isDemo, trailers]);

  const updateTrailer = useCallback(async (trailer: Trailer): Promise<boolean> => {
    if (isDemo) {
      const demo = getDemoTrailers();
      const updated = demo.map(t => t.id === trailer.id ? trailer : t);
      localStorage.setItem('optiflow_trailers', JSON.stringify(updated));
      setTrailers(updated);
      toast.success('Remorque mise à jour (mode démo)');
      return true;
    }

    try {
      const currentLicenseId = await getUserLicenseId();

      const { error } = await supabase
        .from('user_trailers')
        .update({
          name: trailer.name,
          license_plate: trailer.licensePlate,
          brand: trailer.brand,
          model: trailer.model,
          year: trailer.year,
          trailer_type: trailer.type,
          current_km: trailer.currentKm,
          is_active: trailer.isActive,
          trailer_data: JSON.parse(JSON.stringify(trailer)),
          synced_at: new Date().toISOString(),
        })
        .eq('license_id', currentLicenseId)
        .eq('local_id', trailer.id);

      if (error) throw error;

      setTrailers(prev => {
        const updated = prev.map(t => t.id === trailer.id ? trailer : t);
        setCachedTrailers(updated);
        return updated;
      });
      toast.success('Remorque mise à jour');
      return true;
    } catch (error) {
      console.error('Error updating trailer:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, [isDemo]);

  const deleteTrailer = useCallback(async (id: string): Promise<boolean> => {
    if (isDemo) {
      const demo = getDemoTrailers();
      const updated = demo.filter(t => t.id !== id);
      localStorage.setItem('optiflow_trailers', JSON.stringify(updated));
      setTrailers(updated);
      toast.success('Remorque supprimée (mode démo)');
      return true;
    }

    try {
      const currentLicenseId = await getUserLicenseId();

      const { error } = await supabase
        .from('user_trailers')
        .delete()
        .eq('license_id', currentLicenseId)
        .eq('local_id', id);

      if (error) throw error;

      setTrailers(prev => {
        const updated = prev.filter(t => t.id !== id);
        setCachedTrailers(updated);
        return updated;
      });
      toast.success('Remorque supprimée');
      return true;
    } catch (error) {
      console.error('Error deleting trailer:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, [isDemo]);

  return {
    trailers,
    loading,
    fetchTrailers,
    createTrailer,
    updateTrailer,
    deleteTrailer,
    setTrailers,
  };
}
