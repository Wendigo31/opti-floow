import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import { toast } from 'sonner';
import type { LocalClient, LocalClientAddress } from '@/types/local';
import { generateId } from '@/types/local';

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
  const [clients, setClients] = useState<LocalClient[]>([]);
  const [addresses, setAddresses] = useState<LocalClientAddress[]>([]);
  const [loading, setLoading] = useState(false);
  
  const isDemo = isDemoModeActive();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    
    if (isDemo) {
      setClients(getDemoClients());
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

      // Fetch clients (RLS handles company-level access)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;

      // Map to local format
      const mappedClients: LocalClient[] = (clientsData || []).map(c => ({
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
      }));

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
  }, [isDemo]);

  const createClient = useCallback(async (input: Omit<LocalClient, 'id' | 'created_at' | 'updated_at'>): Promise<LocalClient | null> => {
    if (isDemo) {
      const newClient: LocalClient = {
        id: generateId(),
        ...input,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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

      const newClient: LocalClient = {
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
  }, [isDemo]);

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
