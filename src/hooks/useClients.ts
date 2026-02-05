import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import { toast } from 'sonner';
import type { LocalClient, LocalClientAddress } from '@/types/local';
import { generateId } from '@/types/local';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Extended client with creator info
export interface ClientWithCreator extends LocalClient {
  user_id?: string;
  license_id?: string;
  creator_email?: string;
  creator_display_name?: string;
  is_own?: boolean;
  is_former_member?: boolean;
}

 import { useLicenseContext, getLicenseId as getContextLicenseId } from '@/context/LicenseContext';

export function useClients() {
  const { licenseId: contextLicenseId, authUserId } = useLicenseContext();
  const [clients, setClients] = useState<ClientWithCreator[]>([]);
  const [addresses, setAddresses] = useState<LocalClientAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [membersMap, setMembersMap] = useState<Map<string, { email: string; displayName?: string; isActive: boolean }>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchInProgressRef = useRef(false);
 
  // Keep latest state in ref for realtime handlers
  const clientsRef = useRef<ClientWithCreator[]>(clients);
  useEffect(() => { clientsRef.current = clients; }, [clients]);

  const fetchClients = useCallback(async () => {
    if (fetchInProgressRef.current) return;
    
    fetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        fetchInProgressRef.current = false;
        return;
      }
      
      // Fetch license ID and company members for creator lookup
      const userLicenseId = await getContextLicenseId();
      
      // Fetch members in the same call to avoid state dependency issues
      let currentMembersMap = new Map<string, { email: string; displayName?: string; isActive: boolean }>();
      
      if (userLicenseId) {
        const { data: members } = await supabase
          .from('company_users')
          .select('user_id, email, display_name, is_active')
          .eq('license_id', userLicenseId);
        
        members?.forEach(m => {
          if (m.user_id) {
            currentMembersMap.set(m.user_id, { 
              email: m.email, 
              displayName: m.display_name || undefined,
              isActive: m.is_active ?? true
            });
          }
        });
        setMembersMap(currentMembersMap);
      }

      // Fetch clients (RLS handles company-level access)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Map to local format with creator info - use currentMembersMap directly
      const mappedClients: ClientWithCreator[] = (clientsData || []).map(c => {
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
          is_own: c.user_id === user.id,
          is_former_member: memberInfo ? !memberInfo.isActive : false,
        };
      });

      setClients(mappedClients);
      clientsRef.current = mappedClients;

      // Fetch addresses
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
      fetchInProgressRef.current = false;
    }
  }, []); // Remove membersMap dependency to prevent infinite loop

  // Store fetchClients in ref to avoid subscription churn
  const fetchClientsRef = useRef<() => Promise<void>>();
  useEffect(() => { fetchClientsRef.current = fetchClients; }, [fetchClients]);

  const createClient = useCallback(async (input: Omit<LocalClient, 'id' | 'created_at' | 'updated_at'>): Promise<ClientWithCreator | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      const licenseId = await getContextLicenseId();

      const { data, error } = await supabase
        .from('clients')
        .insert({
          user_id: user.id,
          license_id: licenseId,
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

      if (error) throw error;

      const memberInfo = membersMap.get(user.id);
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
        creator_email: memberInfo?.email || user.email || undefined,
        creator_display_name: memberInfo?.displayName,
        is_own: true,
        is_former_member: false,
      };

      setClients(prev => [newClient, ...prev]);
      clientsRef.current = [newClient, ...clientsRef.current];
      toast.success('Client ajouté');
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Erreur lors de la création');
      return null;
    }
  }, [membersMap]);

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
            const updatedClient: LocalClient = {
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
              const updated = prev.map(c => c.id === updatedClient.id ? updatedClient : c);
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
        // Reconcile on subscribe
        if (status === 'SUBSCRIBED') {
          void fetchClientsRef.current?.();
        }
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
    if (authUserId) {
      fetchClients();
    }
  }, [authUserId, fetchClients]);

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
