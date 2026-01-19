import { useMemo } from 'react';
import type { Driver, FixedCharge, TripCalculation, VehicleParams, CostBreakdown, AppSettings } from '@/types';

// Convert TTC to HT
const toHT = (amount: number, tvaRate: number, isHT: boolean): number => {
  if (isHT) return amount;
  return amount / (1 + tvaRate / 100);
};

export function useCalculations(
  trip: TripCalculation,
  vehicle: VehicleParams,
  selectedDrivers: Driver[],
  charges: FixedCharge[],
  settings: AppSettings
): CostBreakdown {
  return useMemo(() => {
    const tvaRate = settings.tvaRate || 20;

    // Variable costs (convert to HT if needed)
    const fuelPriceHT = toHT(vehicle.fuelPriceHT, tvaRate, vehicle.fuelPriceIsHT);
    const adBluePriceHT = toHT(vehicle.adBluePriceHT, tvaRate, vehicle.adBluePriceIsHT);
    const tollsHT = toHT(trip.tollCost, tvaRate, trip.tollIsHT);

    const fuelCost = (trip.distance / 100) * vehicle.fuelConsumption * fuelPriceHT;
    const adBlueCost = (trip.distance / 100) * vehicle.adBlueConsumption * adBluePriceHT;

    // Driver costs - sum of all selected drivers
    let driverCost = 0;
    for (const driver of selectedDrivers) {
      const monthlyEmployerCost = driver.baseSalary * (1 + driver.patronalCharges / 100);
      const dailyRate = monthlyEmployerCost / driver.workingDaysPerMonth;
      driverCost += dailyRate;
    }

    // Structure costs (fixed charges spread over one trip) - convert to HT
    const dailyCharges = charges.reduce((total, charge) => {
      const amountHT = toHT(charge.amount, tvaRate, charge.isHT);
      let dailyAmount = 0;
      switch (charge.periodicity) {
        case 'yearly':
          dailyAmount = amountHT / settings.workingDaysPerYear;
          break;
        case 'monthly':
          dailyAmount = amountHT / settings.workingDaysPerMonth;
          break;
        case 'daily':
          dailyAmount = amountHT;
          break;
      }
      return total + dailyAmount;
    }, 0);
    const structureCost = dailyCharges;

    // Total calculations (all in HT)
    const totalCost = fuelCost + adBlueCost + tollsHT + driverCost + structureCost;
    const costPerKm = trip.distance > 0 ? totalCost / trip.distance : 0;

    // Suggested price based on target margin
    const marginMultiplier = 1 + (trip.targetMargin / 100);
    const suggestedPrice = totalCost * marginMultiplier;
    const suggestedPricePerKm = trip.distance > 0 ? suggestedPrice / trip.distance : 0;

    // Revenue calculation based on pricing mode
    let revenue = 0;
    if (trip.pricingMode === 'km') {
      revenue = trip.pricePerKm * trip.distance;
    } else if (trip.pricingMode === 'fixed') {
      revenue = trip.fixedPrice;
    } else if (trip.pricingMode === 'hourly') {
      // Hourly pricing mode
      revenue = (trip.hourlyRate || 0) * (trip.estimatedHours || 0);
    } else if (trip.pricingMode === 'km_stops') {
      // Km + stops pricing mode
      revenue = (trip.pricePerKm * trip.distance) + ((trip.pricePerStop || 0) * (trip.numberOfStops || 0));
    } else {
      // Auto mode: use suggested price
      revenue = suggestedPrice;
    }

    // Profit calculation
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      fuel: fuelCost,
      adBlue: adBlueCost,
      tolls: tollsHT,
      driverCost,
      structureCost,
      totalCost,
      costPerKm,
      suggestedPrice,
      suggestedPricePerKm,
      revenue,
      profit,
      profitMargin,
    };
  }, [trip, vehicle, selectedDrivers, charges, settings]);
}
