import { useCallback, useMemo } from 'react';
import { useLicense, PlanType } from '@/hooks/useLicense';

// Single all-inclusive plan: unlimited by default.
// Admin-defined per-license limits (licenses.max_*) still override these.
const PLAN_LIMITS: Record<PlanType, {
  maxDrivers: number;
  maxClients: number;
  maxDailyCharges: number;
  maxMonthlyCharges: number;
  maxYearlyCharges: number;
  maxVehicles: number;
}> = {
  optiflow: {
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

  const defaultLimits = PLAN_LIMITS.optiflow;

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
    defaultLimits,
  };
}

export { PLAN_LIMITS };
export type { PlanLimits };
