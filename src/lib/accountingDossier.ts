/**
 * Dossier comptable du mois — pièces communes aux 3 logiciels (fichier partagé,
 * bridge/shared/accounting) : fiches de paie validées, pénalités, tableurs CSV,
 * fiche « à lire ». Chaque logiciel y ajoute ses factures, avoirs et son FEC.
 */
import { supabase } from '@/integrations/supabase/client';
import { buildPayslipPDF, periodLabel, type PayslipPDFData } from '@/lib/pdfPayslip';
import type { ZipEntry } from '@/lib/zip';

// Tables hors des types générés : accès non typé.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

/** Bornes d'un mois (AAAA-MM) : premier et dernier jour. */
export function monthBounds(period: string): { from: string; to: string } {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(last).padStart(2, '0')}` };
}

/** CSV pour Excel (séparateur « ; », BOM UTF-8, décimales à la française). */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v == null) return '';
    const s = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

export const safeName = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'document';

const pdfBytes = (doc: { output: (t: 'arraybuffer') => ArrayBuffer }) => new Uint8Array(doc.output('arraybuffer'));

/** Fiches de paie validées du mois (PDF) + récapitulatif CSV. */
export async function payslipEntries(licenseId: string, period: string, employer: PayslipPDFData['employer']): Promise<{ entries: ZipEntry[]; count: number }> {
  const { data, error } = await db.from('payslips').select('*').eq('license_id', licenseId).eq('period', period).eq('status', 'validated').order('employee_name');
  if (error) throw new Error(`Fiches de paie : ${error.message}`);
  const rows = (data ?? []) as { employee_name: string; employee_job: string | null; employee_classification: string | null; input: PayslipPDFData['input']; result: PayslipPDFData['result']; status: string; gross: number; net_to_pay: number; employer_cost: number }[];
  const entries: ZipEntry[] = rows.map((r) => ({
    name: `fiches-de-paie/${safeName(r.employee_name)}-${period}.pdf`,
    data: pdfBytes(buildPayslipPDF({
      period,
      employer: { ...employer, convention: employer.convention || 'Transports routiers et activités auxiliaires du transport (IDCC 0016)' },
      employee: { name: r.employee_name, job: r.employee_job, classification: r.employee_classification },
      input: r.input,
      result: r.result,
      status: r.status,
    } as PayslipPDFData)),
  }));
  if (rows.length) {
    entries.push({
      name: `fiches-de-paie/recapitulatif-paie-${period}.csv`,
      data: toCsv(['Salarié', 'Emploi', 'Brut', 'Net à payer', 'Coût employeur'], rows.map((r) => [r.employee_name, r.employee_job, Number(r.gross), Number(r.net_to_pay), Number(r.employer_cost)])),
    });
  }
  return { entries, count: rows.length };
}

const KIND_LABEL: Record<string, string> = { client_withholding: 'Retenue client', late_payment: 'Pénalités de retard réclamées', fine: 'Amende / PV' };

/** Pénalités du mois (CSV). */
export async function penaltyEntries(licenseId: string, period: string, names: { clients?: Map<string, string> } = {}): Promise<{ entries: ZipEntry[]; count: number }> {
  const { from, to } = monthBounds(period);
  const { data, error } = await db.from('penalties').select('*').eq('license_id', licenseId).gte('occurred_on', from).lte('occurred_on', to).order('occurred_on');
  if (error) return { entries: [], count: 0 }; // table absente : rien à joindre
  const rows = (data ?? []) as { kind: string; occurred_on: string; amount: number; status: string; reason: string | null; reference: string | null; client_id: string | null }[];
  if (!rows.length) return { entries: [], count: 0 };
  return {
    count: rows.length,
    entries: [{
      name: `penalites-${period}.csv`,
      data: toCsv(['Date', 'Type', 'Client', 'Motif', 'Référence', 'Montant', 'Statut'], rows.map((r) => [r.occurred_on, KIND_LABEL[r.kind] ?? r.kind, (r.client_id && names.clients?.get(r.client_id)) || '', r.reason, r.reference, Number(r.amount), r.status])),
    }],
  };
}

/** Fiche « à lire » en tête du dossier. */
export function readme(opts: { app: string; company: string; period: string; lines: string[] }): ZipEntry {
  return {
    name: 'A-LIRE.txt',
    data: [
      `Dossier comptable — ${opts.company}`,
      `Période : ${periodLabel(opts.period)} (${opts.period})`,
      `Préparé avec ${opts.app} le ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      'Contenu :',
      ...opts.lines.map((l) => `- ${l}`),
      '',
      'Les factures sont au format Factur-X (PDF avec données XML intégrées).',
      'Le FEC couvre les ventes du mois (format de l\'article A47 A-1 du LPF).',
    ].join('\r\n'),
  };
}
