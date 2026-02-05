 /**
  * Central hook to access all cloud-synchronized data across the company.
  * This is the single source of truth for shared operational data.
  */
 import { useCloudVehicles } from './useCloudVehicles';
 import { useCloudTrailers } from './useCloudTrailers';
 import { useCloudDrivers } from './useCloudDrivers';
 import { useCloudCharges } from './useCloudCharges';
 import { useClients } from './useClients';
 import { useSavedTours } from './useSavedTours';
 import { useTrips } from './useTrips';
 import { useQuotes } from './useQuotes';
 
 export function useCloudData() {
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
 
   // Combine all drivers
   const drivers = [...cdiDrivers, ...interimDrivers];
 
   const isLoading =
     vehiclesLoading ||
     trailersLoading ||
     driversLoading ||
     chargesLoading ||
     clientsLoading ||
     toursLoading ||
     tripsLoading ||
     quotesLoading;
 
   return {
     // Vehicles
     vehicles,
     vehiclesLoading,
     fetchVehicles,
     createVehicle,
     updateVehicle,
     deleteVehicle,
 
     // Trailers
     trailers,
     trailersLoading,
     fetchTrailers,
     createTrailer,
     updateTrailer,
     deleteTrailer,
 
     // Drivers
     drivers,
     cdiDrivers,
     interimDrivers,
     driversLoading,
     fetchDrivers,
     createDriver,
     updateDriver,
     deleteDriver,
 
     // Charges
     charges,
     chargesLoading,
     fetchCharges,
     createCharge,
     updateCharge,
     deleteCharge,
 
     // Clients
     clients,
     clientsLoading,
     fetchClients,
     createClient,
     updateClient,
     deleteClient,
 
     // Tours
     tours,
     toursLoading,
     fetchTours,
     saveTour,
     updateTour,
     deleteTour,
 
     // Trips
     trips,
     tripsLoading,
     fetchTrips,
     createTrip,
     updateTrip,
     deleteTrip,
 
     // Quotes
     quotes,
     quotesLoading,
     fetchQuotes,
     createQuote,
     updateQuote,
     deleteQuote,
 
     // Global loading state
     isLoading,
   };
 }