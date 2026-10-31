import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, Clock, FileText, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Documents obligatoires de la société : Kbis (valable 3 mois) et licence de transport (3 ans).
 * - un rappel s'affiche quand un document manque, a été refusé, expire bientôt ou a expiré ;
 * - la Direction et l'Exploitation l'envoient en photo ou en PDF ;
 * - une IA lit le document et signale tout de suite ce qui ne va pas (SIREN, nom, date…) ;
 * - OptiGroup le contrôle ensuite dans OptiCentral.
 * Fichier partagé (bridge/shared/documents) — le même dans les trois logiciels.
 */
type Kind = 'kbis' | 'licence';
type State = 'missing' | 'rejected' | 'expired' | 'expiring' | 'pending' | 'ok';
type Doc = {
  kind: Kind;
  state: State;
  status?: string;
  issued_on?: string | null;
  expires_on?: string | null;
  valid_until?: string | null;
  issues?: string[];
  note?: string | null;
  uploaded_at?: string | null;
};
type Status = { documents: Doc[]; can_upload: boolean } | null;

const LABEL: Record<Kind, string> = { kbis: 'Extrait Kbis', licence: 'Licence de transport' };
const RULE: Record<Kind, string> = {
  kbis: 'Valable 3 mois après sa date d’édition.',
  licence: 'Valable 3 ans (ou jusqu’à sa date de fin si elle est plus proche).',
};
const STATE_TEXT: Record<State, string> = {
  missing: 'À envoyer',
  rejected: 'Refusé, à renvoyer',
  expired: 'Expiré, à renvoyer',
  expiring: 'Expire bientôt',
  pending: 'En cours de contrôle',
  ok: 'À jour',
};
const URGENT: State[] = ['missing', 'rejected', 'expired', 'expiring'];
const DISMISS_KEY = 'opti-company-docs-dismissed';
const fr = (iso?: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

async function toDataUrl(file: File): Promise<string> {
  const read = (b: Blob) =>
    new Promise<string>((ok, ko) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = () => ko(new Error('Lecture du fichier impossible'));
      r.readAsDataURL(b);
    });
  if (file.type === 'application/pdf') {
    if (file.size > 5 * 1024 * 1024) throw new Error('PDF trop lourd (5 Mo maximum).');
    return read(file);
  }
  if (!file.type.startsWith('image/')) throw new Error('Formats acceptés : photo ou PDF.');
  // Photo : réduite à 2200 px et recompressée, pour un envoi rapide même en 4G.
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  } catch {
    if (file.size > 5 * 1024 * 1024) throw new Error('Photo trop lourde (5 Mo maximum).');
    return read(file);
  }
}

function useDocsStatus(licenseId: string | null | undefined) {
  const [status, setStatus] = useState<Status>(null);
  const load = useCallback(async () => {
    if (!licenseId) return setStatus(null);
    const { data, error } = await (supabase.rpc as unknown as (
      f: string,
      a: Record<string, unknown>,
    ) => Promise<{ data: Status; error: unknown }>)('company_documents_status', { p_license_id: licenseId });
    if (!error) setStatus(data ?? null);
  }, [licenseId]);
  useEffect(() => {
    void load();
  }, [load]);
  return { status, reload: load };
}

