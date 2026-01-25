import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ConfigType = 'license_cache' | 'sync_state' | 'user_preferences';

interface CompanyConfigRow {
  id: string;
  license_id: string;
  config_type: string;
  config_data: Record<string, unknown>;
  version: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface UseCompanyConfigOptions {
  configType: ConfigType;
  defaultValue?: Record<string, unknown>;
}

/**
 * Hook to manage company-wide configuration stored in Supabase.
 * Replaces localStorage for shared company state.
 * Automatically syncs across all users via Realtime.
 */
export function useCompanyConfig<T extends Record<string, unknown>>({
  configType,
  defaultValue = {} as T,
}: UseCompanyConfigOptions) {
  const [config, setConfig] = useState<T>(defaultValue as T);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const configIdRef = useRef<string | null>(null);
  const licenseIdRef = useRef<string | null>(null);

  // Fetch config from cloud
  const fetchConfig = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get user's license_id
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('license_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!companyUser?.license_id) {
        setIsLoading(false);
        return;
      }

      licenseIdRef.current = companyUser.license_id;

      // Fetch config for this license and type
      const { data, error: fetchError } = await supabase
        .from('company_config')
        .select('*')
        .eq('license_id', companyUser.license_id)
        .eq('config_type', configType)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching company config:', fetchError);
        setError(fetchError.message);
      } else if (data) {
        const row = data as unknown as CompanyConfigRow;
        configIdRef.current = row.id;
        setConfig(row.config_data as T);
        setVersion(row.version);
      }
    } catch (err: any) {
      console.error('Error in fetchConfig:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [configType]);

  // Save config to cloud
  const saveConfig = useCallback(async (newConfig: T | ((prev: T) => T)) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !licenseIdRef.current) {
        console.warn('Cannot save config: no user or license');
        return false;
      }

      const resolvedConfig = typeof newConfig === 'function' 
        ? newConfig(config) 
        : newConfig;

      // Upsert config - use type assertion for Supabase types
      const upsertPayload = {
        license_id: licenseIdRef.current,
        config_type: configType,
        config_data: resolvedConfig,
        version: version + 1,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as any;

      let data: CompanyConfigRow | null = null;
      let upsertError: any = null;

      if (configIdRef.current) {
        // Update existing
        const result = await supabase
          .from('company_config')
          .update(upsertPayload)
          .eq('id', configIdRef.current)
          .select()
          .single();
        data = result.data as unknown as CompanyConfigRow;
        upsertError = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from('company_config')
          .insert(upsertPayload)
          .select()
          .single();
        data = result.data as unknown as CompanyConfigRow;
        upsertError = result.error;
      }

      if (upsertError) {
        console.error('Error saving company config:', upsertError);
        setError(upsertError.message);
        return false;
      }

      if (data) {
        const row = data as unknown as CompanyConfigRow;
        configIdRef.current = row.id;
        setConfig(row.config_data as T);
        setVersion(row.version);
      }

      return true;
    } catch (err: any) {
      console.error('Error in saveConfig:', err);
      setError(err.message);
      return false;
    }
  }, [config, configType, version]);

  // Initial fetch
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!licenseIdRef.current) return;

    const channel = supabase
      .channel(`company_config:${configType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_config',
          filter: `license_id=eq.${licenseIdRef.current}`,
        },
        (payload) => {
          if (payload.new && (payload.new as CompanyConfigRow).config_type === configType) {
            const newRow = payload.new as CompanyConfigRow;
            // Only update if version is newer (avoid loops)
            if (newRow.version > version) {
              setConfig(newRow.config_data as T);
              setVersion(newRow.version);
              configIdRef.current = newRow.id;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [configType, version]);

  // Re-fetch when license changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchConfig();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchConfig]);

  return {
    config,
    setConfig: saveConfig,
    isLoading,
    error,
    refresh: fetchConfig,
    version,
  };
}
