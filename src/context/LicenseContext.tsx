import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LicenseContextValue {
  licenseId: string | null;
  authUserId: string | null;
  isLoading: boolean;
  refreshLicenseId: () => Promise<string | null>;
}

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined);

// In-memory cache to avoid redundant DB queries
let cachedLicenseId: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchLicenseIdFromDB(userId: string): Promise<string | null> {
  // Check cache first
  if (cachedLicenseId && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedLicenseId;
  }

  const { data } = await supabase
    .from('company_users')
    .select('license_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  cachedLicenseId = data?.license_id || null;
  cacheTimestamp = Date.now();
  return cachedLicenseId;
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);

  const refreshLicenseId = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      cachedLicenseId = null;
      cacheTimestamp = 0;
      setLicenseId(null);
      return null;
    }
    
    const lid = await fetchLicenseIdFromDB(user.id);
    setLicenseId(lid);
    return lid;
  }, []);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let isMounted = true;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;

        setAuthUserId(user?.id || null);

        if (user) {
          const lid = await fetchLicenseIdFromDB(user.id);
          if (!isMounted) return;
          setLicenseId(lid);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user || null;
      setAuthUserId(user?.id || null);

      if (user) {
        // Clear cache on sign in to get fresh data
        if (event === 'SIGNED_IN') {
          cachedLicenseId = null;
          cacheTimestamp = 0;
        }
        const lid = await fetchLicenseIdFromDB(user.id);
        setLicenseId(lid);
      } else {
        cachedLicenseId = null;
        cacheTimestamp = 0;
        setLicenseId(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <LicenseContext.Provider value={{ licenseId, authUserId, isLoading, refreshLicenseId }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicenseContext() {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicenseContext must be used within a LicenseProvider');
  }
  return context;
}

// Standalone function for use in callbacks (when context isn't available)
export async function getLicenseId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return fetchLicenseIdFromDB(user.id);
}

// Clear cache utility (for logout, etc.)
export function clearLicenseCache() {
  cachedLicenseId = null;
  cacheTimestamp = 0;
}
