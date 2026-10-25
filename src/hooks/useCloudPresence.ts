import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface OnlineUser {
  key: string;
  name: string;
  email: string;
  role: string;
  page: string;
  since: string;
}
export type PresenceMe = { licenseId: string | null | undefined; email: string; name: string; role: string };

/**
 * Collègues connectés en ce moment et page affichée — identique dans les 3 logiciels
 * (canal temps réel « presence-<licence> » du cloud de la société).
 */
export function useCloudPresence(me: PresenceMe | null): { online: OnlineUser[]; connected: boolean } {
  const location = useLocation();
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const licenseId = me?.licenseId ?? null;
  const email = (me?.email ?? '').toLowerCase();

  useEffect(() => {
    if (!licenseId || !email || !me) return;
    const ch = supabase.channel(`presence-${licenseId}`, { config: { presence: { key: email } } });
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState<OnlineUser>();
      const users = Object.entries(st).map(([key, metas]) => ({ ...(metas[metas.length - 1] as OnlineUser), key }));
      setOnline(users.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    }).subscribe((status) => {
      setConnected(status === 'SUBSCRIBED');
      if (status === 'SUBSCRIBED')
        void ch.track({ name: me.name, email, role: me.role, page: window.location.pathname, since: new Date().toISOString() });
    });
    setChannel(ch);
    return () => {
      setChannel(null);
      setConnected(false);
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenseId, email]);

  useEffect(() => {
    if (channel && connected && me)
      void channel.track({ name: me.name, email, role: me.role, page: location.pathname, since: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, connected, me?.name, me?.role]);

  return { online, connected };
}

type PresenceState = { online: OnlineUser[]; connected: boolean; me: PresenceMe | null };
const PresenceCtx = createContext<PresenceState>({ online: [], connected: false, me: null });

/** À monter une fois au-dessus des pages (dans le routeur) : la présence ne se recrée pas à chaque page. */
export function CloudPresenceProvider({ me, children }: { me: PresenceMe | null; children: ReactNode }) {
  const p = useCloudPresence(me);
  return createElement(PresenceCtx.Provider, { value: { ...p, me } }, children);
}
export const useCloudPresenceState = () => useContext(PresenceCtx);
