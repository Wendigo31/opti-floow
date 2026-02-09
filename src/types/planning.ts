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
   // Tour/recurring fields
   tour_name: string | null;
   recurring_days: number[]; // 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
   is_all_year: boolean;
   start_date: string | null;
   end_date: string | null;
   // Relay driver
  relay_driver_id: string | null;
  relay_location: string | null;
  relay_time: string | null;
  // Parent tour reference
  parent_tour_id: string | null;
  // Sector manager
  sector_manager: string | null;
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
   // Tour/recurring fields
   tour_name?: string | null;
   recurring_days?: number[];
   is_all_year?: boolean;
   start_date?: string | null;
   end_date?: string | null;
   // Relay driver
   relay_driver_id?: string | null;
  relay_location?: string | null;
  relay_time?: string | null;
  parent_tour_id?: string | null;
  sector_manager?: string | null;
 }
 
 export interface TourInput {
   tour_name: string;
   vehicle_id: string;
   client_id?: string | null;
   driver_id?: string | null;
   recurring_days: number[]; // 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
   is_all_year: boolean;
   start_date: string;
   end_date?: string | null;
   start_time?: string | null;
   end_time?: string | null;
   origin_address?: string | null;
   destination_address?: string | null;
   mission_order?: string | null;
   notes?: string | null;
   // Relay driver
   relay_driver_id?: string | null;
   relay_location?: string | null;
   relay_time?: string | null;
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
 
 export const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
 export const fullDayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];