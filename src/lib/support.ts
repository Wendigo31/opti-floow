/**
 * Support — identique dans OptiFlow, OptiFret et OptiXpress : signaler un bug ou une erreur,
 * poser une question, discuter avec un administrateur OptiGroup. OptiCentral reçoit tout.
 * Fonctions SQL : migration *_support.sql.
 */
import { supabase } from '@/integrations/supabase/client';

type RpcResult = { data: unknown; error: { message: string } | null };
const rpc = (fn: string, args: Record<string, unknown> = {}) =>
  (supabase as unknown as { rpc: (f: string, a: Record<string, unknown>) => Promise<RpcResult> }).rpc(fn, args);
const unwrap = async <T>(p: Promise<RpcResult>): Promise<T> => {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
};

export type SupportKind = 'bug' | 'question' | 'chat';
export type SupportMessage = { id: string; from_admin: boolean; author: string | null; body: string; created_at: string };
export type SupportThread = {
  id: string;
  kind: SupportKind;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  unread: boolean;
  created_at: string;
  last_message_at: string;
  messages: SupportMessage[];
};

export const KIND_LABELS: Record<SupportKind, string> = {
  bug: 'Signaler un bug ou une erreur',
  question: 'Poser une question',
  chat: 'Discuter avec un administrateur',
};

/** Contexte utile au diagnostic, sans donnée personnelle sensible. */
export function supportContext(app: string): Record<string, unknown> {
  const errors = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('opti-recent-errors') || '[]') as unknown[];
    } catch {
      return [];
    }
  })();
  return {
    app,
    url: window.location.pathname,
    screen: `${window.innerWidth}×${window.innerHeight}`,
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    at: new Date().toISOString(),
    recent_errors: errors.slice(-5),
  };
}

let installed = false;
/** Garde les dernières erreurs de la page, jointes automatiquement à un signalement de bug. */
export function recordRecentErrors(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const push = (message: string) => {
    try {
      const list = JSON.parse(sessionStorage.getItem('opti-recent-errors') || '[]') as unknown[];
      list.push({ message: message.slice(0, 300), at: new Date().toISOString(), page: window.location.pathname });
      sessionStorage.setItem('opti-recent-errors', JSON.stringify(list.slice(-10)));
    } catch {
      /* stockage indisponible */
    }
  };
  window.addEventListener('error', (e) => push(String(e.message || e.error)));
  window.addEventListener('unhandledrejection', (e) => push(String((e.reason as Error)?.message ?? e.reason)));
}

export const createSupportThread = (licenseId: string, kind: SupportKind, subject: string, body: string, context: Record<string, unknown>) =>
  unwrap<string>(rpc('support_create', { p_license_id: licenseId, p_kind: kind, p_subject: subject, p_body: body, p_page: window.location.pathname, p_context: context }));

export const mySupportThreads = (licenseId: string) => unwrap<SupportThread[]>(rpc('support_my_threads', { p_license_id: licenseId }));

export const replySupportThread = (threadId: string, body: string) => unwrap<void>(rpc('support_user_reply', { p_thread_id: threadId, p_body: body }));

export const markSupportRead = (threadId: string) => unwrap<void>(rpc('support_mark_read', { p_thread_id: threadId }));
