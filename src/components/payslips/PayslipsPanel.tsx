import { useMemo, useState } from 'react';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, ChevronLeft, ChevronRight, Download, Settings2, Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePayslips, useSavePayslip, useDeletePayslip, usePayrollRates, useSavePayrollRates, type PayslipRow } from '@/hooks/usePayslips';
import { computePayslip, emptyPayslipInput, DEFAULT_PAYROLL_RATES, type PayslipInput, type PayrollRates } from '@/lib/payslipCalc';
import { exportPayslipPDF, periodLabel } from '@/lib/pdfPayslip';
import { TachoPrePayrollCard } from '@/components/tachograph/TachoPrePayrollCard';

const eur = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

interface Draft {
  id?: string;
  driverId: string | null;
  name: string;
  job: string;
  classification: string;
  input: PayslipInput;
}

export interface PayslipDriver {
  id: string;
  name: string;
  /** Heures hebdomadaires du contrat (35 par défaut). */
  weekly_hours?: number | null;
  /** Salaire brut mensuel de base, s'il est connu. */
  base_salary?: number | null;
}
export interface PayslipEmployer {
  name: string;
  legalForm?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  siret?: string | null;
  naf?: string | null;
  convention?: string | null;
}

/**
 * Fiches de paie (RH) : un bulletin par conducteur et par mois, calculé à
 * partir du taux horaire, des heures, majorations, primes et frais de route,
 * avec les taux de cotisations de la société. Brouillon → validé → PDF.
 * Même écran dans OptiFret, OptiFlow et OptiXpress (fichier partagé, reprise d'OptiFret).
 */
