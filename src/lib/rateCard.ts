/**
 * Grilles tarifaires par client — modèle et calcul communs aux 3 logiciels
 * (fichier partagé : bridge/shared/pricing).
 *
 * Une grille fixe le prix d'une prestation pour un client selon UNE base
 * (distance, zone de livraison, palettes, poids, arrêts, colis, tournée, heures),
 * découpée en tranches : chaque tranche a un prix à l'unité ou un forfait.
 * S'y ajoutent un minimum de perception et des frais annexes (hayon, attente…).
 */
export type RateBasis = 'km' | 'zone' | 'pallet' | 'weight' | 'stop' | 'package' | 'tour' | 'hour';

export const RATE_BASIS_LABELS: Record<RateBasis, { label: string; unit: string; hint: string }> = {
  km: { label: 'Distance', unit: 'km', hint: 'Prix au km ou forfait selon la tranche de distance' },
  zone: { label: 'Zone de livraison', unit: 'envoi', hint: 'Prix par département de livraison (ex. 31, 33, * pour le reste)' },
  pallet: { label: 'Palettes', unit: 'palette', hint: 'Prix par palette, dégressif selon le nombre' },
  weight: { label: 'Poids', unit: 'kg', hint: 'Prix au kg ou forfait selon la tranche de poids' },
  stop: { label: 'Arrêts', unit: 'arrêt', hint: 'Prix par point de livraison' },
  package: { label: 'Colis', unit: 'colis', hint: 'Prix par colis, dégressif selon le volume' },
  tour: { label: 'Tournée', unit: 'tournée', hint: 'Forfait par tournée (tractionnaire, messagerie)' },
  hour: { label: 'Heures', unit: 'h', hint: 'Prix à l\'heure (mise à disposition)' },
};

export interface RateBand {
  /** Tranche numérique : de / à (inclus). « à » vide = sans limite. */
  from?: number | null;
  to?: number | null;
  /** Base « zone » : département de livraison (« 31 ») ou « * » pour tous les autres. */
  zone?: string | null;
  price: number;
  /** « unit » = prix × quantité ; « flat » = forfait pour la tranche. */
  mode: 'unit' | 'flat';
}

export interface RateExtra {
  label: string;
  price: number;
}

export interface RateCard {
  basis: RateBasis;
  bands: RateBand[];
  /** Minimum de perception HT. */
  minimum?: number | null;
  /** Frais annexes proposés (cochés au cas par cas). */
  extras?: RateExtra[];
  /** L'indexation gazole s'applique en plus (ligne séparée sur la facture). */
  fuelIndexed?: boolean;
  validFrom?: string | null;
  validTo?: string | null;
  notes?: string | null;
}

export interface RateQuery {
  km?: number | null;
  pallets?: number | null;
  weightKg?: number | null;
  stops?: number | null;
  packages?: number | null;
  hours?: number | null;
  tours?: number | null;
  /** Adresse ou code postal de livraison (le département en est tiré). */
  destination?: string | null;
  /** Frais annexes retenus (libellés de la grille). */
  extras?: string[];
  /** Date de la prestation (validité de la grille). */
  date?: string | null;
}

