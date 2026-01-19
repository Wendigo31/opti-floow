import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the supabase client before importing the hook
const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mockInvoke,
    },
  },
}));

// Import after mocking
import { useLicense, PlanType } from '../useLicense';

// Helper to wait for async operations
const waitForNextUpdate = () => new Promise(resolve => setTimeout(resolve, 0));

describe('useLicense', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useLicense());
      expect(result.current.isLoading).toBe(true);
    });

    it('should default to unlicensed when no stored license', async () => {
      const { result } = renderHook(() => useLicense());
      
      await act(async () => {
        await waitForNextUpdate();
      });
      
      expect(result.current.isLicensed).toBe(false);
      expect(result.current.licenseData).toBeNull();
    });

    it('should default to start plan type', async () => {
      const { result } = renderHook(() => useLicense());
      
      await act(async () => {
        await waitForNextUpdate();
      });
      
      expect(result.current.planType).toBe('start');
    });
  });

  describe('License Validation', () => {
    it('should validate license successfully', async () => {
      const mockLicenseData = {
        code: 'TEST-LICENSE-001',
        email: 'test@example.com',
        activatedAt: new Date().toISOString(),
        planType: 'pro' as PlanType,
      };

      mockInvoke.mockResolvedValueOnce({
        data: {
          success: true,
          licenseData: mockLicenseData,
          features: null,
        },
        error: null,
      });

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      let validationResult: { success: boolean; error?: string };
      await act(async () => {
        validationResult = await result.current.validateLicense('TEST-LICENSE-001', 'test@example.com');
      });

      expect(validationResult!.success).toBe(true);
      expect(result.current.isLicensed).toBe(true);
      expect(result.current.licenseData?.code).toBe('TEST-LICENSE-001');
    });

    it('should handle validation failure', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Invalid license code',
        },
        error: null,
      });

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      let validationResult: { success: boolean; error?: string };
      await act(async () => {
        validationResult = await result.current.validateLicense('INVALID-CODE', 'test@example.com');
      });

      expect(validationResult!.success).toBe(false);
      expect(validationResult!.error).toBe('Invalid license code');
      expect(result.current.isLicensed).toBe(false);
    });

    it('should handle network errors', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error('Network error'),
      });

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      let validationResult: { success: boolean; error?: string };
      await act(async () => {
        validationResult = await result.current.validateLicense('TEST-CODE', 'test@example.com');
      });

      expect(validationResult!.success).toBe(false);
      expect(validationResult!.error).toBe('Erreur de connexion au serveur');
    });
  });

  describe('Feature Checks', () => {
    it('should check features for start plan', async () => {
      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      // Start plan should have basic features
      expect(result.current.hasFeature('basic_calculator')).toBe(true);
      expect(result.current.hasFeature('itinerary_planning')).toBe(true);
      expect(result.current.hasFeature('saved_tours')).toBe(true);
      
      // Start plan should NOT have pro/enterprise features
      expect(result.current.hasFeature('ai_optimization')).toBe(false);
      expect(result.current.hasFeature('forecast')).toBe(false);
    });

    it('should check features for pro plan', async () => {
      const mockLicenseData = {
        code: 'PRO-LICENSE',
        email: 'pro@example.com',
        activatedAt: new Date().toISOString(),
        planType: 'pro' as PlanType,
      };

      mockInvoke.mockResolvedValueOnce({
        data: { success: true, licenseData: mockLicenseData, features: null },
        error: null,
      });

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      await act(async () => {
        await result.current.validateLicense('PRO-LICENSE', 'pro@example.com');
      });

      expect(result.current.planType).toBe('pro');
      expect(result.current.hasFeature('forecast')).toBe(true);
      expect(result.current.hasFeature('trip_history')).toBe(true);
      expect(result.current.hasFeature('pdf_export_pro')).toBe(true);
      
      // Pro should NOT have enterprise features
      expect(result.current.hasFeature('ai_optimization')).toBe(false);
    });

    it('should check features for enterprise plan', async () => {
      const mockLicenseData = {
        code: 'ENTERPRISE-LICENSE',
        email: 'enterprise@example.com',
        activatedAt: new Date().toISOString(),
        planType: 'enterprise' as PlanType,
      };

      mockInvoke.mockResolvedValueOnce({
        data: { success: true, licenseData: mockLicenseData, features: null },
        error: null,
      });

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      await act(async () => {
        await result.current.validateLicense('ENTERPRISE-LICENSE', 'enterprise@example.com');
      });

      expect(result.current.planType).toBe('enterprise');
      expect(result.current.hasFeature('ai_optimization')).toBe(true);
      expect(result.current.hasFeature('multi_agency')).toBe(true);
      expect(result.current.hasFeature('tms_erp_integration')).toBe(true);
    });
  });

  describe('License Persistence', () => {
    it('should persist license to localStorage', async () => {
      const mockLicenseData = {
        code: 'PERSIST-LICENSE',
        email: 'persist@example.com',
        activatedAt: new Date().toISOString(),
        planType: 'pro' as PlanType,
      };

      mockInvoke.mockResolvedValueOnce({
        data: { success: true, licenseData: mockLicenseData, features: null },
        error: null,
      });

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      await act(async () => {
        await result.current.validateLicense('PERSIST-LICENSE', 'persist@example.com');
      });

      const stored = localStorage.getItem('optiflow-license');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.code).toBe('PERSIST-LICENSE');
    });

    it('should clear license from localStorage', async () => {
      localStorage.setItem('optiflow-license', JSON.stringify({
        code: 'TO-CLEAR',
        email: 'clear@example.com',
        activatedAt: new Date().toISOString(),
        planType: 'pro',
      }));

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      act(() => {
        result.current.clearLicense();
      });

      expect(result.current.isLicensed).toBe(false);
      expect(result.current.licenseData).toBeNull();
      expect(localStorage.getItem('optiflow-license')).toBeNull();
    });
  });

  describe('Offline Support', () => {
    it('should report online status', async () => {
      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await waitForNextUpdate();
      });

      expect(result.current.isOffline).toBe(false);
    });
  });
});
