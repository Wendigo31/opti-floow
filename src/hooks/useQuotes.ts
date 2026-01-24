import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import { toast } from 'sonner';
import type { LocalQuote } from '@/types/local';
import { generateId } from '@/types/local';
import type { Json } from '@/integrations/supabase/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Get user's license_id for company-level sync
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

export function useQuotes() {
  useLicense(); // Hook must be called for licensing context
  const [quotes, setQuotes] = useState<LocalQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch quotes (RLS handles company-level access)
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedQuotes: LocalQuote[] = (data || []).map(q => ({
        id: q.id,
        client_id: q.client_id,
        quote_number: q.quote_number,
        origin_address: q.origin_address,
        destination_address: q.destination_address,
        distance_km: q.distance_km,
        total_cost: q.total_cost,
        margin_percent: q.margin_percent,
        tva_rate: q.tva_rate,
        price_ht: q.price_ht,
        price_ttc: q.price_ttc,
        valid_until: q.valid_until,
        notes: q.notes,
        status: q.status,
        stops: q.stops,
        created_at: q.created_at,
        updated_at: q.updated_at,
      }));

      setQuotes(mappedQuotes);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateQuoteNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `DEV-${year}${month}-${random}`;
  };

  const createQuote = useCallback(async (input: Omit<LocalQuote, 'id' | 'quote_number' | 'created_at' | 'updated_at'>): Promise<LocalQuote | null> => {
    const quoteNumber = generateQuoteNumber();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      const licenseId = await getUserLicenseId();

      const { data, error } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          license_id: licenseId,
          quote_number: quoteNumber,
          client_id: input.client_id,
          origin_address: input.origin_address,
          destination_address: input.destination_address,
          distance_km: input.distance_km,
          total_cost: input.total_cost,
          margin_percent: input.margin_percent,
          tva_rate: input.tva_rate,
          price_ht: input.price_ht,
          price_ttc: input.price_ttc,
          valid_until: input.valid_until,
          notes: input.notes,
          status: input.status || 'draft',
          stops: input.stops as Json,
        })
        .select()
        .single();

      if (error) throw error;

      const newQuote: LocalQuote = {
        id: data.id,
        client_id: data.client_id,
        quote_number: data.quote_number,
        origin_address: data.origin_address,
        destination_address: data.destination_address,
        distance_km: data.distance_km,
        total_cost: data.total_cost,
        margin_percent: data.margin_percent,
        tva_rate: data.tva_rate,
        price_ht: data.price_ht,
        price_ttc: data.price_ttc,
        valid_until: data.valid_until,
        notes: data.notes,
        status: data.status,
        stops: data.stops,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setQuotes(prev => [newQuote, ...prev]);
      toast.success('Devis créé');
      return newQuote;
    } catch (error) {
      console.error('Error creating quote:', error);
      toast.error('Erreur lors de la création');
      return null;
    }
  }, []);

  const updateQuote = useCallback(async (id: string, updates: Partial<LocalQuote>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
      if (updates.stops) dbUpdates.stops = updates.stops as Json;

      const { error } = await supabase
        .from('quotes')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setQuotes(prev => prev.map(q => 
        q.id === id ? { ...q, ...updates, updated_at: new Date().toISOString() } : q
      ));
      toast.success('Devis mis à jour');
      return true;
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  const deleteQuote = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('quotes').delete().eq('id', id);

      if (error) throw error;

      setQuotes(prev => prev.filter(q => q.id !== id));
      toast.success('Devis supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, []);

  const getQuotesByClient = useCallback((clientId: string): LocalQuote[] => {
    return quotes.filter(q => q.client_id === clientId);
  }, [quotes]);

  // Fetch license ID on mount
  useEffect(() => {
    getUserLicenseId().then(setLicenseId);
  }, []);

  // Setup realtime subscription for company-level sync
  useEffect(() => {
    if (!licenseId) return;

    channelRef.current = supabase
      .channel(`quotes_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          console.log('[Realtime] quotes change:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const q = payload.new as any;
            const newQuote: LocalQuote = {
              id: q.id,
              client_id: q.client_id,
              quote_number: q.quote_number,
              origin_address: q.origin_address,
              destination_address: q.destination_address,
              distance_km: q.distance_km,
              total_cost: q.total_cost,
              margin_percent: q.margin_percent,
              tva_rate: q.tva_rate,
              price_ht: q.price_ht,
              price_ttc: q.price_ttc,
              valid_until: q.valid_until,
              notes: q.notes,
              status: q.status,
              stops: q.stops,
              created_at: q.created_at,
              updated_at: q.updated_at,
            };
            setQuotes(prev => {
              if (prev.find(quote => quote.id === newQuote.id)) return prev;
              return [newQuote, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const q = payload.new as any;
            const updatedQuote: LocalQuote = {
              id: q.id,
              client_id: q.client_id,
              quote_number: q.quote_number,
              origin_address: q.origin_address,
              destination_address: q.destination_address,
              distance_km: q.distance_km,
              total_cost: q.total_cost,
              margin_percent: q.margin_percent,
              tva_rate: q.tva_rate,
              price_ht: q.price_ht,
              price_ttc: q.price_ttc,
              valid_until: q.valid_until,
              notes: q.notes,
              status: q.status,
              stops: q.stops,
              created_at: q.created_at,
              updated_at: q.updated_at,
            };
            setQuotes(prev => prev.map(quote => quote.id === updatedQuote.id ? updatedQuote : quote));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setQuotes(prev => prev.filter(quote => quote.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] quotes subscription:', status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [licenseId]);

  // Initial fetch
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  return {
    quotes,
    loading,
    fetchQuotes,
    createQuote,
    updateQuote,
    deleteQuote,
    getQuotesByClient,
    generateQuoteNumber,
  };
}
