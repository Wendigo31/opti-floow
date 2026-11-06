/**
 * Page Paramètres commune aux logiciels Opti (fichier partagé : bridge/shared/settings).
 * Quatre sous-onglets identiques partout : Général, Mon App, Fichier, Légal.
 * Chaque logiciel fournit ce qui lui est propre (fiche société, documents,
 * réglages métier, liste des fonctionnalités du forfait).
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bell, Building2, Check, Download, ExternalLink, FileArchive, FileText, GraduationCap, History, Loader2, Lock,
  Percent, Scale, Settings2, ShieldCheck, Sparkles, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  describeActivity, exportCompany, getSettings, ROLE_LABEL, setMemberPreferences, setVatRate, teamActivity, teamMembers,
  type OptiSettings, type TeamActivity, type TeamMember,
} from '@/components/opti-settings/optiSettingsApi';
import { buildOpp, downloadText, oppFileName, type OppExport } from '@/components/opti-settings/oppFormat';

export interface Release {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export interface CompanySummary {
  name?: string | null;
  identifier?: string | null;
  siren?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  plan?: string | null;
  code?: string | null;
}

export interface PlanFeature {
  label: string;
  space?: string;
  active: boolean;
}

export interface OptiSettingsPageProps {
  app: 'optifret' | 'optiflow' | 'optixpress';
  appName: string;
  company: CompanySummary;
  /** Documents légaux de la société (Kbis, licence de transport) : carte du logiciel. */
  documents: ReactNode;
  /** Notifications de l'équipe propres au logiciel, à la place de la carte commune. */
  notifications?: ReactNode;
  /** Réglages propres au logiciel (onglet Mon App). */
  appSettings?: ReactNode;
  features: PlanFeature[];
  changelog: Release[];
  onReplayTutorial?: () => void;
  /** Onglet ouvert au départ. */
  initialTab?: 'general' | 'app' | 'file' | 'legal';
  /** Appelé avec le taux de TVA de la société (au chargement et à chaque modification). */
  onVatRate?: (rate: number) => void;
}

const SITE = 'https://opti-group.fr';
const fr = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
const frDateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Row({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value || '—'}</span>
    </div>
  );
}

