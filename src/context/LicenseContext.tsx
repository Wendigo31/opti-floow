import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TeamRole } from '@/types/team';

interface LicenseContextValue {
  licenseId: string | null;
  authUserId: string | null;
  userRole: TeamRole | null;
  isLoading: boolean;
  refreshLicenseId: () => Promise<string | null>;
}

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined);

// In-memory cache to avoid redundant DB queries
let cachedLicenseId: string | null = null;
let cachedRole: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UserLicenseData {
  licenseId: string | null;
  role: TeamRole | null;
}

function getLicenseIdFromUserMetadata(user: { user_metadata?: any } | null | undefined): string | null {
  const raw = user?.user_metadata?.license_id;
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

async function fetchUserLicenseDataFromDB(userId: string): Promise<UserLicenseData> {
  // Check cache first
  if (cachedLicenseId && Date.now() - cacheTimestamp < CACHE_TTL) {
    return { licenseId: cachedLicenseId, role: cachedRole as TeamRole | null };
  }

  const { data } = await supabase
    .from('company_users')
    .select('license_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  cachedLicenseId = data?.license_id || null;
  cachedRole = data?.role || null;
  cacheTimestamp = Date.now();
  return { licenseId: cachedLicenseId, role: cachedRole as TeamRole | null };
}

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<TeamRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initRef = useRef(false);
  const isInitializing = useRef(true);

  const refreshLicenseId = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      cachedLicenseId = null;
      cachedRole = null;
      cacheTimestamp = 0;
      setLicenseId(null);
      setUserRole(null);
      return null;
    }

    // Hydrate early from session metadata to avoid transient nulls.
    const metaLicenseId = getLicenseIdFromUserMetadata(user);
    if (metaLicenseId) {
      setLicenseId(metaLicenseId);
    }
    
    const data = await fetchUserLicenseDataFromDB(user.id);
    setLicenseId(data.licenseId);
    setUserRole(data.role);
    return data.licenseId;
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
          // Hydrate early from session metadata to avoid transient nulls.
          const metaLicenseId = getLicenseIdFromUserMetadata(user);
          if (metaLicenseId) {
            setLicenseId(metaLicenseId);
          }

          const data = await fetchUserLicenseDataFromDB(user.id);
          if (!isMounted) return;
          setLicenseId(data.licenseId);
          setUserRole(data.role);
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

      if (user) {
        // Clear cache on sign in to get fresh data
        if (event === 'SIGNED_IN') {
          cachedLicenseId = null;
          cachedRole = null;
          cacheTimestamp = 0;
          // Only set loading during auth state changes, not initial load
          if (!isInitializing.current) {
            setIsLoading(true);
          }
        }
        setAuthUserId(user.id);

        // Hydrate early from session metadata to avoid transient nulls.
        const metaLicenseId = getLicenseIdFromUserMetadata(user);
        if (metaLicenseId) {
          setLicenseId(metaLicenseId);
        }

        const data = await fetchUserLicenseDataFromDB(user.id);
        setLicenseId(data.licenseId);
        setUserRole(data.role);
        setIsLoading(false);
      } else {
        cachedLicenseId = null;
        cachedRole = null;
        cacheTimestamp = 0;
        setLicenseId(null);
        setUserRole(null);
        setAuthUserId(null);
        setIsLoading(false);
      }
      isInitializing.current = false;
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <LicenseContext.Provider value={{ licenseId, authUserId, userRole, isLoading, refreshLicenseId }}>
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
  const data = await fetchUserLicenseDataFromDB(user.id);
  return data.licenseId;
}

// Clear cache utility (for logout, etc.)
export function clearLicenseCache() {
  cachedLicenseId = null;
  cachedRole = null;
  cacheTimestamp = 0;
}
