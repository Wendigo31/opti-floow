 /**
  * CloudDataContext - Système de synchronisation cloud temps réel global
  * Fonctionne comme Google Sheets: tout le monde voit les changements en direct
  */
 import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
 import { useCloudVehicles } from '@/hooks/useCloudVehicles';
 import { useCloudTrailers } from '@/hooks/useCloudTrailers';
 import { useCloudDrivers } from '@/hooks/useCloudDrivers';
 import { useCloudCharges } from '@/hooks/useCloudCharges';
 import { useClients } from '@/hooks/useClients';
 import { useSavedTours } from '@/hooks/useSavedTours';
 import { useTrips } from '@/hooks/useTrips';
 import { useQuotes } from '@/hooks/useQuotes';
 import { useLicenseContext } from '@/context/LicenseContext';
 import { supabase } from '@/integrations/supabase/client';
 import type { Vehicle } from '@/types/vehicle';
 import type { Trailer } from '@/types/trailer';
 import type { Driver, FixedCharge } from '@/types';
 import type { ClientWithCreator } from '@/hooks/useClients';
 import type { SavedTour, SaveTourInput } from '@/types/savedTour';
 
 // Activity indicator for "who is doing what"
 export interface UserActivity {
   userId: string;
   displayName: string;
   action: string;
   entityType: string;
   entityName?: string;
   timestamp: Date;
 }
 
 interface CloudDataContextValue {
   // Vehicles
   vehicles: Vehicle[];
   vehiclesLoading: boolean;
   createVehicle: (vehicle: Vehicle) => Promise<boolean>;
   updateVehicle: (vehicle: Vehicle) => Promise<boolean>;
   deleteVehicle: (id: string) => Promise<boolean>;
 
   // Trailers
   trailers: Trailer[];
   trailersLoading: boolean;
   createTrailer: (trailer: Trailer) => Promise<boolean>;
   updateTrailer: (trailer: Trailer) => Promise<boolean>;
   deleteTrailer: (id: string) => Promise<boolean>;
 
   // Drivers
   cdiDrivers: Driver[];
   interimDrivers: Driver[];
   driversLoading: boolean;
  createDriver: (driver: Driver, driverType?: 'cdi' | 'cdd' | 'interim') => Promise<boolean>;
  updateDriver: (driver: Driver, driverType?: 'cdi' | 'cdd' | 'interim') => Promise<boolean>;
  deleteDriver: (id: string, driverType?: 'cdi' | 'cdd' | 'interim') => Promise<boolean>;
 
   // Charges
   charges: FixedCharge[];
   chargesLoading: boolean;
   createCharge: (charge: FixedCharge) => Promise<boolean>;
   updateCharge: (charge: FixedCharge) => Promise<boolean>;
   deleteCharge: (id: string) => Promise<boolean>;
 
   // Clients
   clients: ClientWithCreator[];
   clientsLoading: boolean;
   createClient: (input: Omit<ClientWithCreator, 'id' | 'created_at' | 'updated_at'>) => Promise<ClientWithCreator | null>;
   updateClient: (id: string, updates: Partial<ClientWithCreator>) => Promise<boolean>;
   deleteClient: (id: string) => Promise<boolean>;
 
   // Tours
   tours: SavedTour[];
   toursLoading: boolean;
   saveTour: (input: SaveTourInput) => Promise<SavedTour | null>;
   updateTour: (id: string, updates: Partial<SaveTourInput>) => Promise<boolean>;
   deleteTour: (id: string) => Promise<boolean>;
 
   // Trips
   trips: any[];
   tripsLoading: boolean;
   createTrip: (trip: any) => Promise<any>;
   updateTrip: (id: string, updates: any) => Promise<boolean>;
   deleteTrip: (id: string) => Promise<boolean>;
 
   // Quotes
   quotes: any[];
   quotesLoading: boolean;
   createQuote: (quote: any) => Promise<any>;
   updateQuote: (id: string, updates: any) => Promise<boolean>;
   deleteQuote: (id: string) => Promise<boolean>;
 
   // Global state
   isLoading: boolean;
   isConnected: boolean;
   recentActivity: UserActivity[];
   
   // Refresh all data
   refreshAll: () => Promise<void>;
 }
 
 const CloudDataContext = createContext<CloudDataContextValue | undefined>(undefined);

