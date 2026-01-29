import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Trailer } from '@/types/trailer';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';

const CACHE_KEY = 'optiflow_trailers_cache';

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

export function useCloudTrailers() {
  const { licenseId, authUserId } = useLicenseContext();
  const [trailers, setTrailers] = useState<Trailer[]>(() => getCachedTrailers());
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchInProgressRef = useRef(false);

  const fetchTrailers = useCallback(async (): Promise<void> => {
    if (fetchInProgressRef.current) return;
    
    if (!authUserId || !licenseId) {
      setTrailers(getCachedTrailers());
      return;
    }

    fetchInProgressRef.current = true;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_trailers')
        .select('trailer_data')
        .eq('license_id', licenseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Trailer[] = (data || [])
        .map(row => row.trailer_data as unknown as Trailer)
        .filter(Boolean);
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
      fetchInProgressRef.current = false;
    }
  }, [authUserId, licenseId]);

  // Realtime subscription
  useEffect(() => {
    if (!licenseId) return;

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
  }, [licenseId]);

  const createTrailer = useCallback(async (trailer: Trailer): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return false;
      }

      const currentLicenseId = await getLicenseId();

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

      setTrailers(prev => {
        const updated = [trailer, ...prev];
        setCachedTrailers(updated);
        return updated;
      });
      toast.success('Remorque ajoutée');
      return true;
    } catch (error) {
      console.error('Error creating trailer:', error);
      toast.error('Erreur lors de la création');
      return false;
    }
  }, []);

  const updateTrailer = useCallback(async (trailer: Trailer): Promise<boolean> => {
    try {
      const currentLicenseId = await getLicenseId();

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
  }, []);

  const deleteTrailer = useCallback(async (id: string): Promise<boolean> => {
    try {
      const currentLicenseId = await getLicenseId();

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
  }, []);

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