function useOptiSettings() {
  const [s, setS] = useState<OptiSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    try {
      setS(await getSettings());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { s, setS, error, reload };
}

// ---------------------------------------------------------------------------
// Général
// ---------------------------------------------------------------------------
function CompanyCard({ company, appName }: { company: CompanySummary; appName: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> Votre société</CardTitle>
        <CardDescription>Récapitulatif de la fiche société dans {appName}.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <Row label="Raison sociale" value={company.name} />
        <Row label="Identifiant société" value={company.identifier} />
        <Row label="SIREN" value={company.siren} />
        <Row label="Adresse" value={company.address} />
        <Row label="E-mail" value={company.email} />
        <Row label="Téléphone" value={company.phone} />
        <Row label="Forfait" value={company.plan} />
      </CardContent>
    </Card>
  );
}

function VatCard({ s, onSaved }: { s: OptiSettings; onSaved: (rate: number) => void }) {
  const [value, setValue] = useState(String(s.vat_rate).replace('.', ','));
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(String(s.vat_rate).replace('.', ',')), [s.vat_rate]);
  const save = async () => {
    const rate = Number(value.replace(',', '.'));
    if (!Number.isFinite(rate)) return toast.error('Saisissez un taux, par exemple 20 ou 5,5.');
    setBusy(true);
    try {
      const saved = await setVatRate(rate);
      onSaved(Number(saved));
      toast.success(`Taux de TVA enregistré : ${String(saved).replace('.', ',')} %`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Percent className="h-4 w-4 text-primary" /> Taux de TVA</CardTitle>
        <CardDescription>Proposé par défaut sur vos devis et vos factures (20 % de base).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="opti-vat">Taux par défaut (%)</Label>
            <Input id="opti-vat" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} disabled={!s.can_edit_company || busy} />
          </div>
          {s.can_edit_company && (
            <Button onClick={() => void save()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {s.can_edit_company ? 'Modifiable par la Direction et la Comptabilité.' : 'Seules la Direction et la Comptabilité peuvent le modifier.'}
          {s.vat_updated_by && ` Dernière modification : ${s.vat_updated_by}, le ${fr(s.vat_updated_at)}.`}
        </p>
      </CardContent>
    </Card>
  );
}

function MeCard({ s }: { s: OptiSettings }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" /> Personne connectée</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        <Row label="Nom" value={s.me.name} />
        <Row label="E-mail" value={s.me.email} />
        <Row label="Rôle" value={<Badge variant="secondary">{ROLE_LABEL[s.me.role] ?? s.me.role}</Badge>} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mon App
// ---------------------------------------------------------------------------
function NotifyCard({ s, onChange }: { s: OptiSettings; onChange: (v: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (v: boolean) => {
    setBusy(true);
    try {
      await setMemberPreferences({ notify_team_changes: v });
      onChange(v);
      toast.success(v ? 'Vous serez prévenu des modifications de l’équipe.' : 'Notifications des modifications désactivées.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" /> Notifications</CardTitle>
        <CardDescription>Réglage personnel : il ne concerne que votre compte.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="opti-notify" className="leading-snug">
            Être prévenu quand un membre de l'équipe crée, modifie ou supprime quelque chose
            <span className="block text-xs font-normal text-muted-foreground">Avec le nom de la personne, par exemple « Marc Dupont a modifié le client Transports X ».</span>
          </Label>
          <Switch id="opti-notify" checked={s.member.notify_team_changes} disabled={busy} onCheckedChange={(v) => void toggle(v)} />
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryCard() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [member, setMember] = useState<string>('all');
  const [rows, setRows] = useState<TeamActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    teamMembers().then(setMembers).catch(() => setMembers([]));
  }, []);
  useEffect(() => {
    setRows(null);
    teamActivity({ member: member === 'all' ? null : member, limit: 200 })
      .then((r) => {
        setRows(r);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Chargement impossible'));
  }, [member]);
  const byDay = useMemo(() => {
    const out: { day: string; items: TeamActivity[] }[] = [];
    for (const r of rows ?? []) {
      const day = new Date(r.updated_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const last = out[out.length - 1];
      if (last?.day === day) last.items.push(r);
      else out.push({ day, items: [r] });
    }
    return out;
  }, [rows]);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4 text-primary" /> Historique des modifications</CardTitle>
        <CardDescription>Qui a modifié quoi, membre par membre. Les valeurs ne sont pas conservées, seulement la nature du changement (conservé 13 mois).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={member} onValueChange={setMember}>
          <SelectTrigger className="w-full sm:w-72" aria-label="Membre de l'équipe"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute l'équipe</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.member_id} value={m.member_id}>
                {m.name}{m.is_me ? ' (vous)' : ''} · {ROLE_LABEL[m.role] ?? m.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune modification enregistrée pour le moment.</p>
        ) : (
          <div className="max-h-[480px] space-y-4 overflow-y-auto pr-1">
            {byDay.map((g) => (
              <div key={g.day}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.day}</p>
                <ul className="divide-y rounded-lg border">
                  {g.items.map((r) => (
                    <li key={r.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                      <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                        {new Date(r.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="min-w-0 flex-1">{describeActivity(r)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Fichier
// ---------------------------------------------------------------------------
function ExportCard({ app, isDirection }: { app: OptiSettingsPageProps['app']; isDirection: boolean }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const data = (await exportCompany()) as unknown as OppExport;
      const text = await buildOpp(data);
      const name = oppFileName(app, String(data.company?.company_name ?? data.company?.company_identifier ?? ''));
      downloadText(text, name);
      const total = Object.values(data.tables ?? {}).reduce((n, t) => n + (Array.isArray(t) ? t.length : 0), 0);
      toast.success(`Export terminé : ${name} (${total} élément(s))`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export impossible');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><FileArchive className="h-4 w-4 text-primary" /> Exporter toutes vos données</CardTitle>
        <CardDescription>
          Un fichier .opp, le format des logiciels Opti : toutes les données de votre société (clients, factures, conducteurs,
          véhicules, charges, réglages…) dans un seul fichier compressé et vérifié.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={() => void run()} disabled={!isDirection || busy} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exporter au format .opp
        </Button>
        {!isDirection && <p className="text-xs text-muted-foreground">L'export des données est réservé à la Direction.</p>}
        <p className="text-xs text-muted-foreground">Les mots de passe, codes PIN et jetons d'accès ne sont jamais exportés. Chaque export est noté dans l'historique.</p>
      </CardContent>
    </Card>
  );
}

function RgpdCard() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex gap-3 pt-6 text-sm">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1.5">
          <p className="font-medium">Vos données vous appartiennent (RGPD)</p>
          <p className="text-muted-foreground">
            Nous respectons le Règlement général sur la protection des données : vous pouvez récupérer l'ensemble de vos
            données à tout moment. Pour les obtenir dans un autre format (CSV, Excel ou JSON), contactez le support : un
            administrateur OptiGroup vous les prépare.
          </p>
          <a href={`${SITE}/confidentialite`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            Politique de confidentialité <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Légal
// ---------------------------------------------------------------------------
const LEGAL = [
  { label: "Conditions générales d'utilisation (CGU)", href: `${SITE}/cgu` },
  { label: 'Conditions générales de vente (CGV)', href: `${SITE}/cgv` },
  { label: 'Mentions légales', href: `${SITE}/mentions-legales` },
  { label: 'Politique de confidentialité', href: `${SITE}/confidentialite` },
];

function LegalCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Scale className="h-4 w-4 text-primary" /> Documents juridiques</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {LEGAL.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-muted/50">
                <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{l.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function VersionCard({ appName, changelog }: { appName: string; changelog: Release[] }) {
  const [open, setOpen] = useState(false);
  const current = changelog[0];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4 text-primary" /> Version</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left hover:bg-muted/50">
          <span>
            <span className="block text-sm font-semibold">{appName} V{current?.version}</span>
            <span className="block text-xs text-muted-foreground">{current?.title} · {fr(current?.date)}</span>
          </span>
          <span className="text-xs text-primary">Voir toutes les versions</span>
        </button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historique des versions de {appName}</DialogTitle>
              <DialogDescription>Toutes les évolutions du logiciel, de la plus récente à la première.</DialogDescription>
            </DialogHeader>
            <ol className="space-y-5">
              {changelog.map((r, i) => (
                <li key={r.version} className="relative border-l-2 border-primary/30 pl-4">
                  <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                  <p className="text-sm font-semibold">
                    V{r.version} — {r.title} {i === 0 && <Badge className="ml-1 align-middle">Version actuelle</Badge>}
                  </p>
                  <p className="mb-1.5 text-xs text-muted-foreground">{fr(r.date)}</p>
                  <ul className="list-disc space-y-1 pl-4 text-sm text-foreground/85">
                    {r.changes.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function FeaturesCard({ features, plan }: { features: PlanFeature[]; plan?: string | null }) {
  const active = features.filter((f) => f.active).length;
  const groups = useMemo(() => {
    const m = new Map<string, PlanFeature[]>();
    for (const f of features) m.set(f.space ?? 'Fonctionnalités', [...(m.get(f.space ?? 'Fonctionnalités') ?? []), f]);
    return [...m.entries()];
  }, [features]);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-primary" /> Fonctionnalités de votre forfait</CardTitle>
        <CardDescription>
          {plan ? `Forfait ${plan} : ` : ''}{active} sur {features.length} actives. Pour en activer une autre, contactez le support.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map(([space, list]) => (
          <div key={space}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{space}</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {list.map((f) => (
                <li key={`${space}-${f.label}`} className="flex items-center gap-2 text-sm">
                  {f.active ? <Check className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                  <span className={f.active ? '' : 'text-muted-foreground'}>{f.label}</span>
                  {!f.active && <span className="text-xs text-muted-foreground">(non inclus)</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// La page
// ---------------------------------------------------------------------------
export function OptiSettingsPage(props: OptiSettingsPageProps) {
  const { s, setS, error, reload } = useOptiSettings();
  const [tab, setTab] = useState<string>(props.initialTab ?? 'general');
  const isDirection = s?.me.role === 'direction';
  const { onVatRate } = props;
  useEffect(() => {
    if (s) onVatRate?.(Number(s.vat_rate));
  }, [s?.vat_rate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-5">
      <TabsList className="grid h-auto w-full grid-cols-4 sm:w-auto sm:inline-grid">
        <TabsTrigger value="general">Général</TabsTrigger>
        <TabsTrigger value="app">Mon App</TabsTrigger>
        <TabsTrigger value="file">Fichier</TabsTrigger>
        <TabsTrigger value="legal">Légal</TabsTrigger>
      </TabsList>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
          {error}
          <Button size="sm" variant="outline" onClick={() => void reload()}>Réessayer</Button>
        </div>
      )}

      <TabsContent value="general" className="mt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          <CompanyCard company={props.company} appName={props.appName} />
          <div className="space-y-5">
            {s && <MeCard s={s} />}
            {s && <VatCard s={s} onSaved={(rate) => setS({ ...s, vat_rate: rate })} />}
          </div>
          <div className="lg:col-span-2">{props.documents}</div>
        </div>
      </TabsContent>

      <TabsContent value="app" className="mt-0 space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          {props.notifications ?? (s && <NotifyCard s={s} onChange={(v) => setS({ ...s, member: { ...s.member, notify_team_changes: v } })} />)}
          {props.onReplayTutorial && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4 text-primary" /> Tutoriel</CardTitle>
                <CardDescription>Revoyez vos espaces et les nouveautés, pas à pas.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={props.onReplayTutorial}>Revoir le tutoriel</Button>
              </CardContent>
            </Card>
          )}
        </div>
        <HistoryCard />
        {props.appSettings}
      </TabsContent>

      <TabsContent value="file" className="mt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          <ExportCard app={props.app} isDirection={isDirection} />
          <RgpdCard />
        </div>
      </TabsContent>

      <TabsContent value="legal" className="mt-0">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <LegalCard />
            <VersionCard appName={props.appName} changelog={props.changelog} />
          </div>
          <FeaturesCard features={props.features} plan={props.company.plan} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
