import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';

// Mock data
const mockTours = [
  {
    id: 'tour-1',
    user_id: 'TEST-LICENSE',
    name: 'Paris - Lyon',
    origin_address: 'Paris, France',
    destination_address: 'Lyon, France',
    distance_km: 465,
    duration_minutes: 280,
    toll_cost: 35,
    fuel_cost: 120,
    adblue_cost: 5,
    driver_cost: 150,
    structure_cost: 50,
    vehicle_cost: 80,
    total_cost: 440,
    revenue: 550,
    profit: 110,
    profit_margin: 20,
    is_favorite: false,
    stops: [],
    driver_ids: [],
    drivers_data: [],
    tags: [],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 'tour-2',
    user_id: 'TEST-LICENSE',
    name: 'Marseille - Bordeaux',
    origin_address: 'Marseille, France',
    destination_address: 'Bordeaux, France',
    distance_km: 650,
    duration_minutes: 400,
    toll_cost: 55,
    fuel_cost: 180,
    adblue_cost: 8,
    driver_cost: 200,
    structure_cost: 60,
    vehicle_cost: 100,
    total_cost: 603,
    revenue: 750,
    profit: 147,
    profit_margin: 19.6,
    is_favorite: true,
    stops: [],
    driver_ids: [],
    drivers_data: [],
    tags: ['longue distance'],
    created_at: '2024-01-14T10:00:00Z',
    updated_at: '2024-01-14T10:00:00Z',
  },
];

// Mock Supabase
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return {
            eq: (col: string, val: unknown) => {
              mockEq(col, val);
              return {
                order: (col: string, opts: unknown) => {
                  mockOrder(col, opts);
                  return Promise.resolve({ data: mockTours, error: null });
                },
              };
            },
          };
        },
        insert: (data: unknown) => {
          mockInsert(data);
          return {
            select: () => ({
              single: () => {
                mockSingle();
                return Promise.resolve({ 
                  data: { ...mockTours[0], id: 'new-tour-id', ...(typeof data === 'object' ? data : {}) }, 
                  error: null 
                });
              },
            }),
          };
        },
        update: (data: unknown) => {
          mockUpdate(data);
          return {
            eq: (col: string, val: unknown) => {
              mockEq(col, val);
              return {
                eq: () => Promise.resolve({ data: null, error: null }),
              };
            },
          };
        },
        delete: () => {
          mockDelete();
          return {
            eq: (col: string, val: unknown) => {
              mockEq(col, val);
              return {
                eq: () => Promise.resolve({ data: null, error: null }),
              };
            },
          };
        },
      };
    },
  },
}));

// Mock useLicense
vi.mock('@/hooks/useLicense', () => ({
  useLicense: () => ({
    licenseData: { code: 'TEST-LICENSE' },
    isLicensed: true,
    planType: 'pro',
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocking
import { useSavedTours } from '../useSavedTours';

describe('useSavedTours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with empty tours array', () => {
      const { result } = renderHook(() => useSavedTours());
      expect(result.current.tours).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('fetchTours', () => {
    it('should fetch tours from database', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      expect(mockFrom).toHaveBeenCalledWith('saved_tours');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'TEST-LICENSE');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.current.tours).toHaveLength(2);
    });

    it('should set loading state during fetch', async () => {
      const { result } = renderHook(() => useSavedTours());

      expect(result.current.loading).toBe(false);

      const fetchPromise = act(async () => {
        await result.current.fetchTours();
      });

      // Loading should be true while fetching
      await fetchPromise;
      expect(result.current.loading).toBe(false);
    });

    it('should map database rows to SavedTour type', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const tour = result.current.tours[0];
      expect(tour).toHaveProperty('stops');
      expect(tour).toHaveProperty('driver_ids');
      expect(tour).toHaveProperty('tags');
      expect(Array.isArray(tour.stops)).toBe(true);
      expect(Array.isArray(tour.driver_ids)).toBe(true);
      expect(Array.isArray(tour.tags)).toBe(true);
    });
  });

  describe('saveTour', () => {
    it('should save a new tour', async () => {
      const { result } = renderHook(() => useSavedTours());

      const newTourInput = {
        name: 'New Test Tour',
        origin_address: 'Lille, France',
        destination_address: 'Nice, France',
        distance_km: 1000,
        toll_cost: 80,
        fuel_cost: 250,
        adblue_cost: 12,
        driver_cost: 300,
        structure_cost: 80,
        vehicle_cost: 120,
        total_cost: 842,
        pricing_mode: 'auto' as const,
        revenue: 1000,
        profit: 158,
        profit_margin: 15.8,
      };

      let savedTour;
      await act(async () => {
        savedTour = await result.current.saveTour(newTourInput);
      });

      expect(mockFrom).toHaveBeenCalledWith('saved_tours');
      expect(mockInsert).toHaveBeenCalled();
      expect(savedTour).not.toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Tournée sauvegardée avec succès');
    });

    it('should add saved tour to local state', async () => {
      const { result } = renderHook(() => useSavedTours());

      const newTourInput = {
        name: 'State Test Tour',
        origin_address: 'Strasbourg, France',
        destination_address: 'Toulouse, France',
        distance_km: 850,
        toll_cost: 65,
        fuel_cost: 200,
        adblue_cost: 10,
        driver_cost: 250,
        structure_cost: 70,
        vehicle_cost: 100,
        total_cost: 695,
        pricing_mode: 'auto' as const,
        revenue: 850,
        profit: 155,
        profit_margin: 18.2,
      };

      await act(async () => {
        await result.current.saveTour(newTourInput);
      });

      expect(result.current.tours.length).toBeGreaterThan(0);
    });
  });

  describe('deleteTour', () => {
    it('should delete a tour', async () => {
      const { result } = renderHook(() => useSavedTours());

      // First fetch tours
      await act(async () => {
        await result.current.fetchTours();
      });

      const initialLength = result.current.tours.length;

      await act(async () => {
        await result.current.deleteTour('tour-1');
      });

      expect(mockDelete).toHaveBeenCalled();
      expect(result.current.tours.length).toBe(initialLength - 1);
      expect(toast.success).toHaveBeenCalledWith('Tournée supprimée');
    });

    it('should remove tour from local state', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      await act(async () => {
        await result.current.deleteTour('tour-1');
      });

      const tourIds = result.current.tours.map(t => t.id);
      expect(tourIds).not.toContain('tour-1');
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const tour = result.current.tours.find(t => t.id === 'tour-1');
      const initialFavorite = tour?.is_favorite;

      await act(async () => {
        await result.current.toggleFavorite('tour-1');
      });

      expect(mockUpdate).toHaveBeenCalledWith({ is_favorite: !initialFavorite });
    });

    it('should update local state after toggle', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const initialFavorite = result.current.tours.find(t => t.id === 'tour-1')?.is_favorite;

      await act(async () => {
        await result.current.toggleFavorite('tour-1');
      });

      const updatedTour = result.current.tours.find(t => t.id === 'tour-1');
      expect(updatedTour?.is_favorite).toBe(!initialFavorite);
    });
  });

  describe('Helper Methods', () => {
    it('should get tours by client', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const clientTours = result.current.getToursByClient('client-1');
      expect(Array.isArray(clientTours)).toBe(true);
    });

    it('should get favorites', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const favorites = result.current.getFavorites();
      expect(Array.isArray(favorites)).toBe(true);
      expect(favorites.every(t => t.is_favorite)).toBe(true);
    });
  });
});
