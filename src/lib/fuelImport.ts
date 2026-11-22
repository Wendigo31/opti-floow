/**
 * Import des relevés de cartes carburant (AS24, DKV, Total, Shell, UTA…) exportés en CSV.
 * Les colonnes sont reconnues par leur nom (date, immatriculation, litres, montant HT/TTC,
 * station, carte, kilométrage) quel que soit l'émetteur ; séparateur ; , ou tabulation.
 */
export interface FuelRow {
  occurred_at: string;
  plate: string | null;
  product: string | null;
  liters: number | null;
  amount_ht: number | null;
  amount_ttc: number | null;
  station: string | null;
  card: string | null;
  mileage: number | null;
  import_key: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const normPlate = (s?: string | null) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export function parseNumber(v?: string | null): number | null {
  if (v == null) return null;
  let s = String(v).replace(/[\s €]/g, '').replace(/[^0-9,.-]/g, '');
  if (!s) return null;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseDate(v?: string | null, time?: string | null): string | null {
  if (!v) return null;
  const s = v.trim();
  let y: number, m: number, d: number, hh = 12, mm = 0;
  let r = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (r) { d = +r[1]; m = +r[2]; y = +r[3] < 100 ? 2000 + +r[3] : +r[3]; if (r[4]) { hh = +r[4]; mm = +r[5]; } }
  else if ((r = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/))) { y = +r[1]; m = +r[2]; d = +r[3]; if (r[4]) { hh = +r[4]; mm = +r[5]; } }
  else return null;
  const t = time?.match(/(\d{1,2}):(\d{2})/);
  if (t) { hh = +t[1]; mm = +t[2]; }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d, hh - 1, mm)).toISOString(); // heure de Paris (≈ UTC+1)
}

const COLS: Record<keyof Omit<FuelRow, 'occurred_at' | 'import_key'> | 'date' | 'time', string[]> = {
  date: ['date transaction', 'date operation', 'date de transaction', 'date'],
  time: ['heure', 'time'],
  plate: ['immatriculation', 'immat', 'plaque', 'vehicule', 'registration', 'license plate'],
  product: ['produit', 'article', 'carburant', 'product'],
  liters: ['quantite', 'litres', 'volume', 'qte', 'quantity', 'liters'],
  amount_ht: ['montant ht', 'total ht', 'ht', 'net amount', 'montant hors taxe'],
  amount_ttc: ['montant ttc', 'total ttc', 'ttc', 'montant', 'gross amount', 'amount'],
  station: ['station', 'lieu', 'site', 'point de vente', 'location'],
  card: ['carte', 'numero de carte', 'n carte', 'card'],
  mileage: ['kilometrage', 'km', 'compteur', 'odometre', 'mileage'],
};

export function detectColumns(header: string[]) {
  const h = header.map(norm);
  const used = new Set<number>();
  const map: Partial<Record<keyof typeof COLS, number>> = {};
  // Les noms les plus précis d'abord (ex. « montant ht » avant « montant »)
  const order: (keyof typeof COLS)[] = ['date', 'time', 'plate', 'product', 'liters', 'amount_ht', 'amount_ttc', 'station', 'card', 'mileage'];
  for (const key of order) {
    for (const name of COLS[key]) {
      const i = h.findIndex((c, idx) => !used.has(idx) && (c === name || c.startsWith(`${name} `) || (name.length > 3 && c.includes(name))));
      if (i >= 0) { map[key] = i; used.add(i); break; }
    }
  }
  return map;
}

function key(parts: unknown[]) {
  let h = 2166136261;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `fx${(h >>> 0).toString(36)}${s.length.toString(36)}`;
}

export function parseFuelCsv(text: string): { rows: FuelRow[]; columns: Partial<Record<keyof typeof COLS, number>>; errors: number } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], columns: {}, errors: 0 };
  const first = lines[0];
  const sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const header = splitLine(first, sep);
  const c = detectColumns(header);
  const rows: FuelRow[] = [];
  let errors = 0;
  for (const line of lines.slice(1)) {
    const v = splitLine(line, sep);
    const get = (k: keyof typeof COLS) => (c[k] != null ? v[c[k]!] ?? null : null);
    const occurred = parseDate(get('date'), get('time'));
    const liters = parseNumber(get('liters'));
    const ht = parseNumber(get('amount_ht'));
    let ttc = parseNumber(get('amount_ttc'));
    if (ttc != null && ht != null && ttc === ht) ttc = null;
    if (!occurred || (liters == null && ht == null && ttc == null)) { errors++; continue; }
    const plate = get('plate') ? normPlate(get('plate')) || null : null;
    const card = get('card') || null;
    rows.push({
      occurred_at: occurred,
      plate,
      product: get('product') || null,
      liters,
      amount_ht: ht ?? (ttc != null ? Math.round((ttc / 1.2) * 100) / 100 : null),
      amount_ttc: ttc,
      station: get('station') || null,
      card,
      mileage: parseNumber(get('mileage')) != null ? Math.round(parseNumber(get('mileage'))!) : null,
      import_key: key([occurred, plate, liters, ht ?? ttc, card, get('station')]),
    });
  }
  return { rows, columns: c, errors };
}

export interface VehicleFuelStats { liters: number; amountHt: number; pricePerLiter: number | null; km: number | null; litersPer100: number | null; costPerKm: number | null; count: number }

/** Consommation et coût réels d'un véhicule sur une liste de transactions (kilométrage relevé à la pompe). */
export function vehicleFuelStats(tx: { liters: number | null; amount_ht: number | null; mileage: number | null; occurred_at: string }[]): VehicleFuelStats {
  const liters = tx.reduce((a, t) => a + (Number(t.liters) || 0), 0);
  const amountHt = tx.reduce((a, t) => a + (Number(t.amount_ht) || 0), 0);
  const km = tx.map((t) => t.mileage).filter((m): m is number => !!m).sort((a, b) => a - b);
  const span = km.length >= 2 ? km[km.length - 1] - km[0] : null;
  // Le premier plein remplit le réservoir d'avant : on le retire pour la conso.
  const sorted = [...tx].filter((t) => t.mileage).sort((a, b) => (a.mileage! - b.mileage!));
  const litersAfterFirst = sorted.slice(1).reduce((a, t) => a + (Number(t.liters) || 0), 0);
  const costAfterFirst = sorted.slice(1).reduce((a, t) => a + (Number(t.amount_ht) || 0), 0);
  return {
    liters, amountHt, count: tx.length,
    pricePerLiter: liters ? amountHt / liters : null,
    km: span,
    litersPer100: span && span > 0 ? (litersAfterFirst / span) * 100 : null,
    costPerKm: span && span > 0 ? costAfterFirst / span : null,
  };
}
