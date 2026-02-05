 // Planning types for the interactive planning feature
 
 export interface PlanningEntry {
   id: string;
   user_id: string;
   license_id: string | null;
   planning_date: string; // YYYY-MM-DD format
   start_time: string | null;
   end_time: string | null;
   client_id: string | null;
   driver_id: string | null;
   vehicle_id: string | null;
   mission_order: string | null;
   origin_address: string | null;
   destination_address: string | null;
   notes: string | null;
   status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
   created_at: string;
   updated_at: string;
 }
 
 export interface PlanningEntryInput {
   planning_date: string;
   start_time?: string | null;
   end_time?: string | null;
   client_id?: string | null;
   driver_id?: string | null;
   vehicle_id?: string | null;
   mission_order?: string | null;
   origin_address?: string | null;
   destination_address?: string | null;
   notes?: string | null;
   status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
 }
 
 export const planningStatusLabels: Record<PlanningEntry['status'], string> = {
   planned: 'Planifié',
   in_progress: 'En cours',
   completed: 'Terminé',
   cancelled: 'Annulé',
 };
 
 export const planningStatusColors: Record<PlanningEntry['status'], string> = {
   planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
   in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
   completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
   cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
 };