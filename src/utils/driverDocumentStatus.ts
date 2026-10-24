import type { DriverDocument, DriverDocumentType } from '@/types';

export const driverDocumentTypes: readonly { value: DriverDocumentType; label: string }[] = [
  { value: 'permis', label: 'Permis de conduire' },
  { value: 'carte_conducteur', label: 'Carte conducteur (tachygraphe)' },
  { value: 'fimo_fco', label: 'FIMO/FCO' },
  { value: 'visite_medicale', label: 'Visite médicale' },
  { value: 'contrat_cdd', label: 'Fin de CDD' },
  { value: 'other', label: 'Autre document' },
] as const;

export function getDriverDocumentTypeLabel(type: DriverDocumentType): string {
  return driverDocumentTypes.find(t => t.value === type)?.label ?? 'Autre document';
}

export type DocumentUrgency = 'ok' | 'warning' | 'danger';

const WARNING_THRESHOLD_DAYS = 60;
const DANGER_THRESHOLD_DAYS = 15;

/** Jours restants avant l'échéance (négatif si déjà dépassée). */
export function getDaysUntilExpiry(expiryDate: string, today: Date = new Date()): number {
  const expiry = new Date(expiryDate + 'T00:00');
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((expiry.getTime() - start.getTime()) / 86400000);
}

export function getDocumentUrgency(doc: Pick<DriverDocument, 'expiryDate'>, today: Date = new Date()): DocumentUrgency {
  const daysLeft = getDaysUntilExpiry(doc.expiryDate, today);
  if (daysLeft <= DANGER_THRESHOLD_DAYS) return 'danger'; // inclut les échéances déjà dépassées
  if (daysLeft <= WARNING_THRESHOLD_DAYS) return 'warning';
  return 'ok';
}

/** Documents du conducteur qui méritent une attention (bientôt expirés ou déjà expirés). */
export function getDocumentsNeedingAttention(
  documents: DriverDocument[] | undefined,
  today: Date = new Date()
): DriverDocument[] {
  return (documents || []).filter(d => getDocumentUrgency(d, today) !== 'ok');
}

export function formatExpiryStatus(doc: Pick<DriverDocument, 'expiryDate'>, today: Date = new Date()): string {
  const daysLeft = getDaysUntilExpiry(doc.expiryDate, today);
  const dateLabel = new Date(doc.expiryDate + 'T00:00').toLocaleDateString('fr-FR');
  if (daysLeft < 0) return `expiré depuis le ${dateLabel}`;
  if (daysLeft === 0) return `expire aujourd'hui (${dateLabel})`;
  return `expire le ${dateLabel} (dans ${daysLeft} j)`;
}

export function generateDriverDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
