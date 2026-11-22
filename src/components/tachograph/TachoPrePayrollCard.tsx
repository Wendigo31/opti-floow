import { useMemo, useRef, useState } from 'react';
import { Gauge, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parseDriverCard } from '@/lib/tachograph';
import { computePrePayroll, type PrePayroll } from '@/lib/prePayroll';
import { CATEGORY_INFO, NIGHT_PREMIUM_PER_HOUR, ROAD_ALLOWANCES_2026, type DriverCategory } from '@/lib/driverContract';
import type { PayslipInput } from '@/lib/payslipCalc';

const n = (v: number, d = 2) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });

/**
 * Bulletin de paie › « Remplir avec le chronotachygraphe » : lit le fichier .ddd de la
 * carte du conducteur et propose heures (équivalences, sup.), nuit, dimanche et frais
 * de route du mois. Les heures du contrat restent garanties (jamais moins que prévu).
 */
export function TachoPrePayrollCard({ month, input, onApply }: { month: string; input: PayslipInput; onApply: (input: PayslipInput) => void }) {
  const file = useRef<HTMLInputElement>(null);
  // Heures sup. structurelles du contrat, telles qu'à l'ouverture du bulletin.
  const contractOt25 = useRef(input.overtime25Hours);
  const monthly = input.baseHours + contractOt25.current;
  const [category, setCategory] = useState<DriverCategory>(monthly >= 186 ? 'longue_distance' : monthly >= 168 ? 'courte_distance' : 'messagerie');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<{ name: string; days: Parameters<typeof computePrePayroll>[0] } | null>(null);
  const pre: PrePayroll | null = useMemo(() => (card ? computePrePayroll(card.days, month, category) : null), [card, month, category]);

  const onFile = async (f?: File) => {
    if (!f) return;
    setLoading(true);
    try {
      const c = parseDriverCard(await f.arrayBuffer());
      setCard({ name: [c.firstNames, c.surname].filter(Boolean).join(' ') || f.name, days: c.days });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fichier illisible');
    } finally {
      setLoading(false);
      if (file.current) file.current.value = '';
    }
  };

  const apply = () => {
    if (!pre) return;
    const actual25 = pre.equivalence25 + pre.overtime25;
    onApply({
      ...input,
      overtime25Hours: Math.max(contractOt25.current, Math.round(actual25 * 100) / 100),
      overtime50Hours: pre.overtime50,
      nightHours: pre.nightHours,
      nightRatePct: input.hourlyRate ? Math.round((NIGHT_PREMIUM_PER_HOUR / input.hourlyRate) * 10000) / 100 : input.nightRatePct,
      sundayHours: pre.sundayHours,
      mealAllowanceCount: pre.meals,
      mealAllowanceUnit: ROAD_ALLOWANCES_2026.repas,
      overnightCount: pre.overnights || input.overnightCount,
      overnightUnit: pre.overnights || !input.overnightCount ? Math.round((ROAD_ALLOWANCES_2026.grandDeplacement1Repas - ROAD_ALLOWANCES_2026.repas) * 100) / 100 : input.overnightUnit,
      otherAllowances: Math.round((pre.casseCroutes * ROAD_ALLOWANCES_2026.casseCroute + pre.nightMeals * ROAD_ALLOWANCES_2026.repasUniqueNuit) * 100) / 100,
    });
    toast.success('Bulletin rempli avec les données du chronotachygraphe : vérifiez les découchers et les repas');
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Gauge className="h-4 w-4 text-primary" /> Pré-paie depuis le chronotachygraphe</p>
        <input ref={file} type="file" accept=".ddd,.DDD,.c1b,.C1B,.tgd,.esm,.v1b" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" size="sm" variant="outline" onClick={() => file.current?.click()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Fichier de carte (.ddd)
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-center">
        <Label className="text-xs">Catégorie du conducteur</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as DriverCategory)}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(CATEGORY_INFO) as DriverCategory[]).map((k) => <SelectItem key={k} value={k}>{CATEGORY_INFO[k].label} — {CATEGORY_INFO[k].weeklyHours} h</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!pre ? (
        <p className="text-xs text-muted-foreground">Téléchargez la carte du conducteur (lecteur de carte ou boîtier) et déposez le fichier : temps de service, heures d'équivalence et sup., nuit, dimanche, repas et casse-croûte du mois sont calculés selon la convention collective.</p>
      ) : pre.days.length === 0 ? (
        <p className="text-xs text-warning">Carte de {card?.name} : aucune journée de service en {month.split('-').reverse().join('/')}.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
            <span>Carte : <b>{card?.name}</b></span>
            <span>Journées de service : <b>{pre.days.length}</b></span>
            <span>Temps de service : <b>{n(pre.serviceHours)} h</b></span>
            <span>dont conduite : {n(pre.drivingHours)} h</span>
            <span>Équivalences +25 % : <b>{n(pre.equivalence25)} h</b></span>
            <span>Heures sup. +25 % : <b>{n(pre.overtime25)} h</b></span>
            <span>Heures sup. +50 % : <b>{n(pre.overtime50)} h</b></span>
            <span>Nuit (21 h – 6 h) : <b>{n(pre.nightHours)} h</b></span>
            <span>Dimanche / férié : <b>{n(pre.sundayHours)} h</b>{pre.holidayHours ? ` (dont ${n(pre.holidayHours)} h fériées)` : ''}</span>
            <span>Repas : <b>{pre.meals}</b></span>
            <span>Repas de nuit : <b>{pre.nightMeals}</b></span>
            <span>Casse-croûte : <b>{pre.casseCroutes}</b></span>
            {category === 'longue_distance' && <span>Découchers estimés : <b>{pre.overnights}</b></span>}
          </div>
          {pre.serviceHours < 151.67 && <p className="text-xs text-warning">Moins de 151,67 h de service : congés ou absences à saisir (le salaire mensualisé reste payé).</p>}
          <p className="text-xs text-muted-foreground">Repas et casse-croûte ne sont dus qu'en déplacement. {category === 'longue_distance' ? "Découchers estimés par les repos de moins de 24 h entre deux journées (la carte n'indique pas le lieu) : corrigez les nuits passées à la maison." : 'Découchers : saisissez-les (la carte n\'indique pas le lieu).'} Découcher {n(Math.round((ROAD_ALLOWANCES_2026.grandDeplacement1Repas - ROAD_ALLOWANCES_2026.repas) * 100) / 100)} € (grand déplacement moins le repas compté à part). Nuit : prime de {n(NIGHT_PREMIUM_PER_HOUR)} €/h (20 % du taux 150M), repas {n(ROAD_ALLOWANCES_2026.repas)} €, casse-croûte {n(ROAD_ALLOWANCES_2026.casseCroute)} €, repas de nuit {n(ROAD_ALLOWANCES_2026.repasUniqueNuit)} € (barème 2026).</p>
          <div className="flex justify-end"><Button type="button" size="sm" onClick={apply}>Remplir le bulletin</Button></div>
        </>
      )}
    </div>
  );
}
