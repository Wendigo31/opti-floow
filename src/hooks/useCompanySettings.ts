import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useLicenseContext } from '@/context/LicenseContext';

export interface CompanySettings {
  id: string;
  user_id: string;
  license_id: string | null;
  company_name: string | null;
  siret: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  quote_conditions: string | null;
  quote_footer: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  const { licenseId: contextLicenseId, authUserId, isLoading: contextLoading } = useLicenseContext();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [licenseId, setLicenseId] = useState<string | null>(contextLicenseId);
  const [canEdit, setCanEdit] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Sync licenseId from context
  useEffect(() => {
    setLicenseId(contextLicenseId);
  }, [contextLicenseId]);

  // Fetch settings on mount
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!authUserId) {
        setLoading(false);
        return;
      }

      try {
        // Check if user can edit (is owner/admin or direction/responsable)
        if (contextLicenseId) {
          const { data: companyUser } = await supabase
            .from('company_users')
            .select('role')
            .eq('user_id', authUserId)
            .eq('license_id', contextLicenseId)
            .eq('is_active', true)
            .maybeSingle();

          setCanEdit(['owner', 'admin', 'direction', 'exploitation'].includes(companyUser?.role || ''));
        } else {
          setCanEdit(true); // Personal settings, user can always edit
        }

        // Fetch company settings
        let query = supabase.from('company_settings').select('*');

        if (contextLicenseId) {
          // Try to get company settings first, then personal
          query = query.or(`license_id.eq.${contextLicenseId},user_id.eq.${authUserId}`);
        } else {
          query = query.eq('user_id', authUserId);
        }

        const { data, error } = await query.order('license_id', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setSettings(data as unknown as CompanySettings);
        }
      } catch (error) {
        console.error('[useCompanySettings] Error:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void init();

    return () => {
      isMounted = false;
    };
  }, [authUserId, contextLicenseId]);

  // Setup realtime subscription for company-wide sync
  useEffect(() => {
    if (!licenseId) return;

    channelRef.current = supabase
      .channel(`company_settings_${licenseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_settings',
          filter: `license_id=eq.${licenseId}`,
        },
        (payload) => {
          console.log('[CompanySettings] Realtime change:', payload.eventType);
          if (payload.eventType === 'DELETE') {
            setSettings(null);
          } else {
            setSettings(payload.new as unknown as CompanySettings);
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

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<CompanySettings>): Promise<boolean> => {
    if (!canEdit) {
      toast.error('Vous n\'avez pas les droits pour modifier ces paramètres');
      return false;
    }

    if (!authUserId) {
      if (!contextLoading) {
        toast.error('Session non initialisée. Veuillez recharger la page.');
      }
      return false;
    }

    try {
      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('company_settings')
          .update(updates)
          .eq('id', settings.id);

        if (error) throw error;
        setSettings(prev => prev ? { ...prev, ...updates } : null);
      } else {
        // Create new
        const { data, error } = await supabase
          .from('company_settings')
          .insert({
            user_id: authUserId,
            license_id: licenseId,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        setSettings(data as unknown as CompanySettings);
      }

      toast.success('Paramètres enregistrés');
      return true;
    } catch (error) {
      console.error('[useCompanySettings] Update error:', error);
      toast.error('Erreur lors de la sauvegarde');
      return false;
    }
  }, [authUserId, settings, licenseId, canEdit]);

  return {
    settings,
    loading,
    canEdit,
    updateSettings,
    licenseId,
  };
}
