import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cloudActivity, sinceText, useCloudState } from '@/lib/cloudStatus';
import { useCloudPresenceState } from '@/hooks/useCloudPresence';

const ROLE_NAMES: Record<string, string> = {
  direction: 'Direction',
  exploitation: 'Exploitation',
  comptabilite: 'Comptabilité',
  rh: 'RH',
};
const initials = (name: string) =>
  (name || '?')
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

type Kind = 'offline' | 'session' | 'error' | 'syncing' | 'ok';

/**
 * Indicateur du cloud dans la barre du haut — identique dans OptiFlow, OptiFret et
 * OptiXpress : état de la synchronisation, dernière synchro, modifications en attente
 * et collègues connectés.
 */
export function CloudStatus({
  pageLabel = () => '',
  loginPath = '/login',
  onReconnect,
  onSyncNow,
}: {
  pageLabel?: (path: string) => string;
  loginPath?: string;
  onReconnect?: () => void;
  onSyncNow?: () => void;
}) {
  const s = useCloudState();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { online, connected, me } = useCloudPresenceState();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const kind: Kind = !s.online ? 'offline' : s.sessionLost ? 'session' : s.pending > 0 ? 'syncing' : s.error ? 'error' : 'ok';
  const others = online.filter((u) => u.key !== (me?.email ?? '').toLowerCase());
  const shown = others.slice(0, 3);
  const label = {
    offline: 'Hors ligne',
    session: 'Session expirée',
    error: 'À vérifier',
    syncing: 'Synchronisation…',
    ok: 'Synchronisé',
  }[kind];
  const tone = {
    offline: 'text-destructive',
    session: 'text-warning',
    error: 'text-warning',
    syncing: 'text-muted-foreground',
    ok: 'text-success',
  }[kind];
  const Icon = kind === 'offline' || kind === 'session' ? CloudOff : kind === 'error' ? AlertTriangle : kind === 'syncing' ? Loader2 : Cloud;

  const syncNow = () => {
    const end = cloudActivity.begin();
    onSyncNow?.();
    void qc.invalidateQueries().finally(() => {
      end();
      cloudActivity.synced();
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full px-2 py-1 transition-colors hover:bg-accent"
          aria-label={`Cloud : ${label}`}
          title={`Cloud : ${label}`}
        >
          <Icon className={`h-4 w-4 ${tone} ${kind === 'syncing' ? 'animate-spin' : ''}`} />
          <span className={`hidden text-xs font-medium lg:inline ${tone}`}>{label}</span>
          {shown.length > 0 && (
            <span className="flex -space-x-2">
              {shown.map((u) => (
                <span
                  key={u.key}
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[9px] font-bold text-primary-foreground"
                >
                  {initials(u.name)}
                </span>
              ))}
              {others.length > shown.length && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-bold">
                  +{others.length - shown.length}
                </span>
              )}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="space-y-1 border-b border-border px-3 py-2.5">
          <p className={`flex items-center gap-2 text-sm font-semibold ${tone}`}>
            <Icon className={`h-4 w-4 ${kind === 'syncing' ? 'animate-spin' : ''}`} />
            {label}
          </p>
          <p className="text-xs text-muted-foreground">
            {kind === 'offline'
              ? "Pas de connexion internet. Vos modifications sont gardées et envoyées automatiquement au retour du réseau : gardez l'application ouverte."
              : kind === 'session'
                ? 'Votre session a expiré : reconnectez-vous pour que vos modifications soient de nouveau enregistrées dans le cloud.'
                : kind === 'error'
                  ? s.error
                  : "Les données de la société sont enregistrées dans le cloud et partagées en direct avec toute l'équipe."}
          </p>
          <p className="text-xs text-muted-foreground">Dernière synchronisation : {sinceText(s.lastSyncAt)}</p>
          {s.waiting > 0 && (
            <p className="text-xs font-medium text-warning">
              {s.waiting} modification{s.waiting > 1 ? 's' : ''} en attente d'envoi
            </p>
          )}
          <div className="flex gap-2 pt-1">
            {kind === 'session' ? (
              <button type="button" className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground" onClick={() => (onReconnect ? onReconnect() : nav(loginPath))}>
                Se reconnecter
              </button>
            ) : (
              <button
                type="button"
                disabled={kind === 'offline' || kind === 'syncing'}
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
                onClick={syncNow}
              >
                <RefreshCw className="h-3 w-3" /> Synchroniser maintenant
              </button>
            )}
          </div>
        </div>
        {me && (
          <>
            <p className="px-3 pt-2 text-xs font-medium text-muted-foreground">
              Connectés en ce moment {connected ? `(${online.length})` : ''}
            </p>
            <ul className="max-h-64 divide-y divide-border overflow-auto">
              {online.map((u) => (
                <li key={u.key} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {initials(u.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {u.name}
                      {u.key === (me.email ?? '').toLowerCase() ? ' (vous)' : ''}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {ROLE_NAMES[u.role] ?? ''}
                      {pageLabel(u.page) ? ` · ${pageLabel(u.page)}` : ''}
                    </span>
                  </span>
                  <span className="h-2 w-2 rounded-full bg-success" />
                </li>
              ))}
              {!connected && <li className="px-3 py-2 text-xs text-muted-foreground">Connexion au cloud…</li>}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Bandeau sous la barre du haut quand le réseau ou la session manque — identique dans les 3 logiciels. */
export function CloudBanner({ loginPath = '/login', onReconnect }: { loginPath?: string; onReconnect?: () => void }) {
  const s = useCloudState();
  const nav = useNavigate();
  if (s.online && !s.sessionLost) return null;
  const offline = !s.online;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-center text-xs font-medium ${
        offline ? 'bg-destructive/15 text-destructive' : 'bg-warning/15 text-warning'
      }`}
    >
      <CloudOff className="h-3.5 w-3.5 shrink-0" />
      {offline ? (
        <span>
          Hors ligne — vos modifications sont gardées et seront envoyées au retour de la connexion
          {s.waiting > 0 ? ` (${s.waiting} en attente)` : ''}. Gardez l'application ouverte.
        </span>
      ) : (
        <>
          <span>Session expirée — reconnectez-vous pour continuer à enregistrer dans le cloud.</span>
          <button type="button" className="underline underline-offset-2" onClick={() => (onReconnect ? onReconnect() : nav(loginPath))}>
            Se reconnecter
          </button>
        </>
      )}
    </div>
  );
}
