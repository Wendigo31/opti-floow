import { useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useLocalStorage } from './useLocalStorage';
import { DEMO_SESSIONS, getDemoSession, type DemoSession } from '@/data/demoData';
import type { LocalClient, LocalClientReport, LocalTrip } from '@/types/local';
import type { Vehicle } from '@/types/vehicle';
import type { Trailer } from '@/types/trailer';
import type { SavedTour } from '@/types/savedTour';
import { toast } from 'sonner';

interface DemoModeState {
  isActive: boolean;
  currentSession: string | null;
  activatedAt: string | null;
}

interface DemoBackup {
  drivers: any[];
  charges: any[];
  vehicle: any;
  trip: any;
  settings: any;
  clients: LocalClient[];
  reports: LocalClientReport[];
  trips: LocalTrip[];
  selectedDriverIds: string[];
  vehicles: Vehicle[];
  trailers: Trailer[];
  savedTours: SavedTour[];
}

// Consolidated demo data storage
interface DemoLocalData {
  clients: LocalClient[];
  reports: LocalClientReport[];
  trips: LocalTrip[];
  vehicles: Vehicle[];
  trailers: Trailer[];
  savedTours: SavedTour[];
  backup: DemoBackup | null;
}

const defaultDemoLocalData: DemoLocalData = {
  clients: [],
  reports: [],
  trips: [],
  vehicles: [],
  trailers: [],
  savedTours: [],
  backup: null,
};

export function useDemoMode() {
  const { 
    setDrivers, 
    setCharges, 
    setVehicle, 
    setTrip, 
    setSettings,
    setSelectedDriverIds,
  } = useApp();

  const [demoState, setDemoState] = useLocalStorage<DemoModeState>('optiflow_demo_mode', {
    isActive: false,
    currentSession: null,
    activatedAt: null,
  });

  // Consolidated local storage for demo data
  const [demoLocalData, setDemoLocalData] = useLocalStorage<DemoLocalData>('optiflow_demo_data', defaultDemoLocalData);

  const activateDemo = useCallback((planType: 'start' | 'pro' | 'enterprise') => {
    const session = getDemoSession(planType);
    if (!session) {
      toast.error('Session de démo non trouvée');
      return false;
    }

    // Get current data from localStorage for backup
    const currentDrivers = JSON.parse(localStorage.getItem('optiflow_drivers') || '[]');
    const currentCharges = JSON.parse(localStorage.getItem('optiflow_charges') || '[]');
    const currentVehicle = JSON.parse(localStorage.getItem('optiflow_vehicle') || '{}');
    const currentTrip = JSON.parse(localStorage.getItem('optiflow_trip') || '{}');
    const currentSettings = JSON.parse(localStorage.getItem('optiflow_settings') || '{}');
    const currentSelectedDrivers = JSON.parse(localStorage.getItem('optiflow_selected_drivers') || '[]');
    const currentClients = JSON.parse(localStorage.getItem('optiflow_clients') || '[]');
    const currentReports = JSON.parse(localStorage.getItem('optiflow_client_reports') || '[]');
    const currentTrips = JSON.parse(localStorage.getItem('optiflow_trips') || '[]');
    const currentVehicles = JSON.parse(localStorage.getItem('optiflow_vehicles') || '[]');
    const currentTrailers = JSON.parse(localStorage.getItem('optiflow_trailers') || '[]');
    const currentSavedTours = JSON.parse(localStorage.getItem('optiflow_saved_tours') || '[]');

    // Backup current data and load demo data
    setDemoLocalData({
      clients: session.clients,
      reports: session.reports,
      trips: session.trips,
      vehicles: session.vehicles,
      trailers: session.trailers,
      savedTours: session.savedTours,
      backup: {
        drivers: currentDrivers,
        charges: currentCharges,
        vehicle: currentVehicle,
        trip: currentTrip,
        settings: currentSettings,
        clients: currentClients,
        reports: currentReports,
        trips: currentTrips,
        selectedDriverIds: currentSelectedDrivers,
        vehicles: currentVehicles,
        trailers: currentTrailers,
        savedTours: currentSavedTours,
      },
    });

    // Update all localStorage keys with demo data
    localStorage.setItem('optiflow_clients', JSON.stringify(session.clients));
    localStorage.setItem('optiflow_client_reports', JSON.stringify(session.reports));
    localStorage.setItem('optiflow_trips', JSON.stringify(session.trips));
    localStorage.setItem('optiflow_vehicles', JSON.stringify(session.vehicles));
    localStorage.setItem('optiflow_trailers', JSON.stringify(session.trailers));
    localStorage.setItem('optiflow_saved_tours', JSON.stringify(session.savedTours));

    // Load demo data via context
    setDrivers(session.drivers);
    setCharges(session.charges);
    setVehicle(session.vehicle);
    setTrip(session.trip);
    setSettings(session.settings);
    setSelectedDriverIds(session.selectedDriverIds);

    // Update demo state
    setDemoState({
      isActive: true,
      currentSession: session.id,
      activatedAt: new Date().toISOString(),
    });

    toast.success(`Mode démo "${session.name}" activé !`, {
      description: session.description,
    });

    // Force page reload to refresh all data
    setTimeout(() => {
      window.location.reload();
    }, 500);

    return true;
  }, [setDrivers, setCharges, setVehicle, setTrip, setSettings, setSelectedDriverIds, setDemoLocalData, setDemoState]);

  const deactivateDemo = useCallback(() => {
    if (!demoState.isActive) {
      toast.info('Le mode démo n\'est pas actif');
      return;
    }

    const backup = demoLocalData.backup;

    // Restore backup if available
    if (backup) {
      setDrivers(backup.drivers);
      setCharges(backup.charges);
      setVehicle(backup.vehicle);
      setTrip(backup.trip);
      setSettings(backup.settings);
      setSelectedDriverIds(backup.selectedDriverIds);
      
      // Restore individual localStorage keys
      localStorage.setItem('optiflow_clients', JSON.stringify(backup.clients));
      localStorage.setItem('optiflow_client_reports', JSON.stringify(backup.reports));
      localStorage.setItem('optiflow_trips', JSON.stringify(backup.trips));
      localStorage.setItem('optiflow_vehicles', JSON.stringify(backup.vehicles));
      localStorage.setItem('optiflow_trailers', JSON.stringify(backup.trailers));
      localStorage.setItem('optiflow_saved_tours', JSON.stringify(backup.savedTours));
    }

    // Clear demo local data
    setDemoLocalData(defaultDemoLocalData);

    // Clear demo state
    setDemoState({
      isActive: false,
      currentSession: null,
      activatedAt: null,
    });

    toast.success('Mode démo désactivé', {
      description: 'Vos données originales ont été restaurées',
    });

    // Force page reload to refresh all data
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, [demoState.isActive, demoLocalData.backup, setDrivers, setCharges, setVehicle, setTrip, setSettings, setSelectedDriverIds, setDemoLocalData, setDemoState]);

  const getCurrentSession = useCallback((): DemoSession | null => {
    if (!demoState.currentSession) return null;
    return DEMO_SESSIONS.find(s => s.id === demoState.currentSession) || null;
  }, [demoState.currentSession]);

  return useMemo(() => ({
    isActive: demoState.isActive,
    currentSessionId: demoState.currentSession,
    activatedAt: demoState.activatedAt,
    availableSessions: DEMO_SESSIONS,
    activateDemo,
    deactivateDemo,
    getCurrentSession,
  }), [demoState.isActive, demoState.currentSession, demoState.activatedAt, activateDemo, deactivateDemo, getCurrentSession]);
}
