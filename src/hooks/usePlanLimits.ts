import { useCallback, useMemo } from 'react';
import { useLicense, PlanType, FeatureKey } from '@/hooks/useLicense';

// Default limits per plan - SYNCHRONIZED WITH PricingSection.tsx and shared.ts
const PLAN_LIMITS: Record<PlanType, {
  maxDrivers: number;
  maxClients: number;
  maxDailyCharges: number;
  maxMonthlyCharges: number;
  maxYearlyCharges: number;
  maxVehicles: number;
}> = {
  start: {
    maxDrivers: 5,
    maxClients: 10,
    maxDailyCharges: 20,
    maxMonthlyCharges: 20,
    maxYearlyCharges: 10,
    maxVehicles: 5,
  },
  pro: {
    maxDrivers: 15,
    maxClients: 30,
    maxDailyCharges: 50,
    maxMonthlyCharges: 50,
    maxYearlyCharges: 25,
    maxVehicles: 15,
  },
  enterprise: {
    maxDrivers: Infinity,
    maxClients: Infinity,
    maxDailyCharges: Infinity,
    maxMonthlyCharges: Infinity,
    maxYearlyCharges: Infinity,
    maxVehicles: Infinity,
  },
};

interface PlanLimits {
  maxDrivers: number;
  maxClients: number;
  maxDailyCharges: number;
  maxMonthlyCharges: number;
  maxYearlyCharges: number;
  maxVehicles: number;
}

export function usePlanLimits() {
  const { planType, hasFeature, licenseData } = useLicense();

  const defaultLimits = PLAN_LIMITS[planType];

  // Merge admin-defined custom limits with defaults
  // Admin limits override plan defaults
  const limits: PlanLimits = useMemo(() => ({
    maxDrivers: licenseData?.maxDrivers ?? defaultLimits.maxDrivers,
    maxClients: licenseData?.maxClients ?? defaultLimits.maxClients,
    maxDailyCharges: licenseData?.maxDailyCharges ?? defaultLimits.maxDailyCharges,
    maxMonthlyCharges: licenseData?.maxMonthlyCharges ?? defaultLimits.maxMonthlyCharges,
    maxYearlyCharges: licenseData?.maxYearlyCharges ?? defaultLimits.maxYearlyCharges,
    maxVehicles: defaultLimits.maxVehicles,
  }), [licenseData, defaultLimits]);

  const checkLimit = useCallback((type: keyof PlanLimits, currentCount: number): boolean => {
    return currentCount < limits[type];
  }, [limits]);

  const getRemainingCount = useCallback((type: keyof PlanLimits, currentCount: number): number => {
    if (limits[type] === Infinity) return Infinity;
    return Math.max(0, limits[type] - currentCount);
  }, [limits]);

  const isUnlimited = useCallback((type: keyof PlanLimits): boolean => {
    return limits[type] === Infinity;
  }, [limits]);

  return {
    limits,
    planType,
    hasFeature,
    checkLimit,
    getRemainingCount,
    isUnlimited,
    defaultLimits: PLAN_LIMITS[planType],
    isStart: planType === 'start',
    isPro: planType === 'pro',
    isEnterprise: planType === 'enterprise',
  };
}

export { PLAN_LIMITS };
export type { PlanLimits };
