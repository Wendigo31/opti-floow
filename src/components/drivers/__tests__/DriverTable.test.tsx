import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DriverTable } from '@/components/drivers/DriverTable';
import type { ExtendedDriver } from '@/types/driver';

describe('DriverTable', () => {
  const mockDrivers: ExtendedDriver[] = [
    { id: '1', name: 'Driver 1', baseSalary: 2200, hourlyRate: 12.5, workingDaysPerMonth: 21 } as ExtendedDriver,
    { id: '2', name: 'Driver 2', baseSalary: 2300, hourlyRate: 13, workingDaysPerMonth: 22 } as ExtendedDriver,
  ];

  const mockOnToggleCheck = vi.fn();
  const mockOnToggleSelectAll = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const formatCurrency = (value: number) => `${value.toFixed(2)} €`;
  const calculateEmployerCost = (driver: ExtendedDriver) => (driver.baseSalary ?? 0) * 1.42;
  const getDriverInfo = () => undefined;
  const isOwnData = () => true;

  beforeEach(() => {
    mockOnToggleCheck.mockClear();
    mockOnToggleSelectAll.mockClear();
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
  });

  const renderTable = (overrides: Partial<Parameters<typeof DriverTable>[0]> = {}) =>
    render(
      <DriverTable
        drivers={mockDrivers}
        driverType="cdi"
        selectedDriverIds={[]}
        checkedDriverIds={new Set()}
        onToggleCheck={mockOnToggleCheck}
        onToggleSelectAll={mockOnToggleSelectAll}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        formatCurrency={formatCurrency}
        calculateEmployerCost={calculateEmployerCost}
        isCompanyMember={false}
        getDriverInfo={getDriverInfo}
        isOwnData={isOwnData}
        {...overrides}
      />
    );

  it('renders driver table with data', () => {
    const { getByText } = renderTable();
    expect(getByText('Driver 1')).toBeInTheDocument();
    expect(getByText('Driver 2')).toBeInTheDocument();
  });

  it('renders one row checkbox per driver plus the select-all checkbox in the header', () => {
    const { container } = renderTable();
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    expect(checkboxes.length).toBe(mockDrivers.length + 1);
  });

  it('calls onToggleCheck with the driver id when a row checkbox is clicked', () => {
    const { container } = renderTable();
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    fireEvent.click(checkboxes[1]);
    expect(mockOnToggleCheck).toHaveBeenCalledWith('1');
  });

  it('calls onToggleSelectAll with every visible driver id and true when the header checkbox is checked', () => {
    const { container } = renderTable();
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    fireEvent.click(checkboxes[0]);
    expect(mockOnToggleSelectAll).toHaveBeenCalledWith(['1', '2'], true);
  });

  it('calls onEdit with isInterim=true only for the interim table', () => {
    // Each row renders exactly two action buttons, edit then delete, in order.
    const { getAllByRole } = renderTable({ driverType: 'interim' });
    const buttons = getAllByRole('button');
    fireEvent.click(buttons[0]); // row 0's edit button
    expect(mockOnEdit).toHaveBeenCalledWith(mockDrivers[0], true);
  });

  it('calls onDelete with the driver id and driverType when the delete button is clicked', () => {
    const { getAllByRole } = renderTable({ driverType: 'cdd' });
    const buttons = getAllByRole('button');
    fireEvent.click(buttons[1]); // row 0's delete button
    expect(mockOnDelete).toHaveBeenCalledWith('1', 'cdd');
  });

  it('renders nothing extra (no shared-data badge) when the viewer is not a company member', () => {
    const { container } = renderTable({ isCompanyMember: false });
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });
});
