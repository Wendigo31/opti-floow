import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDriverCRUD } from '@/hooks/drivers/useDriverCRUD';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => {
  const resolved = (data: unknown = null) => Promise.resolve({ data, error: null });
  return {
    supabase: {
      from: vi.fn(() => ({
        // createDriver: from().upsert([...], { onConflict })
        upsert: vi.fn(() => resolved()),
        // createBatch: from().insert(rows).select('id')
        insert: vi.fn(() => ({
          select: vi.fn(() => resolved([{ id: 'uuid' }])),
        })),
        // updateDriver: from().update({...}).eq(...).eq(...)
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: vi.fn(() => resolved()) })),
        })),
        // deleteDriver: from().delete().eq(...).eq(...)
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ eq: vi.fn(() => resolved()) })),
        })),
      })),
      rpc: vi.fn(() => resolved()),
    },
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useDriverCRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a driver successfully', async () => {
    const { result } = renderHook(() => useDriverCRUD());
    const mockDriver = {
      id: '1',
      name: 'Test Driver',
      baseSalary: 2200,
      hourlyRate: 12.50,
    };

    let success = false;
    await act(async () => {
      success = await result.current.createDriver(
        mockDriver as any,
        'cdi',
        'user-id',
        'license-id'
      );
    });

    expect(success).toBe(true);
  });

  it('should handle batch creation', async () => {
    const { result } = renderHook(() => useDriverCRUD());
    const drivers = [
      { driver: { id: '1', name: 'Driver 1' }, type: 'cdi' as const },
      { driver: { id: '2', name: 'Driver 2' }, type: 'cdi' as const },
    ];

    let total = 0;
    await act(async () => {
      total = await result.current.createBatch(drivers as any, 'user-id', 'license-id');
    });

    expect(total).toBeGreaterThanOrEqual(0);
  });

  it('should delete a driver', async () => {
    const { result } = renderHook(() => useDriverCRUD());

    let success = false;
    await act(async () => {
      success = await result.current.deleteDriver('driver-id', 'user-id', 'license-id');
    });

    expect(success).toBe(true);
  });
});
