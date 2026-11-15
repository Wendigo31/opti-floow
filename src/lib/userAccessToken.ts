import { supabase } from '@/integrations/supabase/client';

/**
 * Jeton de l'utilisateur connecté pour appeler une fonction serveur avec fetch : les fonctions
 * payantes vérifient la session et le forfait (supabase/functions/_shared/planGuard.ts).
 */
export async function userAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}
