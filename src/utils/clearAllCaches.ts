 // Utility to clear all application caches
 
 const CACHE_KEYS_TO_CLEAR = [
   // Drivers
   'optiflow_drivers',
   'optiflow_drivers_cache',
   'optiflow_selected_drivers',
   // Charges
   'optiflow_charges',
   'optiflow_charges_cache',
   // Planning
   'optiflow_planning_cache',
   // Vehicles
   'optiflow_vehicles_cache',
   // Trailers
   'optiflow_trailers_cache',
   // Clients
   'optiflow_clients_cache',
   // Favorites
   'optiflow_favorites_cache',
   // Search history
   'optiflow_search_history_cache',
   // Tours
   'optiflow_tours_cache',
   // Trips
   'optiflow_trips_cache',
   // Quotes
   'optiflow_quotes_cache',
   // Session/itinerary
   'optiflow_itinerary_session',
   // License cache
   'optiflow_license_cache',
   // Offline mode
   'optiflow_offline_mode',
   // Any other potential caches
   'optiflow_company_settings_cache',
 ];
 
 export function clearAllCaches(): number {
   let cleared = 0;
   
   // Clear specific keys
   CACHE_KEYS_TO_CLEAR.forEach(key => {
     if (localStorage.getItem(key) !== null) {
       localStorage.removeItem(key);
       cleared++;
     }
   });
   
   // Also clear any keys that start with optiflow_ that we might have missed
   const allKeys = Object.keys(localStorage);
   allKeys.forEach(key => {
     if (key.startsWith('optiflow_') && !CACHE_KEYS_TO_CLEAR.includes(key)) {
       localStorage.removeItem(key);
       cleared++;
     }
   });
   
   return cleared;
 }
 
 export function clearSpecificCaches(types: ('drivers' | 'charges' | 'planning' | 'vehicles' | 'all')[]): number {
   let cleared = 0;
   
   const typeKeyMap: Record<string, string[]> = {
     drivers: ['optiflow_drivers', 'optiflow_drivers_cache', 'optiflow_selected_drivers'],
     charges: ['optiflow_charges', 'optiflow_charges_cache'],
     planning: ['optiflow_planning_cache'],
     vehicles: ['optiflow_vehicles_cache', 'optiflow_trailers_cache'],
   };
   
   if (types.includes('all')) {
     return clearAllCaches();
   }
   
   types.forEach(type => {
     const keys = typeKeyMap[type] || [];
     keys.forEach(key => {
       if (localStorage.getItem(key) !== null) {
         localStorage.removeItem(key);
         cleared++;
       }
     });
   });
   
   return cleared;
 }