// Export context for safe hooks that need to check availability
export { CloudDataContext };
 
 export function CloudDataProvider({ children }: { children: ReactNode }) {
   const { licenseId, authUserId } = useLicenseContext();
   const [isConnected, setIsConnected] = useState(true);
   const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
 
   // All cloud hooks
   const {
     vehicles,
     loading: vehiclesLoading,
     fetchVehicles,
     createVehicle,
     updateVehicle,
     deleteVehicle,
   } = useCloudVehicles();
 
   const {
     trailers,
     loading: trailersLoading,
     fetchTrailers,
     createTrailer,
     updateTrailer,
     deleteTrailer,
   } = useCloudTrailers();
 
   const {
     cdiDrivers,
     interimDrivers,
     loading: driversLoading,
     fetchDrivers,
     createDriver,
     updateDriver,
     deleteDriver,
   } = useCloudDrivers();
 
   const {
     charges,
     loading: chargesLoading,
     fetchCharges,
     createCharge,
     updateCharge,
     deleteCharge,
   } = useCloudCharges();
 
   const {
     clients,
     loading: clientsLoading,
     fetchClients,
     createClient,
     updateClient,
     deleteClient,
   } = useClients();
 
   const {
     tours,
     loading: toursLoading,
     fetchTours,
     saveTour,
     updateTour,
     deleteTour,
   } = useSavedTours();
 
   const {
     trips,
     loading: tripsLoading,
     fetchTrips,
     createTrip,
     updateTrip,
     deleteTrip,
   } = useTrips();
 
   const {
     quotes,
     loading: quotesLoading,
     fetchQuotes,
     createQuote,
     updateQuote,
     deleteQuote,
   } = useQuotes();
 
    // isLoading is only true during the INITIAL load phase when licenseId is available.
    // Once any hook finishes, we consider the app usable.
    // If licenseId is not yet available, we're not "loading cloud data" — we're waiting for auth.
    const isLoading = licenseId
      ? vehiclesLoading &&
        trailersLoading &&
        driversLoading &&
        chargesLoading &&
        clientsLoading &&
        toursLoading &&
        tripsLoading &&
        quotesLoading
      : false;
 
   // Subscribe to sync events for activity tracking
   useEffect(() => {
     if (!licenseId) return;
 
     const channel = supabase
       .channel(`sync_events_${licenseId}`)
       .on(
         'postgres_changes',
         {
           event: 'INSERT',
           schema: 'public',
           table: 'company_sync_events',
           filter: `license_id=eq.${licenseId}`,
         },
         async (payload) => {
           const event = payload.new as any;
           
           // Skip events from the current user
           if (event.user_id === authUserId) return;
 
           // Get the user display name
           const { data: userData } = await supabase
             .from('company_users')
             .select('display_name, email')
             .eq('user_id', event.user_id)
             .maybeSingle();
 
           const activity: UserActivity = {
             userId: event.user_id,
             displayName: userData?.display_name || userData?.email || 'Utilisateur',
             action: event.event_type,
             entityType: event.entity_type,
             entityName: event.event_data?.name || event.event_data?.label,
             timestamp: new Date(event.created_at),
           };
 
           setRecentActivity(prev => [activity, ...prev.slice(0, 19)]);
         }
       )
       .subscribe((status) => {
         setIsConnected(status === 'SUBSCRIBED');
       });
 
     return () => {
       supabase.removeChannel(channel);
     };
   }, [licenseId, authUserId]);
 
   // Network connectivity monitoring
   useEffect(() => {
     const handleOnline = () => setIsConnected(true);
     const handleOffline = () => setIsConnected(false);
 
     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);
 
     return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
     };
   }, []);
 
   // Refresh all data
   const refreshAll = useCallback(async () => {
     await Promise.allSettled([
       fetchVehicles(),
       fetchTrailers(),
       fetchDrivers(),
       fetchCharges(),
       fetchClients(),
       fetchTours(),
       fetchTrips(),
       fetchQuotes(),
     ]);
   }, [fetchVehicles, fetchTrailers, fetchDrivers, fetchCharges, fetchClients, fetchTours, fetchTrips, fetchQuotes]);
 
   return (
     <CloudDataContext.Provider
       value={{
         // Vehicles
         vehicles,
         vehiclesLoading,
         createVehicle,
         updateVehicle,
         deleteVehicle,
 
         // Trailers
         trailers,
         trailersLoading,
         createTrailer,
         updateTrailer,
         deleteTrailer,
 
         // Drivers
         cdiDrivers,
         interimDrivers,
         driversLoading,
         createDriver,
         updateDriver,
         deleteDriver,
 
         // Charges
         charges,
         chargesLoading,
         createCharge,
         updateCharge,
         deleteCharge,
 
         // Clients
         clients,
         clientsLoading,
         createClient,
         updateClient,
         deleteClient,
 
         // Tours
         tours,
         toursLoading,
         saveTour,
         updateTour,
         deleteTour,
 
         // Trips
         trips,
         tripsLoading,
         createTrip,
         updateTrip,
         deleteTrip,
 
         // Quotes
         quotes,
         quotesLoading,
         createQuote,
         updateQuote,
         deleteQuote,
 
         // Global state
         isLoading,
         isConnected,
         recentActivity,
         refreshAll,
       }}
     >
       {children}
     </CloudDataContext.Provider>
   );
 }
 
 export function useCloudData() {
   const context = useContext(CloudDataContext);
   if (!context) {
     throw new Error('useCloudData must be used within a CloudDataProvider');
   }
   return context;
 }