export function PayslipsPanel({
  licenseId,
  currentUser,
  drivers,
  employer,
  workedDaysOf,
  hideTitle,
}: {
  licenseId: string | null | undefined;
  currentUser?: string | null;
  drivers: PayslipDriver[];
  employer: PayslipEmployer;
  /** Jours travaillés du conducteur dans le mois (aide à la saisie des repas). */
  workedDaysOf?: (driverId: string, month: string) => number;
  /** Titre déjà affiché par la mise en page du logiciel. */
  hideTitle?: boolean;
}) {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const { data, isLoading } = usePayslips(licenseId, month);
  const rows = data?.rows ?? [];
  const available = data?.available ?? true;
  const { data: rates = DEFAULT_PAYROLL_RATES } = usePayrollRates(licenseId);
  const save = useSavePayslip(licenseId, currentUser);
  const remove = useDeletePayslip();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);

  const monthDate = parse(month, 'yyyy-MM', new Date());

  const workedDays = (driverId: string) => (workedDaysOf ? workedDaysOf(driverId, month) : 0);

  const openFor = (driverId: string | null, existing?: PayslipRow) => {
    if (existing) {
      setDraft({ id: existing.id, driverId: existing.driver_id, name: existing.employee_name, job: existing.employee_job || '', classification: existing.employee_classification || '', input: { ...emptyPayslipInput(), ...existing.input } });
      return;
    }
    const d = drivers.find((x) => x.id === driverId);
    // Taux horaire BRUT = salaire brut mensuel / heures mensualisées. (« hourly_rate » de la fiche
    // conducteur est un taux horaire CHARGÉ pour la rentabilité : il ne sert pas à la paie.)
    const monthlyHours = Math.round(((Number(d?.weekly_hours) || 35) * 52 / 12) * 100) / 100;
    // Salaire mensuel pour plus de 35 h : il inclut les heures sup structurelles majorées de 25 %.
    const equivHours = Math.min(monthlyHours, 151.67) + Math.max(0, monthlyHours - 151.67) * 1.25;
    const hourly = Number(d?.base_salary) ? Math.round((Number(d?.base_salary) / equivHours) * 100) / 100 : rates.smicHourly;
    const days = driverId ? workedDays(driverId) : 0;
    setDraft({
      driverId,
      name: d?.name || '',
      job: driverId ? 'Conducteur routier' : '',
      classification: '',
      // Au-delà de 35 h/semaine, les heures contractuelles en plus sont des heures sup à 25 %.
      input: { ...emptyPayslipInput(hourly), baseHours: Math.min(monthlyHours, 151.67), overtime25Hours: Math.max(0, Math.round((monthlyHours - 151.67) * 100) / 100), mealAllowanceCount: days },
    });
  };

  const result = useMemo(() => (draft ? computePayslip(draft.input, rates) : null), [draft, rates]);

  const submit = (status: 'draft' | 'validated') => {
    if (!draft || !result || !draft.name.trim()) return;
    save.mutate(
      {
        id: draft.id,
        driver_id: draft.driverId,
        employee_name: draft.name.trim(),
        employee_job: draft.job.trim() || null,
        employee_classification: draft.classification.trim() || null,
        period: month,
        input: draft.input,
        result,
        gross: result.gross,
        net_to_pay: result.netToPay,
        employer_cost: result.employerCost,
        status,
      },
      { onSuccess: () => setDraft(null) },
    );
  };

  const pdf = (row: PayslipRow) =>
    exportPayslipPDF({
      period: row.period,
      employer: {
        ...employer,
        convention: employer.convention || 'Transports routiers et activités auxiliaires du transport (IDCC 0016)',
      },
      employee: { name: row.employee_name, job: row.employee_job, classification: row.employee_classification },
      input: row.input,
      result: row.result,
      status: row.status,
    });

  const totals = rows.reduce((a, r) => ({ gross: a.gross + Number(r.gross), net: a.net + Number(r.net_to_pay), cost: a.cost + Number(r.employer_cost) }), { gross: 0, net: 0, cost: 0 });
  const others = rows.filter((r) => !r.driver_id);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          {hideTitle ? <div /> : (
            <div>
              <h1 className="text-3xl font-bold gradient-text">Fiches de paie</h1>
              <p className="text-muted-foreground">Bulletins de vos conducteurs et salariés, mois par mois</p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg border border-border">
              <Button variant="ghost" size="icon" onClick={() => setMonth(format(subMonths(monthDate, 1), 'yyyy-MM'))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-32 text-center text-sm font-semibold capitalize">{format(monthDate, 'MMMM yyyy', { locale: fr })}</span>
              <Button variant="ghost" size="icon" onClick={() => setMonth(format(addMonths(monthDate, 1), 'yyyy-MM'))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <Button variant="outline" onClick={() => setRatesOpen(true)}><Settings2 className="mr-2 h-4 w-4" /> Paramètres de paie</Button>
            <Button variant="outline" onClick={() => openFor(null)}><UserPlus className="mr-2 h-4 w-4" /> Autre salarié</Button>
          </div>
        </div>

        {!available && (
          <Card className="border-warning/40"><CardContent className="flex gap-2 p-4 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> Les fiches de paie seront disponibles après la mise à jour de la base (migration du 17/10).
          </CardContent></Card>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {[['Total brut', totals.gross], ['Total net à payer', totals.net], ['Coût employeur', totals.cost]].map(([k, v]) => (
            <Card key={k as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="text-xl font-bold">{eur(v as number)}</p></CardContent></Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-6 text-muted-foreground">Chargement…</p>
            ) : (
              <div className="divide-y divide-border">
                {drivers.length === 0 && others.length === 0 && <p className="p-6 text-muted-foreground">Aucun conducteur : ajoutez-les dans « Conducteurs ».</p>}
                {[...drivers.map((d) => ({ key: d.id, driverId: d.id as string | null, name: d.name, row: rows.find((r) => r.driver_id === d.id) })),
                  ...others.map((r) => ({ key: r.id, driverId: null, name: r.employee_name, row: r }))].map(({ key, driverId, name, row }) => (
                  <div key={key} className="flex flex-wrap items-center gap-3 p-4">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="min-w-40 flex-1">
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row ? `Brut ${eur(Number(row.gross))} · Net ${eur(Number(row.net_to_pay))}` : driverId ? `${workedDays(driverId)} jour(s) travaillé(s) ce mois-ci` : ''}
                      </p>
                    </div>
                    {row ? (
                      row.status === 'validated'
                        ? <Badge className="bg-success/15 text-success hover:bg-success/15"><CheckCircle2 className="mr-1 h-3 w-3" />Validée</Badge>
                        : <Badge variant="outline">Brouillon</Badge>
                    ) : <Badge variant="outline" className="text-muted-foreground">À faire</Badge>}
                    <div className="flex gap-1">
                      {row ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => pdf(row)}><Download className="mr-1 h-4 w-4" />PDF</Button>
                          <Button size="sm" variant="ghost" onClick={() => openFor(row.driver_id, row)}><Pencil className="mr-1 h-4 w-4" />{row.status === 'validated' ? 'Corriger' : 'Modifier'}</Button>
                          {row.status === 'draft' && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(row.id)}><Trash2 className="h-4 w-4" /></Button>}
                        </>
                      ) : (
                        <Button size="sm" onClick={() => openFor(driverId)} disabled={!available}><Plus className="mr-1 h-4 w-4" />Préparer</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          Calcul : taux 2026 par défaut (SMIC 12,31 €/h, plafond 4 005 €/mois, réduction générale RGDU incluse), modifiables dans « Paramètres de paie ». Faites valider vos taux (AT/MP, prévoyance, mutuelle) par votre expert-comptable. La déclaration sociale nominative (DSN) reste à faire par votre logiciel ou cabinet de paie.
        </p>
      </div>

      {/* Éditeur de bulletin */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulletin de {draft?.name || 'salarié'} — {periodLabel(month)}</DialogTitle>
            <DialogDescription>Le calcul se met à jour pendant la saisie.</DialogDescription>
          </DialogHeader>
          {draft && result && (
            <div className="grid gap-6 md:grid-cols-[1fr_300px]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Nom du salarié *" className="col-span-2"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} disabled={!!draft.driverId} /></F>
                  <F label="Emploi"><Input value={draft.job} onChange={(e) => setDraft({ ...draft, job: e.target.value })} placeholder="Conducteur routier" /></F>
                  <F label="Classification (CCN)"><Input value={draft.classification} onChange={(e) => setDraft({ ...draft, classification: e.target.value })} placeholder="Groupe 7 — coef. 150 M" /></F>
                </div>
                {draft.driverId && <TachoPrePayrollCard key={draft.driverId} month={month} input={draft.input} onApply={(input) => setDraft({ ...draft, input })} />}
                <Section title="Salaire">
                  <N label="Taux horaire brut (€)" v={draft.input.hourlyRate} on={(v) => setDraft({ ...draft, input: { ...draft.input, hourlyRate: v } })} />
                  <N label="Heures mensualisées" v={draft.input.baseHours} on={(v) => setDraft({ ...draft, input: { ...draft.input, baseHours: v } })} />
                  <N label="Heures sup. à 25 %" v={draft.input.overtime25Hours} on={(v) => setDraft({ ...draft, input: { ...draft.input, overtime25Hours: v } })} />
                  <N label="Heures sup. à 50 %" v={draft.input.overtime50Hours} on={(v) => setDraft({ ...draft, input: { ...draft.input, overtime50Hours: v } })} />
                  <N label="Heures de nuit" v={draft.input.nightHours} on={(v) => setDraft({ ...draft, input: { ...draft.input, nightHours: v } })} />
                  <N label="Majoration nuit (%)" v={draft.input.nightRatePct} on={(v) => setDraft({ ...draft, input: { ...draft.input, nightRatePct: v } })} />
                  <N label="Heures dimanche / férié" v={draft.input.sundayHours} on={(v) => setDraft({ ...draft, input: { ...draft.input, sundayHours: v } })} />
                  <N label="Majoration dimanche (%)" v={draft.input.sundayRatePct} on={(v) => setDraft({ ...draft, input: { ...draft.input, sundayRatePct: v } })} />
                  <N label="Absence non payée (h)" v={draft.input.unpaidAbsenceHours} on={(v) => setDraft({ ...draft, input: { ...draft.input, unpaidAbsenceHours: v } })} />
                  <N label="Prime (€)" v={draft.input.bonuses[0]?.amount || 0} on={(v) => setDraft({ ...draft, input: { ...draft.input, bonuses: v ? [{ label: 'Prime', amount: v }] : [] } })} />
                </Section>
                <Section title="Frais de route (non soumis)">
                  <N label="Nombre de repas" v={draft.input.mealAllowanceCount} on={(v) => setDraft({ ...draft, input: { ...draft.input, mealAllowanceCount: v } })} />
                  <N label="Indemnité repas (€)" v={draft.input.mealAllowanceUnit} on={(v) => setDraft({ ...draft, input: { ...draft.input, mealAllowanceUnit: v } })} />
                  <N label="Nombre de découchés" v={draft.input.overnightCount} on={(v) => setDraft({ ...draft, input: { ...draft.input, overnightCount: v } })} />
                  <N label="Indemnité découché (€)" v={draft.input.overnightUnit} on={(v) => setDraft({ ...draft, input: { ...draft.input, overnightUnit: v } })} />
                  <N label="Autres frais (€)" v={draft.input.otherAllowances} on={(v) => setDraft({ ...draft, input: { ...draft.input, otherAllowances: v } })} />
                </Section>
                <Section title="Impôt">
                  <N label="Taux prélèvement à la source (%)" v={draft.input.withholdingRatePct} on={(v) => setDraft({ ...draft, input: { ...draft.input, withholdingRatePct: v } })} />
                  <N label="Heures sup. déjà exonérées cette année (€)" v={draft.input.overtimeTaxFreeUsedYtd} on={(v) => setDraft({ ...draft, input: { ...draft.input, overtimeTaxFreeUsedYtd: v } })} />
                </Section>
              </div>

              <div className="space-y-3 md:sticky md:top-0 md:self-start">
                <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                  <Row k="Salaire brut" v={eur(result.gross)} />
                  <Row k="Cotisations salariales" v={`− ${eur(result.employeeContributions)}`} />
                  <Row k="Net avant impôt" v={eur(result.netBeforeTax)} />
                  <Row k="Net imposable" v={eur(result.netTaxable)} muted />
                  {result.withholdingTax > 0 && <Row k="Prélèvement à la source" v={`− ${eur(result.withholdingTax)}`} />}
                  {result.allowances > 0 && <Row k="Frais de route" v={`+ ${eur(result.allowances)}`} />}
                  <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Net à payer</span><span className="text-success">{eur(result.netToPay)}</span></div>
                  <Row k="Cotisations patronales" v={eur(result.employerContributions)} muted />
                  <Row k="Coût employeur" v={eur(result.employerCost)} muted />
                </div>
                {draft.input.hourlyRate > 0 && draft.input.hourlyRate < rates.smicHourly && (
                  <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
                    Taux horaire inférieur au SMIC ({eur(rates.smicHourly)}/h) : vérifiez le taux ou la grille de la convention collective.
                  </p>
                )}
                <Button className="w-full" variant="outline" disabled={!draft.name.trim() || save.isPending} onClick={() => submit('draft')}>
                  {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enregistrer le brouillon
                </Button>
                <Button className="w-full" disabled={!draft.name.trim() || save.isPending} onClick={() => submit('validated')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Valider le bulletin
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RatesDialog licenseId={licenseId} open={ratesOpen} onOpenChange={setRatesOpen} rates={rates} />
    </>
  );
}

function F({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  // <label> englobant : le champ est relié à son libellé (lecteurs d'écran, clic sur le libellé).
  return <label className={`block space-y-1.5 ${className}`}><span className="text-xs font-medium">{label}</span>{children}</label>;
}

function N({ label, v, on, step = 0.01 }: { label: string; v: number; on: (v: number) => void; step?: number }) {
  return (
    <F label={label}>
      <Input type="number" inputMode="decimal" step={step} value={Number.isFinite(v) ? v : 0} onChange={(e) => on(e.target.value === '' ? 0 : Number(e.target.value))} />
    </F>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return <div className={`flex justify-between ${muted ? 'text-muted-foreground' : ''}`}><span>{k}</span><span className="font-medium">{v}</span></div>;
}

const RATE_FIELDS: { key: keyof PayrollRates; label: string }[] = [
  { key: 'smicHourly', label: 'SMIC horaire (€)' },
  { key: 'rgduEnabled', label: 'Réduction générale RGDU (1 = oui, 0 = non)' },
  { key: 'rgduSmicHourly', label: 'SMIC de la formule RGDU (€, gelé 2026)' },
  { key: 'pmss', label: 'Plafond mensuel SS (€)' },
  { key: 'atmpEmployer', label: 'AT/MP employeur (%) — taux notifié' },
  { key: 'prevoyanceSalarie', label: 'Prévoyance salarié (%)' },
  { key: 'prevoyanceEmployer', label: 'Prévoyance employeur (%)' },
  { key: 'mutuelleSalarie', label: 'Mutuelle salarié (€/mois)' },
  { key: 'mutuelleEmployer', label: 'Mutuelle employeur (€/mois)' },
  { key: 'fnalEmployer', label: 'FNAL (%) — 0,10 ou 0,50' },
  { key: 'formationEmployer', label: 'Formation professionnelle (%)' },
  { key: 'maladieEmployer', label: 'Maladie employeur (%)' },
  { key: 'maladieReducedEmployer', label: 'Maladie taux réduit (%)' },
  { key: 'vieillessePlafSalarie', label: 'Vieillesse plafonnée salarié (%)' },
  { key: 'vieillessePlafEmployer', label: 'Vieillesse plafonnée employeur (%)' },
  { key: 'vieillesseDeplafSalarie', label: 'Vieillesse déplafonnée salarié (%)' },
  { key: 'vieillesseDeplafEmployer', label: 'Vieillesse déplafonnée employeur (%)' },
  { key: 'retraiteT1Salarie', label: 'Retraite compl. T1 salarié (%)' },
  { key: 'retraiteT1Employer', label: 'Retraite compl. T1 employeur (%)' },
  { key: 'chomageEmployer', label: 'Assurance chômage (%)' },
  { key: 'allocFamEmployer', label: 'Allocations familiales (%)' },
];

function RatesDialog({ licenseId, open, onOpenChange, rates }: { licenseId: string | null | undefined; open: boolean; onOpenChange: (o: boolean) => void; rates: PayrollRates }) {
  const [values, setValues] = useState<PayrollRates>(rates);
  const save = useSavePayrollRates(licenseId);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setValues(rates); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paramètres de paie</DialogTitle>
          <DialogDescription>Propres à votre société. Valeurs 2026 par défaut : à faire valider par votre expert-comptable.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {RATE_FIELDS.map((f) => (
            <N key={f.key} label={f.label} v={values[f.key]} on={(v) => setValues((x) => ({ ...x, [f.key]: v }))} step={0.001} />
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setValues(DEFAULT_PAYROLL_RATES)}>Valeurs par défaut</Button>
          <Button className="flex-1" disabled={save.isPending} onClick={() => save.mutate(values, { onSuccess: () => onOpenChange(false) })}>Enregistrer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
