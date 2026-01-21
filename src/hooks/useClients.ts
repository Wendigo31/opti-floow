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

// Check if demo mode is active
function isDemoModeActive(): boolean {
  try {
    const demoState = JSON.parse(localStorage.getItem('optiflow_demo_mode') || '{}');
    return demoState.isActive === true;
  } catch {
    return false;
  }
}

// Get demo clients from localStorage
function getDemoClients(): LocalClient[] {
  try {
    return JSON.parse(localStorage.getItem('optiflow_clients') || '[]');
  } catch {
    return [];
  }
}

// Get demo addresses from localStorage
function getDemoAddresses(): LocalClientAddress[] {
  try {
    return JSON.parse(localStorage.getItem('optiflow_client_addresses') || '[]');
  } catch {
    return [];
  }
}

export function useClients() {
  const { licenseData } = useLicense();
  const [clients, setClients] = useState<ClientWithCreator[]>([]);
  const [addresses, setAddresses] = useState<LocalClientAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [membersMap, setMembersMap] = useState<Map<string, { email: string; displayName?: string; isActive: boolean }>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  const isDemo = isDemoModeActive();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    
    if (isDemo) {
      setClients(getDemoClients() as ClientWithCreator[]);
      setAddresses(getDemoAddresses());
      setLoading(false);
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setCurrentUserId(user.id);
      
      // Fetch license ID and company members for creator lookup
      const userLicenseId = await getUserLicenseId();
      if (userLicenseId) {
        const { data: members } = await supabase
          .from('company_users')
          .select('user_id, email, display_name, is_active')
          .eq('license_id', userLicenseId);
        
        const newMembersMap = new Map<string, { email: string; displayName?: string; isActive: boolean }>();
        members?.forEach(m => {
          if (m.user_id) {
            newMembersMap.set(m.user_id, { 
              email: m.email, 
              displayName: m.display_name || undefined,
              isActive: m.is_active ?? true
            });
          }
        });
        setMembersMap(newMembersMap);
      }

      // Fetch clients (RLS handles company-level access)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Map to local format with creator info
      const mappedClients: ClientWithCreator[] = (clientsData || []).map(c => {
        const memberInfo = membersMap.get(c.user_id);
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
    }
  }, [isDemo, membersMap]);

  const createClient = useCallback(async (input: Omit<LocalClient, 'id' | 'created_at' | 'updated_at'>): Promise<ClientWithCreator | null> => {
    if (isDemo) {
      const newClient: ClientWithCreator = {
        id: generateId(),
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_own: true,
      };
      
      const demoClients = getDemoClients();
      const updated = [...demoClients, newClient];
      localStorage.setItem('optiflow_clients', JSON.stringify(updated));
      setClients(updated);
      toast.success('Client ajouté (mode démo)');
      return newClient;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return null;
      }

      const licenseId = await getUserLicenseId();

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
      toast.success('Client ajouté');
      return newClient;
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('Erreur lors de la création');
      return null;
    }
  }, [isDemo]);

  const updateClient = useCallback(async (id: string, updates: Partial<LocalClient>): Promise<boolean> => {
    if (isDemo) {
      const demoClients = getDemoClients();
      const updated = demoClients.map(c => 
        c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      );
      localStorage.setItem('optiflow_clients', JSON.stringify(updated));
      setClients(updated);
      toast.success('Client mis à jour (mode démo)');
      return true;
    }

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
  }, [isDemo, membersMap]);

  const deleteClient = useCallback(async (id: string): Promise<boolean> => {
    if (isDemo) {
      const demoClients = getDemoClients();
      const demoAddresses = getDemoAddresses();
      localStorage.setItem('optiflow_clients', JSON.stringify(demoClients.filter(c => c.id !== id)));
      localStorage.setItem('optiflow_client_addresses', JSON.stringify(demoAddresses.filter(a => a.client_id !== id)));
      setClients(demoClients.filter(c => c.id !== id));
      setAddresses(demoAddresses.filter(a => a.client_id !== id));
      toast.success('Client supprimé (mode démo)');
      return true;
    }

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
  }, [isDemo]);

  const getClientAddresses = useCallback((clientId: string): LocalClientAddress[] => {
    return addresses.filter(a => a.client_id === clientId);
  }, [addresses]);

  // Fetch license ID on mount
  useEffect(() => {
    if (!isDemo) {
      getUserLicenseId().then(setLicenseId);
    }
  }, [isDemo]);

  // Setup realtime subscription for company-level sync
  useEffect(() => {
    if (isDemo || !licenseId) return;

    channelRef.current = supabase
      .channel(`clients_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `license_id=eq.${licenseId}`,
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
              return [newClient, ...prev];
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
            setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any).id;
            setClients(prev => prev.filter(c => c.id !== deletedId));
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
  }, [licenseId, isDemo]);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

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
