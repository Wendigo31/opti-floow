import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DriverForm } from '@/components/drivers/DriverForm';
import type { ExtendedDriver } from '@/types/driver';

describe('DriverForm', () => {
  const mockSetFormData = vi.fn();
  const mockSetFormContractType = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockSetFormData.mockClear();
    mockSetFormContractType.mockClear();
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
  });

  const renderForm = (overrides: {
    formData?: Partial<ExtendedDriver>;
    formContractType?: 'cdi' | 'cdd' | 'interim' | 'autre' | 'joker';
    canViewFinancialData?: boolean;
  } = {}) =>
    render(
      <DriverForm
        formData={overrides.formData ?? {}}
        setFormData={mockSetFormData}
        formContractType={overrides.formContractType ?? 'cdi'}
        setFormContractType={mockSetFormContractType}
        canViewFinancialData={overrides.canViewFinancialData ?? true}
        onCancel={mockOnCancel}
        onSave={mockOnSave}
      />
    );

  it('renders the base fields', () => {
    const { getByPlaceholderText, getByLabelText } = renderForm();
    expect(getByPlaceholderText('Nom complet')).toBeInTheDocument();
    expect(getByLabelText(/Jours travaillés\/mois/i)).toBeInTheDocument();
    expect(getByLabelText(/Heures\/jour/i)).toBeInTheDocument();
  });

  it('calls setFormData when the name field changes', () => {
    const { getByPlaceholderText } = renderForm();
    fireEvent.change(getByPlaceholderText('Nom complet'), { target: { value: 'Jean Dupont' } });
    expect(mockSetFormData).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jean Dupont' }));
  });

  it('calls onSave when "Enregistrer" is clicked', () => {
    const { getByText } = renderForm();
    fireEvent.click(getByText('Enregistrer'));
    expect(mockOnSave).toHaveBeenCalled();
  });

  it('calls onCancel when "Annuler" is clicked', () => {
    const { getByText } = renderForm();
    fireEvent.click(getByText('Annuler'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  describe('financial data masking (canViewFinancialData)', () => {
    it('shows salary, bonus and allowance fields to a user who can view financial data', () => {
      const { getByLabelText } = renderForm({ formContractType: 'cdi', canViewFinancialData: true });
      expect(getByLabelText(/Salaire brut mensuel/i)).toBeInTheDocument();
      expect(getByLabelText(/Taux horaire brut/i)).toBeInTheDocument();
      expect(getByLabelText(/Charges patronales/i)).toBeInTheDocument();
      expect(getByLabelText(/Prime dimanche/i)).toBeInTheDocument();
      expect(getByLabelText(/Indemnité repas/i)).toBeInTheDocument();
      expect(getByLabelText(/Indemnité découcher/i)).toBeInTheDocument();
    });

    it('hides all pay fields and shows the restricted-access notice for a user without financial access', () => {
      const { queryByLabelText, getByText } = renderForm({ formContractType: 'cdi', canViewFinancialData: false });
      expect(queryByLabelText(/Salaire brut mensuel/i)).not.toBeInTheDocument();
      expect(queryByLabelText(/Taux horaire brut/i)).not.toBeInTheDocument();
      expect(queryByLabelText(/Charges patronales/i)).not.toBeInTheDocument();
      expect(queryByLabelText(/Prime dimanche/i)).not.toBeInTheDocument();
      expect(queryByLabelText(/Indemnité repas/i)).not.toBeInTheDocument();
      expect(queryByLabelText(/Indemnité découcher/i)).not.toBeInTheDocument();
      expect(getByText(/réservés à la Direction/i)).toBeInTheDocument();
    });

    it('hides the interim hourly rate/coefficient for a user without financial access, but keeps the agency name field', () => {
      const { queryByLabelText, getByLabelText } = renderForm({ formContractType: 'interim', canViewFinancialData: false });
      expect(getByLabelText(/Agence d'intérim/i)).toBeInTheDocument();
      expect(queryByLabelText(/Taux horaire intérim/i)).not.toBeInTheDocument();
      expect(queryByLabelText(/Coefficient agence/i)).not.toBeInTheDocument();
    });

    it('never shows salary/bonus fields for interim or "autre" contracts, even with financial access', () => {
      const interim = renderForm({ formContractType: 'interim', canViewFinancialData: true });
      expect(interim.queryByLabelText(/Salaire brut mensuel/i)).not.toBeInTheDocument();
      interim.unmount();

      const autre = renderForm({ formContractType: 'autre', canViewFinancialData: true });
      expect(autre.queryByLabelText(/Salaire brut mensuel/i)).not.toBeInTheDocument();
    });
  });
});
