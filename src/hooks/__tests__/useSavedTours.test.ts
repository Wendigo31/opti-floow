import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { toast } from 'sonner';

// Hoisted mock state so it is available inside the hoisted vi.mock factories.
const h = vi.hoisted(() => {
  const mockTours = [
    {
      id: 'tour-1',
      user_id: 'TEST-LICENSE',
      client_id: 'client-1',
      name: 'Paris - Lyon',
      origin_address: 'Paris, France',
      destination_address: 'Lyon, France',
      distance_km: 465,
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
      client_id: null,
      name: 'Marseille - Bordeaux',
      origin_address: 'Marseille, France',
      destination_address: 'Bordeaux, France',
      distance_km: 650,
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

  // --- fetch chain: from().select('*').eq('user_id', uid).order(...) ---
  const orderMock = vi.fn(() => Promise.resolve({ data: mockTours, error: null }));
  const eqSelectMock = vi.fn(() => ({ order: orderMock }));
  const orSelectMock = vi.fn(() => ({ order: orderMock }));
  const selectMock = vi.fn(() => ({ eq: eqSelectMock, or: orSelectMock }));

  // --- insert chain: from().insert(data).select().single() ---
  const singleMock = vi.fn(() =>
    Promise.resolve({
      data: { ...mockTours[0], id: 'new-tour-id', is_favorite: false },
      error: null,
    }),
  );
  const insertSelectMock = vi.fn(() => ({ single: singleMock }));
  const insertMock = vi.fn(() => ({ select: insertSelectMock }));

  // --- delete chain: from().delete().eq('id', id) ---
  const deleteEqMock = vi.fn(() => Promise.resolve({ error: null }));
  const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));

  // --- update chain: from().update({...}).eq('id', id) ---
  const updateEqMock = vi.fn(() => Promise.resolve({ error: null }));
  const updateMock = vi.fn(() => ({ eq: updateEqMock }));

  const fromMock = vi.fn(() => ({
    select: selectMock,
    insert: insertMock,
    delete: deleteMock,
    update: updateMock,
  }));

  const channelMock = vi.fn(() => {
    const chan: Record<string, unknown> = {};
    chan.on = vi.fn(() => chan);
    chan.subscribe = vi.fn(() => chan);
    return chan;
  });

  return {
    mockTours,
    fromMock,
    selectMock,
    orderMock,
    insertMock,
    deleteMock,
    updateMock,
    updateEqMock,
    channelMock,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: h.fromMock,
    channel: h.channelMock,
    removeChannel: vi.fn(),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: 'TEST-LICENSE' } }, error: null }),
      ),
    },
  },
}));

// License context: authUserId set, licenseId null so the mount auto-fetch effect
// (which requires both) does not fire and manual calls stay deterministic.
vi.mock('@/context/LicenseContext', () => ({
  useLicenseContext: () => ({
    licenseId: null,
    authUserId: 'TEST-LICENSE',
    isLoading: false,
  }),
  getLicenseId: vi.fn(() => Promise.resolve('TEST-LICENSE')),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

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

      expect(h.fromMock).toHaveBeenCalledWith('saved_tours');
      expect(h.selectMock).toHaveBeenCalledWith('*');
      expect(h.orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.current.tours).toHaveLength(2);
    });

    it('should map database rows to SavedTour type', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const tour = result.current.tours[0];
      expect(Array.isArray(tour.stops)).toBe(true);
      expect(Array.isArray(tour.driver_ids)).toBe(true);
      expect(Array.isArray(tour.tags)).toBe(true);
    });
  });

  describe('saveTour', () => {
    it('should save a new tour', async () => {
      const { result } = renderHook(() => useSavedTours());

      let savedTour;
      await act(async () => {
        savedTour = await result.current.saveTour({
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
        });
      });

      expect(h.fromMock).toHaveBeenCalledWith('saved_tours');
      expect(h.insertMock).toHaveBeenCalled();
      expect(savedTour).not.toBeNull();
      expect(toast.success).toHaveBeenCalledWith('Tournée sauvegardée avec succès');
      expect(result.current.tours.length).toBeGreaterThan(0);
    });
  });

  describe('deleteTour', () => {
    it('should delete a tour and remove it from local state', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const initialLength = result.current.tours.length;

      await act(async () => {
        await result.current.deleteTour('tour-1');
      });

      expect(h.deleteMock).toHaveBeenCalled();
      expect(result.current.tours.length).toBe(initialLength - 1);
      expect(result.current.tours.map((t) => t.id)).not.toContain('tour-1');
      expect(toast.success).toHaveBeenCalledWith('Tournée supprimée');
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle favorite status and update local state', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const initialFavorite = result.current.tours.find((t) => t.id === 'tour-1')?.is_favorite;

      await act(async () => {
        await result.current.toggleFavorite('tour-1');
      });

      expect(h.updateMock).toHaveBeenCalledWith({ is_favorite: !initialFavorite });
      const updatedTour = result.current.tours.find((t) => t.id === 'tour-1');
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
      expect(clientTours.every((t) => t.client_id === 'client-1')).toBe(true);
    });

    it('should get favorites', async () => {
      const { result } = renderHook(() => useSavedTours());

      await act(async () => {
        await result.current.fetchTours();
      });

      const favorites = result.current.getFavorites();
      expect(Array.isArray(favorites)).toBe(true);
      expect(favorites.every((t) => t.is_favorite)).toBe(true);
    });
  });
});
