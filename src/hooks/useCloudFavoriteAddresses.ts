import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useLicenseContext } from '@/context/LicenseContext';

export interface CloudFavoriteAddress {
  id: string;
  name: string;
  address: string;
  city?: string;
  postal_code?: string;
  lat: number;
  lon: number;
  category?: string;
  created_at: string;
  created_by_name?: string;
  license_id?: string;
  user_id?: string;
}

export function useCloudFavoriteAddresses() {
  const { licenseId: contextLicenseId, authUserId } = useLicenseContext();
  const [favorites, setFavorites] = useState<CloudFavoriteAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [licenseId, setLicenseId] = useState<string | null>(contextLicenseId);
  const [userId, setUserId] = useState<string | null>(authUserId);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const { toast } = useToast();

  // Sync from context
  useEffect(() => {
    setLicenseId(contextLicenseId);
    setUserId(authUserId);
  }, [contextLicenseId, authUserId]);

  // Get display name for current user
  useEffect(() => {
    if (!authUserId) return;

    const fetchDisplayName = async () => {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('display_name, email')
        .eq('user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle();

      setUserDisplayName(companyUser?.display_name || companyUser?.email || null);
    };

    fetchDisplayName();
  }, [authUserId]);

  const fetchFavorites = useCallback(async () => {
    if (!licenseId) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_addresses')
        .select('*')
        .eq('license_id', licenseId)
        .order('name', { ascending: true });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorite addresses:', error);
    } finally {
      setLoading(false);
    }
  }, [licenseId]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Realtime subscription
  useEffect(() => {
    if (!licenseId) return;

    const channel = supabase
      .channel('favorite_addresses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorite_addresses',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setFavorites(prev => [...prev, payload.new as CloudFavoriteAddress].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setFavorites(prev => prev.map(f => f.id === payload.new.id ? payload.new as CloudFavoriteAddress : f));
          } else if (payload.eventType === 'DELETE') {
            setFavorites(prev => prev.filter(f => f.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [licenseId]);

  const addFavorite = async (address: Omit<CloudFavoriteAddress, 'id' | 'created_at' | 'license_id' | 'user_id' | 'created_by_name'>) => {
    if (!licenseId || !userId) {
      toast({ title: "Vous devez être connecté", variant: "destructive" });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_addresses')
        .insert({
          ...address,
          license_id: licenseId,
          user_id: userId,
          created_by_name: userDisplayName,
        })
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Adresse ajoutée aux favoris" });
      return data;
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast({ title: "Erreur lors de l'ajout", variant: "destructive" });
      return null;
    }
  };

  const removeFavorite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('favorite_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Adresse supprimée" });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const updateFavorite = async (id: string, updates: Partial<Omit<CloudFavoriteAddress, 'id' | 'created_at' | 'license_id' | 'user_id'>>) => {
    try {
      const { error } = await supabase
        .from('favorite_addresses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Adresse mise à jour" });
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast({ title: "Erreur lors de la mise à jour", variant: "destructive" });
    }
  };

  const isFavorite = (lat: number, lon: number) => {
    return favorites.some(f => 
      Math.abs(f.lat - lat) < 0.0001 && 
      Math.abs(f.lon - lon) < 0.0001
    );
  };

  return {
    favorites,
    loading,
    addFavorite,
    removeFavorite,
    updateFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
