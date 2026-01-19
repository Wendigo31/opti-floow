import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Driver, FixedCharge, TripCalculation, VehicleParams, AppSettings, AppProfile } from '@/types';

interface AppContextType {
  // Drivers
  drivers: Driver[];
  setDrivers: (drivers: Driver[] | ((prev: Driver[]) => Driver[])) => void;
  selectedDriverIds: string[];
  setSelectedDriverIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  
  // Fixed Charges
  charges: FixedCharge[];
  setCharges: (charges: FixedCharge[] | ((prev: FixedCharge[]) => FixedCharge[])) => void;
  
  // Vehicle
  vehicle: VehicleParams;
  setVehicle: (vehicle: VehicleParams | ((prev: VehicleParams) => VehicleParams)) => void;
  
  // Trip
  trip: TripCalculation;
  setTrip: (trip: TripCalculation | ((prev: TripCalculation) => TripCalculation)) => void;
  
  // Settings
  settings: AppSettings;
  setSettings: (settings: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  
  // Profile management
  exportProfile: () => string;
  importProfile: (encryptedData: string) => boolean;
}

// Empty defaults for new users - no pre-filled data
const defaultVehicle: VehicleParams = {
  fuelConsumption: 32,
  fuelPriceHT: 1.45,
  fuelPriceIsHT: true,
  adBlueConsumption: 1.5,
  adBluePriceHT: 0.50,
  adBluePriceIsHT: true,
};

const defaultTrip: TripCalculation = {
  distance: 0,
  tollCost: 0,
  tollIsHT: false,
  tollClass: 2,
  pricingMode: 'fixed',
  pricePerKm: 1.70,
  fixedPrice: 0,
  targetMargin: 20,
  hourlyRate: 85,
  estimatedHours: 8,
  pricePerStop: 25,
  numberOfStops: 0,
};

const defaultSettings: AppSettings = {
  workingDaysPerMonth: 21,
  workingDaysPerYear: 252,
  tomtomApiKey: '',
  companyName: '',
  tvaRate: 20,
  defaultDownloadPath: '',
};

// Empty arrays for new users
const defaultDrivers: Driver[] = [];
const defaultCharges: FixedCharge[] = [];

// Simple encryption/decryption for profile export
const ENCRYPTION_KEY = 'OptiFlow_LineOptimizer_2024';

function encrypt(data: string): string {
  const encoded = btoa(unescape(encodeURIComponent(data)));
  let result = '';
  for (let i = 0; i < encoded.length; i++) {
    const charCode = encoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result);
}

function decrypt(data: string): string {
  try {
    const decoded = atob(data);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return decodeURIComponent(escape(atob(result)));
  } catch {
    throw new Error('Invalid profile data');
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [drivers, setDrivers] = useLocalStorage<Driver[]>('optiflow_drivers', defaultDrivers);
  const [selectedDriverIds, setSelectedDriverIds] = useLocalStorage<string[]>('optiflow_selected_drivers', []);
  const [charges, setCharges] = useLocalStorage<FixedCharge[]>('optiflow_charges', defaultCharges);
  const [vehicle, setVehicle] = useLocalStorage<VehicleParams>('optiflow_vehicle', defaultVehicle);
  const [trip, setTrip] = useLocalStorage<TripCalculation>('optiflow_trip', defaultTrip);
  const [settings, setSettings] = useLocalStorage<AppSettings>('optiflow_settings', defaultSettings);

  // Auto-calculate annual working days when monthly changes
  useEffect(() => {
    const calculatedAnnual = settings.workingDaysPerMonth * 12;
    if (settings.workingDaysPerYear !== calculatedAnnual) {
      setSettings(prev => ({ ...prev, workingDaysPerYear: calculatedAnnual }));
    }
  }, [settings.workingDaysPerMonth]);

  const exportProfile = (): string => {
    const profile: AppProfile = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      drivers,
      charges,
      vehicle,
      trip,
      settings,
      selectedDriverIds,
    };
    return encrypt(JSON.stringify(profile));
  };

  const importProfile = (encryptedData: string): boolean => {
    try {
      const decrypted = decrypt(encryptedData);
      const profile: AppProfile = JSON.parse(decrypted);
      
      if (profile.version && profile.drivers && profile.charges) {
        setDrivers(profile.drivers);
        setCharges(profile.charges);
        setVehicle(profile.vehicle);
        setTrip(profile.trip);
        setSettings(profile.settings);
        setSelectedDriverIds(profile.selectedDriverIds);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider value={{
      drivers,
      setDrivers,
      selectedDriverIds,
      setSelectedDriverIds,
      charges,
      setCharges,
      vehicle,
      setVehicle,
      trip,
      setTrip,
      settings,
      setSettings,
      exportProfile,
      importProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
