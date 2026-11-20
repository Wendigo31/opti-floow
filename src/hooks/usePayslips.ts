import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_PAYROLL_RATES, type PayrollRates, type PayslipInput, type PayslipResult } from '@/lib/payslipCalc';

export interface PayslipRow {
  id: string;
  license_id: string;
  driver_id: string | null;
  employee_name: string;
  employee_job: string | null;
  employee_classification: string | null;
  period: string;
  input: PayslipInput;
  result: PayslipResult;
  gross: number;
  net_to_pay: number;
  employer_cost: number;
  status: 'draft' | 'validated';
  validated_at: string | null;
  created_by: string | null;
  updated_at: string;
}

// Tables ajoutées par la migration du 17/10 : pas encore dans les types générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;
const missing = (msg?: string) => /payslips|payroll_settings|does not exist|schema cache/i.test(msg || '');

export function usePayslips(licenseId: string | null | undefined, period?: string) {
  const license = licenseId ? { id: licenseId } : null;
  return useQuery({
    queryKey: ['payslips', license?.id, period ?? 'all'],
    enabled: !!license?.id,
    queryFn: async (): Promise<{ rows: PayslipRow[]; available: boolean }> => {
      let q = db().from('payslips').select('*').eq('license_id', license!.id).order('period', { ascending: false }).order('employee_name');
      if (period) q = q.eq('period', period);
      const { data, error } = await q;
      if (error) {
        if (missing(error.message)) return { rows: [], available: false };
        throw error;
      }
      return { rows: (data || []) as PayslipRow[], available: true };
    },
  });
}

export function useSavePayslip(licenseId: string | null | undefined, currentUser?: string | null) {
  const license = licenseId ? { id: licenseId } : null;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<PayslipRow, 'id' | 'license_id' | 'updated_at' | 'validated_at' | 'created_by'> & { id?: string }) => {
      const row = {
        ...p,
        license_id: license!.id,
        validated_at: p.status === 'validated' ? new Date().toISOString() : null,
        created_by: currentUser || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = p.id
        ? await db().from('payslips').update(row).eq('id', p.id).select().single()
        : await db().from('payslips').insert(row).select().single();
      if (error) {
        if (/duplicate key|payslips_unique/i.test(error.message)) throw new Error('Une fiche existe déjà pour ce salarié ce mois-ci');
        if (missing(error.message)) throw new Error('Fiches de paie indisponibles : la base doit être mise à jour (migration du 17/10)');
        throw error;
      }
      return data as PayslipRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['payslips'] });
      toast.success(row.status === 'validated' ? 'Fiche de paie validée' : 'Brouillon enregistré');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePayslip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('payslips').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payslips'] });
      toast.success('Brouillon supprimé');
    },
    onError: () => toast.error('Suppression impossible (une fiche validée ne se supprime pas)'),
  });
}

export function usePayrollRates(licenseId: string | null | undefined) {
  const license = licenseId ? { id: licenseId } : null;
  return useQuery({
    queryKey: ['payroll-settings', license?.id],
    enabled: !!license?.id,
    queryFn: async (): Promise<PayrollRates> => {
      const { data, error } = await db().from('payroll_settings').select('rates').eq('license_id', license!.id).maybeSingle();
      if (error || !data) return DEFAULT_PAYROLL_RATES;
      return { ...DEFAULT_PAYROLL_RATES, ...(data.rates || {}) };
    },
  });
}

export function useSavePayrollRates(licenseId: string | null | undefined) {
  const license = licenseId ? { id: licenseId } : null;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rates: PayrollRates) => {
      const { error } = await db().from('payroll_settings').upsert({ license_id: license!.id, rates, updated_at: new Date().toISOString() });
      if (error) throw new Error(missing(error.message) ? 'Base à mettre à jour (migration du 17/10)' : error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-settings'] });
      toast.success('Paramètres de paie enregistrés');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
