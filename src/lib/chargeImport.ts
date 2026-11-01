/**
 * Import des charges fixes depuis n'importe quel tableau Excel / CSV (fichier
 * partagé : bridge/shared/import). Les colonnes sont reconnues par leur
 * intitulé ou leur contenu ; la périodicité et le HT/TTC se lisent dans la
 * colonne prévue, sinon dans l'intitulé du montant (« Coût annuel TTC ») ou le
 * nom de la charge (« Assurance annuelle »).
 */
import { normalize, parseNumber, type ImportField, type ImportRow } from './importCore';

export type ChargePeriod = 'daily' | 'monthly' | 'yearly';
export type ChargeKind = 'insurance' | 'leasing' | 'office' | 'maintenance' | 'personnel' | 'vehicle' | 'other';

export interface ImportedCharge {
  name: string;
  amount: number;
  period: ChargePeriod;
  taxMode: 'ht' | 'ttc';
  kind: ChargeKind;
}

// L'ordre compte : « HT / TTC » passe avant « Catégorie » (sinon « Type » serait pris).
export const CHARGE_FIELDS: ImportField[] = [
  {
    key: 'name', label: 'Charge', required: true, infer: 'text',
    aliases: ['nom', 'libelle', 'intitule', 'designation', 'poste', 'description', 'nature', 'objet', 'depense', 'frais', 'nom de la charge', 'type de charge'],
  },
  {
    key: 'amount', label: 'Montant', required: true, type: 'number', infer: 'number',
    aliases: ['montant ht', 'montant ttc', 'cout', 'prix', 'somme', 'total', 'valeur', 'euros', 'eur', 'mensualite', 'cotisation', 'prime', 'tarif'],
  },
  { key: 'period', label: 'Périodicité', aliases: ['frequence', 'periode', 'rythme', 'recurrence', 'echeance', 'paiement'] },
  { key: 'tax', label: 'HT / TTC', aliases: ['ht ttc', 'taxe', 'tva', 'type de montant', 'ht ou ttc'] },
  { key: 'category', label: 'Catégorie', aliases: ['type', 'famille', 'rubrique', 'nature de charge', 'compte', 'poste comptable'] },
];

export const CHARGE_TEMPLATE_EXAMPLES: (string | number)[][] = [
  ['Assurance flotte', 4200, 'Annuel', 'TTC', 'Assurance'],
  ['Loyer du dépôt', 1500, 'Mensuel', 'HT', 'Bureaux'],
  ['Expert-comptable', 350, 'Mensuel', 'HT', 'Administratif'],
  ['Leasing tracteur', 1850, 'Mensuel', 'HT', 'Leasing'],
  ['Téléphones et forfaits', 12, 'Journalier', 'HT', 'Autre'],
];

export const CHARGE_TEMPLATE_HELP = [
  'Périodicité : Journalier, Mensuel, Trimestriel ou Annuel (Mensuel si vide).',
  'HT / TTC : HT si vide.',
  'Catégorie : Assurance, Leasing, Bureaux, Administratif, Entretien, Personnel, Véhicule ou Autre.',
  'Les charges déjà présentes (même nom) ne sont pas importées une deuxième fois.',
];

type Conv = { period: ChargePeriod; factor: number };

function periodOf(text: string): Conv | null {
  const t = normalize(text);
  if (!t) return null;
  if (/\b(jour|journalier|journaliere|quotidien|quotidienne|daily|par jour|j)\b/.test(t)) return { period: 'daily', factor: 1 };
  if (/\b(hebdo|hebdomadaire|semaine|weekly)\b/.test(t)) return { period: 'monthly', factor: 52 / 12 };
  if (/\b(trimestre|trimestriel|trimestrielle|quarterly)\b/.test(t)) return { period: 'monthly', factor: 1 / 3 };
  if (/\b(semestre|semestriel|semestrielle)\b/.test(t)) return { period: 'yearly', factor: 2 };
  if (/\b(an|ans|annuel|annuelle|annee|yearly|annual|par an)\b/.test(t)) return { period: 'yearly', factor: 1 };
  if (/\b(mois|mensuel|mensuelle|mensualite|monthly|par mois)\b/.test(t)) return { period: 'monthly', factor: 1 };
  return null;
}

function taxOf(text: string): 'ht' | 'ttc' | null {
  const t = normalize(text);
  if (/\bttc\b/.test(t)) return 'ttc';
  if (/\bht\b|hors taxe/.test(t)) return 'ht';
  return null;
}

export function kindOf(text: string): ChargeKind | null {
  const t = normalize(text);
  if (!t) return null;
  if (/assur/.test(t)) return 'insurance';
  if (/leasing|credit bail|\blld\b|\bloa\b|location (vehicule|camion|tracteur|porteur|remorque)/.test(t)) return 'leasing';
  if (/entretien|maintenance|reparation|pneu|revision|controle technique|garage/.test(t)) return 'maintenance';
  if (/salaire|personnel|urssaf|charges sociales|mutuelle|formation|interim|paie/.test(t)) return 'personnel';
  if (/vehicule|camion|tracteur|carburant|gazole|peage|carte grise|telematique|geoloc/.test(t)) return 'vehicle';
  if (/loyer|bureau|depot|local|locaux|electricite|eau|internet|telephone|comptab|expert|banque|logiciel|abonnement|administratif|avocat|juridique|impot|taxe|cfe/.test(t)) return 'office';
  return null;
}

/** Convertit les lignes lues en charges prêtes à créer (les lignes sans montant sont écartées). */
export function toCharges(rows: ImportRow[], columns: Record<string, string | undefined> = {}): ImportedCharge[] {
  const amountHeader = columns.amount ?? '';
  const out: ImportedCharge[] = [];
  for (const r of rows) {
    const name = String(r.name ?? '').trim();
    const raw = parseNumber(r.amount);
    if (!name || raw == null || raw <= 0) continue;
    const conv = periodOf(String(r.period ?? '')) ?? periodOf(amountHeader) ?? periodOf(name) ?? { period: 'monthly' as const, factor: 1 };
    const taxMode = taxOf(String(r.tax ?? '')) ?? taxOf(amountHeader) ?? 'ht';
    const kind = kindOf(String(r.category ?? '')) ?? kindOf(name) ?? 'other';
    out.push({ name: name.slice(0, 120), amount: Math.round(raw * conv.factor * 100) / 100, period: conv.period, taxMode, kind });
  }
  return out;
}

/** Nom normalisé, pour ne pas importer deux fois la même charge. */
export const chargeKey = (name: string) => normalize(name);
