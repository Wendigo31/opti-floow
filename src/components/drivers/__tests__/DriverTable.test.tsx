import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DriverTable } from '@/components/drivers/DriverTable';
import type { Driver } from '@/types';

describe('DriverTable', () => {
  const mockDrivers: Driver[] = [
    { id: '1', name: 'Driver 1', baseSalary: 2200, hourlyRate: 12.5 } as Driver,
    { id: '2', name: 'Driver 2', baseSalary: 2300, hourlyRate: 13 } as Driver,
  ];

  const mockHandlers = {
    onToggleSelect: vi.fn(),
    onSelectAll: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
  };

  it('renders driver table with data', () => {
    const { getByText } = render(
      <DriverTable
        drivers={mockDrivers}
        selectedIds={new Set()}
        {...mockHandlers}
      />
    );

    expect(getByText('Driver 1')).toBeInTheDocument();
    expect(getByText('Driver 2')).toBeInTheDocument();
  });

  it('handles row selection', () => {
    const { container } = render(
      <DriverTable
        drivers={mockDrivers}
        selectedIds={new Set()}
        {...mockHandlers}
      />
    );

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('renders action buttons', () => {
    const { container } = render(
      <DriverTable
        drivers={mockDrivers}
        selectedIds={new Set()}
        {...mockHandlers}
      />
    );

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
