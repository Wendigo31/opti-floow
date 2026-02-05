 /**
  * Safe wrapper for useCloudData that handles the case when CloudDataProvider is not available.
  * This is useful for components that render before the provider is mounted.
  */
 import { useContext } from 'react';
 import { CloudDataContext } from '@/context/CloudDataContext';
 import type { UserActivity } from '@/context/CloudDataContext';
 
 interface CloudDataSafeReturn {
   isConnected: boolean;
   isLoading: boolean;
   recentActivity: UserActivity[];
 }
 
 const DEFAULT_STATE: CloudDataSafeReturn = {
   isConnected: true,
   isLoading: false,
   recentActivity: [],
 };
 
 /**
  * Safe hook that doesn't throw if CloudDataProvider is not available.
  * Returns default values if context is not available.
  */
 export function useCloudDataSafe(): CloudDataSafeReturn {
   const context = useContext(CloudDataContext);
   
   if (!context) {
     return DEFAULT_STATE;
   }
   
   return {
     isConnected: context.isConnected,
     isLoading: context.isLoading,
     recentActivity: context.recentActivity,
   };
 }