import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDriverCRUD } from '@/hooks/drivers/useDriverCRUD';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table) => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null, data: [{ id: 'uuid' }] }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

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