export interface RateLine {
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface RateResult {
  ok: boolean;
  amount: number;
  lines: RateLine[];
  /** Pourquoi la grille ne s'applique pas (donnée manquante, hors tranche, hors validité). */
  reason?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Département d'une adresse française (« 31200 Toulouse » → « 31 », Corse « 20 »). */
export function departmentOf(address?: string | null): string | null {
  const m = String(address || '').match(/\b(\d{5})\b/);
  if (!m) return /^\d{2}$/.test(String(address || '').trim()) ? String(address).trim() : null;
  return m[1].startsWith('97') ? m[1].slice(0, 3) : m[1].slice(0, 2);
}

function quantityFor(basis: RateBasis, q: RateQuery): number | null {
  const v = { km: q.km, pallet: q.pallets, weight: q.weightKg, stop: q.stops, package: q.packages, hour: q.hours, tour: q.tours ?? 1, zone: 1 }[basis];
  return v == null || Number.isNaN(Number(v)) ? null : Number(v);
}

export function priceFromRateCard(card: RateCard, q: RateQuery): RateResult {
  const meta = RATE_BASIS_LABELS[card.basis];
  const day = (q.date || '').slice(0, 10);
  if (day && card.validFrom && day < card.validFrom) return { ok: false, amount: 0, lines: [], reason: `Grille valable à partir du ${card.validFrom}` };
  if (day && card.validTo && day > card.validTo) return { ok: false, amount: 0, lines: [], reason: `Grille expirée le ${card.validTo}` };

  let band: RateBand | undefined;
  let qty = 1;
  let label = '';
  if (card.basis === 'zone') {
    const dept = departmentOf(q.destination);
    if (!dept) return { ok: false, amount: 0, lines: [], reason: 'Code postal de livraison manquant' };
    band = card.bands.find((b) => (b.zone || '').trim() === dept) ?? card.bands.find((b) => (b.zone || '').trim() === '*');
    if (!band) return { ok: false, amount: 0, lines: [], reason: `Département ${dept} absent de la grille` };
    label = `Transport — zone ${band.zone === '*' ? `autres départements (${dept})` : dept}`;
  } else {
    const v = quantityFor(card.basis, q);
    if (v == null || v <= 0) return { ok: false, amount: 0, lines: [], reason: `${meta.label} manquant(e)` };
    qty = v;
    band = card.bands.find((b) => (b.from == null || v >= Number(b.from)) && (b.to == null || v <= Number(b.to)));
    if (!band) return { ok: false, amount: 0, lines: [], reason: `${v} ${meta.unit} hors des tranches de la grille` };
    const range = band.to != null ? `${band.from ?? 0} à ${band.to}` : `${band.from ?? 0} et plus`;
    label = `Transport — ${meta.label.toLowerCase()} ${range} ${meta.unit}`;
  }

  const lines: RateLine[] = [];
  if (band.mode === 'unit' && card.basis !== 'zone') {
    lines.push({ label, quantity: r2(qty), unit: meta.unit, unitPrice: band.price, total: r2(qty * band.price) });
  } else {
    lines.push({ label, quantity: 1, unit: 'forfait', unitPrice: band.price, total: r2(band.price) });
  }
  const base = lines[0].total;
  if (card.minimum && base < card.minimum) {
    lines[0] = { label: `${label} (minimum de perception)`, quantity: 1, unit: 'forfait', unitPrice: card.minimum, total: r2(card.minimum) };
  }
  for (const name of q.extras ?? []) {
    const extra = card.extras?.find((e) => e.label === name);
    if (extra) lines.push({ label: extra.label, quantity: 1, unit: 'forfait', unitPrice: extra.price, total: r2(extra.price) });
  }
  return { ok: true, amount: r2(lines.reduce((s, l) => s + l.total, 0)), lines };
}

/** Grille vide de départ pour une base donnée. */
export function emptyRateCard(basis: RateBasis = 'km'): RateCard {
  const bands: RateBand[] =
    basis === 'zone'
      ? [{ zone: '', price: 0, mode: 'flat' }, { zone: '*', price: 0, mode: 'flat' }]
      : basis === 'tour'
        ? [{ from: 1, to: null, price: 0, mode: 'unit' }]
        : [{ from: 0, to: null, price: 0, mode: 'unit' }];
  return { basis, bands, minimum: null, extras: [], fuelIndexed: true, validFrom: null, validTo: null, notes: null };
}

/** Résumé court d'une grille (« Distance · 3 tranches · min. 150 € »). */
export function rateCardSummary(card: RateCard): string {
  const parts = [RATE_BASIS_LABELS[card.basis].label, `${card.bands.length} tranche${card.bands.length > 1 ? 's' : ''}`];
  if (card.minimum) parts.push(`min. ${card.minimum} €`);
  if (card.extras?.length) parts.push(`${card.extras.length} frais annexe${card.extras.length > 1 ? 's' : ''}`);
  return parts.join(' · ');
}
