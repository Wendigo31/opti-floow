/**
 * Palettes échangées — modèle et calculs communs aux 3 logiciels
 * (fichier partagé : bridge/shared/pallets).
 * « given » = palettes laissées chez le client, « returned » = palettes récupérées.
 * Solde positif : le client nous doit des palettes ; négatif : on lui en doit.
 */
export interface PalletMovement {
  id: string;
  client_id: string;
  site: string | null;
  movement_date: string;
  pallet_type: string;
  given: number;
  returned: number;
  reference: string | null;
  source: 'bureau' | 'conducteur';
  note: string | null;
  created_at: string;
}

export const PALLET_TYPES = ['EUR', 'Perdue', 'Demi-palette', 'Rolls', 'Bac'] as const;

export interface PalletBalance {
  clientId: string;
  /** Solde par type de palette. */
  byType: Record<string, number>;
  total: number;
  lastDate: string | null;
}

export function palletBalances(moves: PalletMovement[]): PalletBalance[] {
  const map = new Map<string, PalletBalance>();
  for (const m of moves) {
    const b = map.get(m.client_id) ?? { clientId: m.client_id, byType: {}, total: 0, lastDate: null };
    const delta = (m.given || 0) - (m.returned || 0);
    b.byType[m.pallet_type] = (b.byType[m.pallet_type] ?? 0) + delta;
    b.total += delta;
    if (!b.lastDate || m.movement_date > b.lastDate) b.lastDate = m.movement_date;
    map.set(m.client_id, b);
  }
  return [...map.values()].sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

export const balanceText = (n: number) =>
  n === 0 ? 'À jour' : n > 0 ? `Le client nous doit ${n} palette${n > 1 ? 's' : ''}` : `Nous devons ${-n} palette${n < -1 ? 's' : ''} au client`;
