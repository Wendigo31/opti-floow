import { vi } from 'vitest';

export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn((table: string) => {
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  const mockFunctions = {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }));

  return {
    from: mockFrom,
    functions: mockFunctions,
    channel: mockChannel,
    removeChannel: vi.fn(),
  };
};

export const mockSupabaseResponse = <T>(data: T, error: Error | null = null) => ({
  data,
  error,
});
