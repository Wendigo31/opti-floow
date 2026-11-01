/**
 * Factures OptiFlow (table invoices) : brouillons modifiables, émission numérotée
 * en base (issue_invoice), avoirs (create_credit_note), réglages de la société
 * (invoice_settings). Accès : Direction et Comptabilité.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
import { DEFAULT_INVOICE_ISSUER, type Invoice, type InvoiceIssuer, type InvoiceLine, type InvoiceStatus } from '@/lib/invoices';
import { DEFAULT_FUEL_INDEX, type FuelIndexSettings } from '@/lib/fuelIndex';

export interface FlowInvoice extends Invoice {
  reminderCount: number;
  lastReminderAt?: string | null;
  paymentTermsDays: number;
}

interface Row {
  id: string;
  number: string | null;
  kind: 'invoice' | 'credit_note';
  status: InvoiceStatus;
  credit_of: string | null;
  credit_reason: string | null;
  client_id: string | null;
  client: { name?: string; address?: string; email?: string; siren?: string } | null;
  issue_date: string | null;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  lines: InvoiceLine[];
  tax_rate: number;
  payment_terms_days: number;
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  reminder_count: number;
  last_reminder_at: string | null;
  created_at: string;
}

type Res<T = unknown> = { data: T; error: { message: string } | null };
// Tables et fonctions absentes des types générés : accès non typé.
const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => { eq: (k: string, v: string) => { order: (c: string, o: { ascending: boolean }) => Promise<Res<Row[]>>; maybeSingle: () => Promise<Res<{ issuer: InvoiceIssuer; fuel: FuelIndexSettings } | null>> } };
    insert: (v: Record<string, unknown>) => { select: () => { single: () => Promise<Res<Row>> } };
    update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<Res> };
    delete: () => { eq: (k: string, v: string) => Promise<Res> };
    upsert: (v: Record<string, unknown>) => Promise<Res>;
  };
  rpc: (f: string, a: Record<string, unknown>) => Promise<Res<Row>>;
};

const today = () => new Date().toISOString().slice(0, 10);

function toInvoice(r: Row, byId: Map<string, Row>): FlowInvoice {
  return {
    id: r.id,
    number: r.number ?? '',
    clientId: r.client_id ?? '',
    clientName: r.client?.name ?? '',
    clientAddress: r.client?.address,
    clientEmail: r.client?.email,
    clientSiren: r.client?.siren,
    issueDate: r.issue_date ?? today(),
    dueDate: r.due_date ?? '',
    periodStart: r.period_start ?? undefined,
    periodEnd: r.period_end ?? undefined,
    lines: r.lines ?? [],
    taxRate: Number(r.tax_rate),
    notes: r.notes ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    sentAt: r.sent_at ?? undefined,
    paidAt: r.paid_at ?? undefined,
    cancelledAt: r.cancelled_at ?? undefined,
    kind: r.kind,
    creditOf: r.credit_of ? { id: r.credit_of, number: byId.get(r.credit_of)?.number ?? '' } : undefined,
    creditReason: r.credit_reason ?? undefined,
    reminderCount: r.reminder_count,
    lastReminderAt: r.last_reminder_at,
    paymentTermsDays: r.payment_terms_days,
  };
}

export interface InvoiceDraft {
  id?: string;
  clientId: string;
  client: { name: string; address?: string; email?: string; siren?: string };
  periodStart?: string;
  periodEnd?: string;
  lines: InvoiceLine[];
  taxRate: number;
  paymentTermsDays: number;
  notes?: string;
}

export function useFlowInvoices() {
  const { licenseId } = useLicenseContext();
  const qc = useQueryClient();
  const key = ['flow-invoices', licenseId];
  const settingsKey = ['flow-invoice-settings', licenseId];

  const list = useQuery({
    queryKey: key,
    enabled: !!licenseId,
    queryFn: async (): Promise<FlowInvoice[]> => {
      const { data, error } = await db.from('invoices').select('*').eq('license_id', licenseId as string).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const rows = data ?? [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      return rows.map((r) => toInvoice(r, byId));
    },
  });

  const settings = useQuery({
    queryKey: settingsKey,
    enabled: !!licenseId,
    queryFn: async () => {
      const { data } = await db.from('invoice_settings').select('issuer, fuel').eq('license_id', licenseId as string).maybeSingle();
      return {
        issuer: { ...DEFAULT_INVOICE_ISSUER, ...(data?.issuer ?? {}) } as InvoiceIssuer,
        fuel: { ...DEFAULT_FUEL_INDEX, ...(data?.fuel ?? {}) } as FuelIndexSettings,
      };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };

  return {
    invoices: list.data ?? [],
    loading: list.isLoading,
    error: list.error as Error | null,
    issuer: settings.data?.issuer ?? DEFAULT_INVOICE_ISSUER,
    fuel: settings.data?.fuel ?? DEFAULT_FUEL_INDEX,

    async saveSettings(patch: { issuer?: InvoiceIssuer; fuel?: FuelIndexSettings }) {
      const cur = settings.data ?? { issuer: DEFAULT_INVOICE_ISSUER, fuel: DEFAULT_FUEL_INDEX };
      const { error } = await db.from('invoice_settings').upsert({
        license_id: licenseId,
        issuer: patch.issuer ?? cur.issuer,
        fuel: patch.fuel ?? cur.fuel,
        updated_at: new Date().toISOString(),
      });
      fail(error);
      await qc.invalidateQueries({ queryKey: settingsKey });
    },

    /** Crée ou met à jour un brouillon ; renvoie son id. */
    async saveDraft(d: InvoiceDraft): Promise<string> {
      const values = {
        client_id: d.clientId || null,
        client: d.client,
        period_start: d.periodStart || null,
        period_end: d.periodEnd || null,
        lines: d.lines,
        tax_rate: d.taxRate,
        payment_terms_days: d.paymentTermsDays,
        notes: d.notes || null,
      };
      if (d.id) {
        const { error } = await db.from('invoices').update(values).eq('id', d.id);
        fail(error);
        await refresh();
        return d.id;
      }
      const { data, error } = await db.from('invoices').insert({ ...values, license_id: licenseId }).select().single();
      fail(error);
      await refresh();
      return data.id;
    },

    async deleteDraft(id: string) {
      const { error } = await db.from('invoices').delete().eq('id', id);
      fail(error);
      await refresh();
    },

    async issue(id: string) {
      const { data, error } = await db.rpc('issue_invoice', { p_id: id });
      fail(error);
      await refresh();
      return data;
    },

    async setStatus(id: string, status: 'sent' | 'paid') {
      const { error } = await db.from('invoices').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null }).eq('id', id);
      fail(error);
      await refresh();
    },

    async markSent(id: string) {
      const { error } = await db.from('invoices').update({ sent_at: new Date().toISOString() }).eq('id', id);
      fail(error);
      await refresh();
    },

    async markReminded(inv: FlowInvoice) {
      const { error } = await db.from('invoices').update({ reminder_count: inv.reminderCount + 1, last_reminder_at: new Date().toISOString() }).eq('id', inv.id);
      fail(error);
      await refresh();
    },

    async creditNote(id: string, reason: string, amountHT: number | null) {
      const { data, error } = await db.rpc('create_credit_note', { p_invoice: id, p_reason: reason, p_amount_ht: amountHT });
      fail(error);
      await refresh();
      return data;
    },
  };
}
