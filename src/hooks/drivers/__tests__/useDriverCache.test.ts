import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDriverCache } from '@/hooks/drivers/useDriverCache';
import { renderHook, act } from '@testing-library/react';

describe('useDriverCache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should load cached drivers from localStorage on init', () => {
    const mockDriver = {
      id: '1',
      name: 'Test Driver',
      baseSalary: 2200,
      hourlyRate: 12.50,
    };

    localStorage.setItem(
      'optiflow_drivers_cache',
      JSON.stringify([mockDriver])
    );

    const { result } = renderHook(() => useDriverCache());
    expect(result.current.cache.cdi).toContainEqual(mockDriver);
  });

  it('should persist drivers to localStorage', () => {
    const { result } = renderHook(() => useDriverCache());
    const mockDriver = { id: '1', name: 'Test' };

    act(() => {
      result.current.persist([mockDriver as any], [], []);
    });

    const cached = JSON.parse(localStorage.getItem('optiflow_drivers_cache') || '[]');
    expect(cached).toContainEqual(mockDriver);
  });

  it('should clear cache', () => {
    localStorage.setItem('optiflow_drivers_cache', JSON.stringify([{ id: '1' }]));

    const { result } = renderHook(() => useDriverCache());

    act(() => {
      result.current.clear();
    });

    expect(localStorage.getItem('optiflow_drivers_cache')).toBeNull();
    expect(result.current.cache.cdi).toEqual([]);
  });
});
