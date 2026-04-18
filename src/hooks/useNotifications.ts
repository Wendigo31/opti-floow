import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
import { toast } from 'sonner';

export type NotificationEventType =
  | 'driver_created'
  | 'driver_absence'
  | 'tour_created'
  | 'planning_updated'
  | 'generic';

export interface AppNotification {
  id: string;
  license_id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  event_type: NotificationEventType | string;
  title: string;
  message: string | null;
  link_url: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface BroadcastInput {
  event_type: NotificationEventType;
  title: string;
  message?: string;
  link_url?: string;
  entity_id?: string;
}

/**
 * Centre de notifications partagé société.
 * - Récupère les notifications du user connecté
 * - Realtime pour insertion/update
 * - broadcast() crée une notification pour CHAQUE membre actif de la société
 */
export function useNotifications() {
  const { licenseId, authUserId } = useLicenseContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef<() => Promise<void>>();

  const fetchAll = useCallback(async () => {
    if (!authUserId) return;
    try {
      const { data, error } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('recipient_user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setNotifications((data as any) || []);
    } catch (err) {
      console.error('[Notifications] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authUserId]);
  fetchRef.current = fetchAll;

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime
  useEffect(() => {
    if (!authUserId) return;
    const channel = supabase
      .channel(`notifications_${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${authUserId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new as any as AppNotification;
            setNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
            // Toast en plus du centre
            toast(n.title, { description: n.message || undefined });
          } else if (payload.eventType === 'UPDATE') {
            const n = payload.new as any as AppNotification;
            setNotifications((prev) => prev.map((x) => (x.id === n.id ? n : x)));
          } else if (payload.eventType === 'DELETE') {
            const id = (payload.old as any).id;
            setNotifications((prev) => prev.filter((x) => x.id !== id));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUserId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      await supabase
        .from('notifications' as any)
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .eq('id', id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error('[Notifications] markAsRead error:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!authUserId) return;
    try {
      await supabase
        .from('notifications' as any)
        .update({ is_read: true, read_at: new Date().toISOString() } as any)
        .eq('recipient_user_id', authUserId)
        .eq('is_read', false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('[Notifications] markAllAsRead error:', err);
    }
  }, [authUserId]);

  const remove = useCallback(async (id: string) => {
    try {
      await supabase.from('notifications' as any).delete().eq('id', id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('[Notifications] delete error:', err);
    }
  }, []);

  /**
   * Diffuse une notification à tous les membres actifs de la société.
   */
  const broadcast = useCallback(
    async (input: BroadcastInput) => {
      if (!licenseId || !authUserId) return;
      try {
        // Get author display name
        const { data: actorRow } = await supabase
          .from('company_users')
          .select('display_name, email')
          .eq('user_id', authUserId)
          .eq('license_id', licenseId)
          .maybeSingle();
        const actorName =
          (actorRow as any)?.display_name || (actorRow as any)?.email || null;

        // Get all active members
        const { data: members, error: memErr } = await supabase
          .from('company_users')
          .select('user_id')
          .eq('license_id', licenseId)
          .eq('is_active', true)
          .not('user_id', 'is', null);
        if (memErr) throw memErr;

        const rows =
          (members || [])
            .map((m: any) => m.user_id as string)
            .filter(Boolean)
            .map((uid: string) => ({
              license_id: licenseId,
              recipient_user_id: uid,
              actor_user_id: authUserId,
              actor_name: actorName,
              event_type: input.event_type,
              title: input.title,
              message: input.message || null,
              link_url: input.link_url || null,
              entity_id: input.entity_id || null,
            })) || [];

        if (rows.length === 0) return;
        const { error } = await supabase.from('notifications' as any).insert(rows as any);
        if (error) throw error;
      } catch (err) {
        console.error('[Notifications] broadcast error:', err);
      }
    },
    [licenseId, authUserId]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    remove,
    broadcast,
    refetch: fetchAll,
  };
}
