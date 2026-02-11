import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import { toast } from 'sonner';
import type { LocalClient, LocalClientAddress } from '@/types/local';
import { generateId } from '@/types/local';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';

// Extended client with creator info
export interface ClientWithCreator extends LocalClient {
  user_id?: string;
  license_id?: string;
  creator_email?: string;
  creator_display_name?: string;
  is_own?: boolean;
  is_former_member?: boolean;
}

export function useClients() {
  const { licenseId: contextLicenseId, authUserId, isLoading: contextLoading } = useLicenseContext();
  const [clients, setClients] = useState<ClientWithCreator[]>([]);
  const [addresses, setAddresses] = useState<LocalClientAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersMap, setMembersMap] = useState<Map<string, { email: string; displayName?: string; isActive: boolean }>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
 
  // Keep latest state in ref for realtime handlers
  const clientsRef = useRef<ClientWithCreator[]>(clients);
  useEffect(() => { clientsRef.current = clients; }, [clients]);

  const fetchClientsCore = useCallback(async () => {
    // Use context values instead of separate DB calls
    if (!authUserId || !contextLicenseId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch members and clients in PARALLEL for better performance
      const [membersResult, clientsResult] = await Promise.all([
        supabase
          .from('company_users')
          .select('user_id, email, display_name, is_active')
          .eq('license_id', contextLicenseId),
        supabase
          .from('clients')
          .select('*')
          .eq('license_id', contextLicenseId)
          .order('created_at', { ascending: false }),
      ]);

      // Process members
      const currentMembersMap = new Map<string, { email: string; displayName?: string; isActive: boolean }>();
      membersResult.data?.forEach(m => {
        if (m.user_id) {
          currentMembersMap.set(m.user_id, {
            email: m.email,
            displayName: m.display_name || undefined,
            isActive: m.is_active ?? true
          });
        }
      });
      setMembersMap(currentMembersMap);

      if (clientsResult.error) throw clientsResult.error;

      // Map to local format with creator info
      const mappedClients: ClientWithCreator[] = (clientsResult.data || []).map(c => {
        const memberInfo = currentMembersMap.get(c.user_id);
        return {
          id: c.id,
          name: c.name,
          company: c.company,
          email: c.email,
          phone: c.phone,
          address: c.address,
          city: c.city,
          postal_code: c.postal_code,
          siret: c.siret,
          notes: c.notes,
          created_at: c.created_at,
          updated_at: c.updated_at,
          user_id: c.user_id,
          license_id: c.license_id || undefined,
          creator_email: memberInfo?.email,
          creator_display_name: memberInfo?.displayName,
          is_own: c.user_id === authUserId,
          is_former_member: memberInfo ? !memberInfo.isActive : false,
        };
      });

      setClients(mappedClients);
      clientsRef.current = mappedClients;

      // Fetch addresses separately (can be done after initial render)
      const clientIds = mappedClients.map(c => c.id);
      if (clientIds.length > 0) {
        const { data: addressesData } = await supabase
          .from('client_addresses')
          .select('*')
          .in('client_id', clientIds);

        const mappedAddresses: LocalClientAddress[] = (addressesData || []).map(a => ({
          id: a.id,
          client_id: a.client_id,
          label: a.label,
          address: a.address,
          city: a.city,
          postal_code: a.postal_code,
          country: a.country,
          latitude: a.latitude,
          longitude: a.longitude,
          is_default: a.is_default || false,
          created_at: a.created_at,
        }));

        setAddresses(mappedAddresses);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  }, [authUserId, contextLicenseId]);

  const fetchClients = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    const run = fetchClientsCore();
    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }, [fetchClientsCore]);

  // Store fetchClients in ref to avoid subscription churn
  const fetchClientsRef = useRef<() => Promise<void>>();
  useEffect(() => { fetchClientsRef.current = fetchClients; }, [fetchClients]);

  const createClient = useCallback(async (
    input: Omit<LocalClient, 'id' | 'created_at' | 'updated_at'>,
    options?: { silent?: boolean }
  ): Promise<ClientWithCreator | null> => {
    try {
      // Use context values, fallback to direct auth if needed
      let uid = authUserId;
      let lid = contextLicenseId;
      
      if (!uid || !lid) {
        // Fallback: fetch directly from auth
        const { data: { user } } = await supabase.auth.getUser();
        const fallbackLicenseId = await getLicenseId();
        uid = user?.id || null;
        lid = fallbackLicenseId;
      }
      
      if (!uid || !lid) {
        if (!options?.silent) {
          toast.error('Veuillez vous reconnecter');
        }
        console.error('[useClients] createClient: no authUserId or licenseId');
        return null;
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: uid,
          license_id: lid,
          name: input.name,
          company: input.company,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          postal_code: input.postal_code,
          siret: input.siret,
          notes: input.notes,
        })
        .select()
        .single();

      if (error) {
        console.error('[useClients] createClient insert error:', error);
        throw error;
      }

      const memberInfo = membersMap.get(authUserId);
      const memberInfoActual = membersMap.get(uid);
      const newClient: ClientWithCreator = {
        id: data.id,
        name: data.name,
        company: data.company,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        siret: data.siret,
        notes: data.notes,
        created_at: data.created_at,
        updated_at: data.updated_at,
        user_id: data.user_id,
        license_id: data.license_id || undefined,
        creator_email: memberInfoActual?.email || undefined,
        creator_display_name: memberInfoActual?.displayName,
        is_own: true,
        is_former_member: false,
      };

      setClients(prev => [newClient, ...prev]);
      clientsRef.current = [newClient, ...clientsRef.current];
      if (!options?.silent) {
        toast.success('Client ajouté');
      }
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      if (!options?.silent) {
        toast.error('Erreur lors de la création');
      }
      return null;
    }
  }, [authUserId, contextLicenseId, membersMap]);

  const updateClient = useCallback(async (id: string, updates: Partial<LocalClient>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setClients(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ));
      toast.success('Client mis à jour');
      return true;
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour');
      return false;
    }
  }, []);

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Delete addresses first
      await supabase.from('client_addresses').delete().eq('client_id', id);
      
      const { error } = await supabase.from('clients').delete().eq('id', id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== id));
      setAddresses(prev => prev.filter(a => a.client_id !== id));
      toast.success('Client supprimé');
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  }, []);

  const getClientAddresses = useCallback((clientId: string): LocalClientAddress[] => {
    return addresses.filter(a => a.client_id === clientId);
  }, [addresses]);

  // Setup realtime subscription for company-level sync
  useEffect(() => {
    if (!contextLicenseId) return;

    channelRef.current = supabase
      .channel(`clients_${contextLicenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `license_id=eq.${contextLicenseId}`,
        },
        (payload) => {
          console.log('[Realtime] clients change:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const newClient: LocalClient = {
              id: (payload.new as any).id,
              name: (payload.new as any).name,
              company: (payload.new as any).company,
              email: (payload.new as any).email,
              phone: (payload.new as any).phone,
              address: (payload.new as any).address,
              city: (payload.new as any).city,
              postal_code: (payload.new as any).postal_code,
              siret: (payload.new as any).siret,
              notes: (payload.new as any).notes,
              created_at: (payload.new as any).created_at,
              updated_at: (payload.new as any).updated_at,
            };
            setClients(prev => {
              if (prev.find(c => c.id === newClient.id)) return prev;
              const updated = [newClient, ...prev];
              clientsRef.current = updated;
              return updated;
            });
          } else if (payload.eventType === 'UPDATE') {
            const raw = payload.new as any;
            setClients(prev => {
              const updated = prev.map(c => {
                if (c.id !== raw.id) return c;
                // Merge DB fields while preserving creator metadata from existing state
                return {
                  ...c,
                  name: raw.name,
                  company: raw.company,
                  email: raw.email,
                  phone: raw.phone,
                  address: raw.address,
                  city: raw.city,
                  postal_code: raw.postal_code,
                  siret: raw.siret,
                  notes: raw.notes,
                  created_at: raw.created_at,
                  updated_at: raw.updated_at,
                  user_id: raw.user_id ?? c.user_id,
                  license_id: raw.license_id ?? c.license_id,
                  // Preserve creator fields that aren't in the DB row
                };
              });
              clientsRef.current = updated;
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setClients(prev => {
              const updated = prev.filter(c => c.id !== deletedId);
              clientsRef.current = updated;
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] clients subscription:', status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [contextLicenseId]); // Only depend on licenseId to prevent subscription churn

  // Initial fetch
  useEffect(() => {
    if (authUserId && contextLicenseId) {
      fetchClients();
    }
  }, [authUserId, contextLicenseId, fetchClients, contextLoading]);

  return {
    clients,
    addresses,
    loading,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClientAddresses,
  };
}
