import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DriverForm } from '@/components/drivers/DriverForm';

describe('DriverForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders form with input fields', () => {
    const { getByPlaceholderText } = render(
      <DriverForm
        driverType="cdi"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    expect(getByPlaceholderText(/nom du conducteur/i)).toBeInTheDocument();
  });

  it('calls onSave when form is submitted', async () => {
    const { getByPlaceholderText, getByText } = render(
      <DriverForm
        driverType="cdi"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    const input = getByPlaceholderText(/nom du conducteur/i) as HTMLInputElement;
    input.value = 'John Doe';
    input.dispatchEvent(new Event('change', { bubbles: true }));

    getByText(/Créer/i).click();

    expect(mockOnSave).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const { getByText } = render(
      <DriverForm
        driverType="cdi"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );

    getByText(/Annuler/i).click();
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