function DocRow({
  doc,
  licenseId,
  canUpload,
  onDone,
}: {
  doc: Doc;
  licenseId: string;
  canUpload: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ issues: string[]; issued_on: string | null } | null>(null);
  const urgent = URGENT.includes(doc.state);

  const send = async (file?: File) => {
    if (!file) return;
    setError('');
    setResult(null);
    setBusy(true);
    try {
      const data_url = await toDataUrl(file);
      const { data, error: fnErr } = await supabase.functions.invoke('analyze-company-document', {
        body: { license_id: licenseId, kind: doc.kind, file_name: file.name, data_url },
      });
      if (fnErr || !data?.ok) {
        let msg: string | null = data?.error ?? null;
        const ctx = (fnErr as { context?: Response } | null)?.context;
        if (!msg && ctx && typeof ctx.json === 'function')
          msg = await ctx.json().then((b: { error?: string }) => b?.error ?? null).catch(() => null);
        throw new Error(msg || 'Envoi impossible, réessayez.');
      }
      setResult({ issues: data.document?.issues ?? [], issued_on: data.document?.issued_on ?? null });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${urgent ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" /> {LABEL[doc.kind]}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{RULE[doc.kind]}</p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            doc.state === 'ok'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              : doc.state === 'pending'
                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
                : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
          }`}
        >
          {doc.state === 'ok' ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : doc.state === 'pending' ? (
            <Clock className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {STATE_TEXT[doc.state]}
        </span>
      </div>

      {(doc.issued_on || doc.valid_until) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {doc.issued_on && <>Daté du {fr(doc.issued_on)}</>}
          {doc.valid_until && <> · valable jusqu’au {fr(doc.valid_until)}</>}
        </p>
      )}
      {doc.state === 'rejected' && doc.note && (
        <p className="mt-2 text-xs text-destructive">Motif : {doc.note}</p>
      )}
      {!result && doc.state === 'pending' && (doc.issues?.length ?? 0) > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-amber-700 dark:text-amber-300">
          {doc.issues!.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}

      {result && (
        <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
          {result.issues.length === 0 ? (
            <p className="text-emerald-700 dark:text-emerald-400">
              Document lu{result.issued_on ? `, daté du ${fr(result.issued_on)}` : ''} : tout correspond.
              OptiGroup va le valider.
            </p>
          ) : (
            <>
              <p className="font-medium">Document reçu, mais à vérifier :</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-amber-700 dark:text-amber-300">
                {result.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
              <p className="mt-1 text-muted-foreground">Si c’est une erreur de document, renvoyez le bon.</p>
            </>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {canUpload ? (
        <label
          className={`mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent ${
            busy ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {busy ? 'Lecture du document…' : doc.state === 'missing' ? 'Envoyer (photo ou PDF)' : 'Envoyer un nouveau document'}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={(e) => {
              void send(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
      ) : (
        urgent && (
          <p className="mt-2 text-xs text-muted-foreground">
            À envoyer par votre Direction ou votre Exploitation.
          </p>
        )
      )}
    </div>
  );
}

/** Fenêtre « Documents de la société » (ouvrable aussi depuis les Paramètres). */
export function CompanyDocumentsDialog({
  licenseId,
  open,
  onOpenChange,
}: {
  licenseId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { status, reload } = useDocsStatus(open ? licenseId : null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Documents de la société</DialogTitle>
          <DialogDescription>
            Une photo nette du document entier suffit. Il est lu automatiquement puis contrôlé par OptiGroup.
          </DialogDescription>
        </DialogHeader>
        {!status ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {status.documents.map((d) => (
              <DocRow
                key={d.kind}
                doc={d}
                licenseId={licenseId}
                canUpload={status.can_upload}
                onDone={() => {
                  void reload();
                  window.dispatchEvent(new Event('opti-company-docs-changed'));
                }}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Rappel discret affiché dans le logiciel quand un document est à envoyer ou à renouveler. */
export function CompanyDocumentsBanner({ licenseId }: { licenseId: string | null | undefined }) {
  const { status, reload } = useDocsStatus(licenseId);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const on = () => void reload();
    const openIt = () => setOpen(true);
    window.addEventListener('opti-company-docs-changed', on);
    window.addEventListener('opti-open-company-documents', openIt);
    return () => {
      window.removeEventListener('opti-company-docs-changed', on);
      window.removeEventListener('opti-open-company-documents', openIt);
    };
  }, [reload]);

  if (!licenseId || !status) return null;
  const todo = status.documents.filter((d) =>
    status.can_upload ? URGENT.includes(d.state) : d.state === 'expired',
  );
  const expired = todo.some((d) => d.state === 'expired' || d.state === 'rejected');
  const text =
    todo.length === 0
      ? ''
      : todo.length === 2
        ? todo.every((d) => d.state === 'missing')
          ? 'Envoyez le Kbis et la licence de transport de la société'
          : 'Kbis et licence de transport à mettre à jour'
        : `${LABEL[todo[0].kind]} : ${STATE_TEXT[todo[0].state].toLowerCase()}`;

  return (
    <>
      {todo.length > 0 && !dismissed && (
        <div
          role="status"
          className={`fixed bottom-3 left-3 z-[150] flex max-w-[calc(100vw-24px)] items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-lg sm:text-sm ${
            expired ? 'border-red-700/40 bg-red-600 text-white' : 'border-amber-600/40 bg-amber-400 text-amber-950'
          }`}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <button type="button" onClick={() => setOpen(true)} className="truncate text-left underline-offset-2 hover:underline">
            {text}
          </button>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 shrink-0 rounded-full px-2 text-xs"
            onClick={() => setOpen(true)}
          >
            {status.can_upload ? 'Envoyer' : 'Voir'}
          </Button>
          <button
            type="button"
            aria-label="Masquer jusqu’à la prochaine ouverture"
            onClick={() => {
              setDismissed(true);
              try {
                sessionStorage.setItem(DISMISS_KEY, '1');
              } catch {
                /* ignore */
              }
            }}
            className="shrink-0 rounded-full p-0.5 opacity-80 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <CompanyDocumentsDialog licenseId={licenseId} open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Ouvre la fenêtre des documents depuis n'importe où (ex. bouton des Paramètres). */
export const openCompanyDocuments = () => window.dispatchEvent(new Event('opti-open-company-documents'));
