 import { useState, useCallback, useEffect, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
 import { toast } from 'sonner';
 import type { PlanningEntry, PlanningEntryInput, TourInput } from '@/types/planning';
 import type { RealtimeChannel } from '@supabase/supabase-js';
import { format, addDays, addWeeks, parseISO, getDay, startOfWeek, endOfWeek, isWithinInterval, isBefore, isAfter, startOfDay } from 'date-fns';
import { getLicenseId } from '@/context/LicenseContext';

function withTimeout<T>(work: () => Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} : délai dépassé (${Math.round(ms / 1000)}s)`));
    }, ms);

    // Ensure we always deal with a real Promise (some query builders are thenables)
    Promise.resolve()
      .then(work)
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export interface ExcelTourInput {
  tour_name: string;
  vehicle_id?: string | null;
  client_id?: string | null;
  driver_id?: string | null;
  recurring_days: number[];
  is_all_year: boolean;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  origin_address?: string | null;
  destination_address?: string | null;
  mission_order?: string | null;
  notes?: string | null;
  relay_driver_id?: string | null;
  relay_location?: string | null;
  relay_time?: string | null;
  sector_manager?: string | null;
  /** Driver ID per day index (0=Mon...6=Sun) - overrides driver_id for specific days */
  day_driver_ids?: Record<number, string>;
  /** Default note text per day index (0=Mon...5=Sat) */
  day_notes?: Record<number, string>;
}
 
 export function usePlanning() {
   const { licenseId, authUserId, isLoading: contextLoading } = useLicenseContext();
   const [entries, setEntries] = useState<PlanningEntry[]>([]);
   const [loading, setLoading] = useState(false);
   const channelRef = useRef<RealtimeChannel | null>(null);
   const fetchInProgressRef = useRef(false);

  // When doing bulk inserts (Excel import), realtime INSERT events can flood the UI and make it look stuck.
  // We temporarily suspend realtime handling during the import and rely on a single refetch after.
  const suspendRealtimeRef = useRef(false);
 
   // Keep latest state in ref for realtime handlers
   const entriesRef = useRef<PlanningEntry[]>(entries);
   useEffect(() => { entriesRef.current = entries; }, [entries]);

   const fetchEntries = useCallback(async (startDate?: string, endDate?: string): Promise<void> => {
     if (fetchInProgressRef.current) return;
     
     if (!authUserId || !licenseId) {
       return;
     }
 
     fetchInProgressRef.current = true;
     setLoading(true);
 
     try {
       let query = supabase
         .from('planning_entries')
         .select('*')
         .eq('license_id', licenseId)
         .order('planning_date', { ascending: true })
         .order('start_time', { ascending: true });
 
       if (startDate) {
         query = query.gte('planning_date', startDate);
       }
       if (endDate) {
         query = query.lte('planning_date', endDate);
       }
 
       const { data, error } = await query;
 
       if (error) throw error;
 
       const mappedEntries: PlanningEntry[] = (data || []).map(row => ({
         id: row.id,
         user_id: row.user_id,
         license_id: row.license_id,
         planning_date: row.planning_date,
         start_time: row.start_time,
         end_time: row.end_time,
         client_id: row.client_id,
         driver_id: row.driver_id,
         vehicle_id: row.vehicle_id,
         mission_order: row.mission_order,
         origin_address: row.origin_address,
         destination_address: row.destination_address,
         notes: row.notes,
         status: row.status as PlanningEntry['status'],
         created_at: row.created_at,
         updated_at: row.updated_at,
         tour_name: row.tour_name,
         recurring_days: row.recurring_days || [],
         is_all_year: row.is_all_year || false,
         start_date: row.start_date,
         end_date: row.end_date,
         relay_driver_id: row.relay_driver_id,
         relay_location: row.relay_location,
         relay_time: row.relay_time,
         parent_tour_id: row.parent_tour_id,
       }));
 
       setEntries(mappedEntries);
       entriesRef.current = mappedEntries;
     } catch (error) {
       console.error('Error fetching planning entries:', error);
       toast.error('Erreur lors du chargement du planning');
     } finally {
       setLoading(false);
       fetchInProgressRef.current = false;
     }
   }, [authUserId, licenseId]);
 
  // Store fetchEntries in ref to avoid subscription churn
  const fetchEntriesRef = useRef<(startDate?: string, endDate?: string) => Promise<void>>();
  useEffect(() => { fetchEntriesRef.current = fetchEntries; }, [fetchEntries]);

   // Realtime subscription
   useEffect(() => {
     if (!licenseId) return;
 
     channelRef.current = supabase
       .channel(`planning_${licenseId}`)
       .on(
         'postgres_changes',
         {
           event: '*',
           schema: 'public',
           table: 'planning_entries',
           filter: `license_id=eq.${licenseId}`,
         },
         (payload) => {
           console.log('[Realtime] planning change:', payload.eventType);

            if (suspendRealtimeRef.current) return;
           
           if (payload.eventType === 'INSERT') {
             const newEntry = payload.new as PlanningEntry;
             setEntries(prev => {
               if (prev.find(e => e.id === newEntry.id)) return prev;
               const updated = [...prev, newEntry].sort((a, b) => 
                 a.planning_date.localeCompare(b.planning_date) || 
                 (a.start_time || '').localeCompare(b.start_time || '')
               );
               entriesRef.current = updated;
               return updated;
             });
           } else if (payload.eventType === 'UPDATE') {
             const updated = payload.new as PlanningEntry;
             setEntries(prev => {
               const newList = prev.map(e => e.id === updated.id ? updated : e);
               entriesRef.current = newList;
               return newList;
             });
           } else if (payload.eventType === 'DELETE') {
             const deletedId = (payload.old as { id: string }).id;
             setEntries(prev => {
               const newList = prev.filter(e => e.id !== deletedId);
               entriesRef.current = newList;
               return newList;
             });
           }
         }
       )
       .subscribe((status) => {
         console.log('[Realtime] planning subscription:', status);
         // Reconcile on subscribe to catch any missed events
        if (status === 'SUBSCRIBED') {
          void fetchEntriesRef.current?.();
         }
       });
 
     return () => {
       if (channelRef.current) {
         supabase.removeChannel(channelRef.current);
         channelRef.current = null;
       }
     };
  }, [licenseId]); // Only depend on licenseId to prevent subscription churn
 
   // Auto-fetch when licenseId becomes available
   useEffect(() => {
     if (licenseId && authUserId) {
       fetchEntries();
     }
   }, [licenseId, authUserId, fetchEntries]);
 
    const createEntry = useCallback(async (input: PlanningEntryInput): Promise<PlanningEntry | null> => {
     try {
      // Use context values, fallback to direct auth if needed
      let uid = authUserId;
      let lid = licenseId;
      
      if (!uid || !lid) {
        const { data: { user } } = await supabase.auth.getUser();
        const fallbackLicenseId = await getLicenseId();
        uid = user?.id || null;
        lid = fallbackLicenseId;
      }
      
      if (!uid || !lid) {
        toast.error('Veuillez vous reconnecter');
         return null;
       }
 
       const { data, error } = await supabase
         .from('planning_entries')
         .insert({
          user_id: uid,
          license_id: lid,
           planning_date: input.planning_date,
           start_time: input.start_time || null,
           end_time: input.end_time || null,
           client_id: input.client_id || null,
           driver_id: input.driver_id || null,
           vehicle_id: input.vehicle_id || null,
           mission_order: input.mission_order || null,
           origin_address: input.origin_address || null,
           destination_address: input.destination_address || null,
           notes: input.notes || null,
           status: input.status || 'planned',
           tour_name: input.tour_name || null,
           recurring_days: input.recurring_days || [],
           is_all_year: input.is_all_year || false,
           start_date: input.start_date || null,
           end_date: input.end_date || null,
           relay_driver_id: input.relay_driver_id || null,
           relay_location: input.relay_location || null,
           relay_time: input.relay_time || null,
           parent_tour_id: input.parent_tour_id || null,
         })
         .select()
         .single();
 
       if (error) throw error;
 
       const newEntry: PlanningEntry = {
         id: data.id,
         user_id: data.user_id,
         license_id: data.license_id,
         planning_date: data.planning_date,
         start_time: data.start_time,
         end_time: data.end_time,
         client_id: data.client_id,
         driver_id: data.driver_id,
         vehicle_id: data.vehicle_id,
         mission_order: data.mission_order,
         origin_address: data.origin_address,
         destination_address: data.destination_address,
         notes: data.notes,
         status: data.status as PlanningEntry['status'],
         created_at: data.created_at,
         updated_at: data.updated_at,
         tour_name: data.tour_name,
         recurring_days: data.recurring_days || [],
         is_all_year: data.is_all_year || false,
         start_date: data.start_date,
         end_date: data.end_date,
         relay_driver_id: data.relay_driver_id,
         relay_location: data.relay_location,
         relay_time: data.relay_time,
         parent_tour_id: data.parent_tour_id,
       };
 
       setEntries(prev => [...prev, newEntry].sort((a, b) => 
         a.planning_date.localeCompare(b.planning_date) || 
         (a.start_time || '').localeCompare(b.start_time || '')
       ));
 
       toast.success('Entrée ajoutée au planning');
       return newEntry;
     } catch (error) {
       console.error('Error creating planning entry:', error);
       toast.error('Erreur lors de la création');
       return null;
     }
    }, [authUserId, licenseId]);
 
   const updateEntry = useCallback(async (id: string, updates: Partial<PlanningEntryInput>): Promise<boolean> => {
     try {
       const { error } = await supabase
         .from('planning_entries')
         .update({
           ...updates,
           updated_at: new Date().toISOString(),
         })
         .eq('id', id);
 
       if (error) throw error;
 
       setEntries(prev => prev.map(e => 
         e.id === id ? { ...e, ...updates, updated_at: new Date().toISOString() } : e
       ));
 
       toast.success('Planning mis à jour');
       return true;
     } catch (error) {
       console.error('Error updating planning entry:', error);
       toast.error('Erreur lors de la mise à jour');
       return false;
     }
   }, []);
 
   const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
     try {
       const { error } = await supabase
         .from('planning_entries')
         .delete()
         .eq('id', id);
 
       if (error) throw error;
 
       setEntries(prev => prev.filter(e => e.id !== id));
       toast.success('Entrée supprimée');
       return true;
     } catch (error) {
       console.error('Error deleting planning entry:', error);
       toast.error('Erreur lors de la suppression');
       return false;
     }
   }, []);
 
   // Get entries for a specific date
   const getEntriesForDate = useCallback((date: string): PlanningEntry[] => {
     return entries.filter(e => e.planning_date === date);
   }, [entries]);
 
   // Get entries for a specific vehicle
   const getEntriesForVehicle = useCallback((vehicleId: string): PlanningEntry[] => {
     return entries.filter(e => e.vehicle_id === vehicleId);
   }, [entries]);
 
   // Create a recurring tour with entries for selected days
   const createTour = useCallback(async (input: TourInput, weeksAhead: number = 4): Promise<boolean> => {
     try {
      if (!authUserId || !licenseId) {
        if (!contextLoading) {
          toast.error('Session non initialisée. Veuillez recharger la page.');
        }
         return false;
       }
 
       const startDate = parseISO(input.start_date);
       const endDate = input.end_date ? parseISO(input.end_date) : (input.is_all_year ? addWeeks(startDate, 52) : addWeeks(startDate, weeksAhead));
       
       // Generate all dates for the tour
       const datesToCreate: string[] = [];
       let currentDate = startOfDay(startDate);
       
       while (isBefore(currentDate, endDate) || currentDate.getTime() === endDate.getTime()) {
         // Convert JS getDay (0=Sun) to our format (0=Mon)
         const dayOfWeek = (getDay(currentDate) + 6) % 7; // Convert: Sun=6, Mon=0, Tue=1, etc.
         
         if (input.recurring_days.includes(dayOfWeek)) {
           datesToCreate.push(format(currentDate, 'yyyy-MM-dd'));
         }
         currentDate = addDays(currentDate, 1);
       }
       
       if (datesToCreate.length === 0) {
         toast.error('Aucune date ne correspond aux jours sélectionnés');
         return false;
       }
       
       // Create entries for all dates
       const entriesToInsert = datesToCreate.map(date => ({
        user_id: authUserId,
        license_id: licenseId,
         planning_date: date,
         start_time: input.start_time || null,
         end_time: input.end_time || null,
         client_id: input.client_id || null,
         driver_id: input.driver_id || null,
          vehicle_id: input.vehicle_id || null,
         mission_order: input.mission_order || null,
         origin_address: input.origin_address || null,
         destination_address: input.destination_address || null,
         notes: input.notes || null,
         status: 'planned' as const,
         tour_name: input.tour_name,
         recurring_days: input.recurring_days,
         is_all_year: input.is_all_year,
         start_date: input.start_date,
         end_date: input.end_date || null,
         relay_driver_id: input.relay_driver_id || null,
         relay_location: input.relay_location || null,
         relay_time: input.relay_time || null,
       }));
       
       const { error } = await supabase
         .from('planning_entries')
         .insert(entriesToInsert);
       
       if (error) throw error;
       
       toast.success(`Tournée créée avec ${datesToCreate.length} entrées`);
       return true;
     } catch (error) {
       console.error('Error creating tour:', error);
       toast.error('Erreur lors de la création de la tournée');
       return false;
     }
   }, [authUserId, licenseId]);

    const importExcelPlanningWeek = useCallback(
      async (tours: ExcelTourInput[], weekStartDate: Date): Promise<boolean> => {
        try {
          suspendRealtimeRef.current = true;

          if (!authUserId || !licenseId) {
            if (!contextLoading) {
              toast.error('Session non initialisée. Veuillez recharger la page.');
            }
            return false;
          }

          const monday = startOfWeek(weekStartDate, { weekStartsOn: 1 });
          const weekStartStr = format(monday, 'yyyy-MM-dd');

          const rows = tours.flatMap((t) => {
            const recurring = Array.isArray(t.recurring_days) ? t.recurring_days : [];
            // Import Mon..Sat only (Sunday is manual/rare)
            const validDays = recurring.filter((d) => Number.isInteger(d) && d >= 0 && d <= 5);
            return validDays.map((dayIdx) => {
              const date = addDays(monday, dayIdx);
              // Use day-specific driver if available, otherwise fall back to global driver_id
              const driverForDay = t.day_driver_ids?.[dayIdx] || t.driver_id || null;
              const notesForDay = t.day_notes?.[dayIdx] ?? t.notes ?? null;
              return {
                user_id: authUserId,
                license_id: licenseId,
                planning_date: format(date, 'yyyy-MM-dd'),
                start_time: t.start_time || null,
                end_time: t.end_time || null,
                client_id: t.client_id || null,
                driver_id: driverForDay,
                // Excel import starts as "Non assigné"
                vehicle_id: t.vehicle_id || null,
                mission_order: t.mission_order || null,
                origin_address: t.origin_address || null,
                destination_address: t.destination_address || null,
                notes: notesForDay,
                status: 'planned' as const,
                tour_name: t.tour_name,
                recurring_days: validDays,
                is_all_year: false,
                start_date: weekStartStr,
                end_date: null,
                relay_driver_id: t.relay_driver_id || null,
                relay_location: t.relay_location || null,
                relay_time: t.relay_time || null,
                parent_tour_id: null,
                sector_manager: t.sector_manager || null,
              };
            });
          });

          if (rows.length === 0) {
            toast.error('Aucune mission à importer (jours non cochés ?)');
            return false;
          }

          // Insert in chunks to avoid payload limits on large files
          const CHUNK_SIZE = 200;
          for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);

            // Execute the insert
            const res = await withTimeout(
              () => supabase.from('planning_entries').insert(chunk) as any,
              45_000,
              `Import Excel (lot ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(rows.length / CHUNK_SIZE)})`
            );
            const { error } = res as { error: unknown | null };
            if (error) throw error;
          }

          return true;
        } catch (error) {
          console.error('Error importing planning from Excel:', error);
          const errMsg = error instanceof Error ? error.message : "Erreur lors de l'import Excel";
          toast.error(errMsg);
          return false;
        } finally {
          suspendRealtimeRef.current = false;
        }
      },
      [authUserId, licenseId]
    );

    const deleteTourInWeek = useCallback(async (tourName: string, weekStartDate: Date): Promise<boolean> => {
      try {
        if (!licenseId) {
          if (!contextLoading) {
            toast.error('Session non initialisée. Veuillez recharger la page.');
          }
          return false;
        }

        const monday = startOfWeek(weekStartDate, { weekStartsOn: 1 });
        const startStr = format(monday, 'yyyy-MM-dd');
        const endStr = format(addDays(monday, 6), 'yyyy-MM-dd');

        const { error } = await supabase
          .from('planning_entries')
          .delete()
          .eq('license_id', licenseId)
          .eq('tour_name', tourName)
          .gte('planning_date', startStr)
          .lte('planning_date', endStr);

        if (error) throw error;

        setEntries((prev) => prev.filter((e) => {
          if (e.tour_name !== tourName) return true;
          return e.planning_date < startStr || e.planning_date > endStr;
        }));

        toast.success(`Traction "${tourName}" supprimée sur la semaine`);
        return true;
      } catch (e) {
        console.error('Error deleting tour in week:', e);
        toast.error('Erreur lors de la suppression de la traction');
        return false;
      }
    }, [licenseId]);
 
   // Duplicate entries to following weeks
   const duplicateToNextWeeks = useCallback(async (entryIds: string[], numWeeks: number): Promise<boolean> => {
     try {
      if (!authUserId || !licenseId) {
        if (!contextLoading) {
          toast.error('Session non initialisée. Veuillez recharger la page.');
        }
         return false;
       }
 
       // Get entries to duplicate
       const entriesToDuplicate = entries.filter(e => entryIds.includes(e.id));
       
       if (entriesToDuplicate.length === 0) {
         toast.error('Aucune entrée à dupliquer');
         return false;
       }
       
       const newEntries: any[] = [];
       
       for (const entry of entriesToDuplicate) {
         const entryDate = parseISO(entry.planning_date);
         
         for (let week = 1; week <= numWeeks; week++) {
           const newDate = addWeeks(entryDate, week);
           newEntries.push({
            user_id: authUserId,
            license_id: licenseId,
             planning_date: format(newDate, 'yyyy-MM-dd'),
             start_time: entry.start_time,
             end_time: entry.end_time,
             client_id: entry.client_id,
             driver_id: entry.driver_id,
             vehicle_id: entry.vehicle_id,
             mission_order: entry.mission_order,
             origin_address: entry.origin_address,
             destination_address: entry.destination_address,
             notes: entry.notes,
             status: 'planned',
             tour_name: entry.tour_name,
             recurring_days: entry.recurring_days,
             is_all_year: entry.is_all_year,
             relay_driver_id: entry.relay_driver_id,
             relay_location: entry.relay_location,
             relay_time: entry.relay_time,
             parent_tour_id: entry.id,
           });
         }
       }
       
       const { error } = await supabase
         .from('planning_entries')
         .insert(newEntries);
       
       if (error) throw error;
       
       toast.success(`${newEntries.length} entrées dupliquées sur ${numWeeks} semaine(s)`);
       return true;
     } catch (error) {
       console.error('Error duplicating entries:', error);
       toast.error('Erreur lors de la duplication');
       return false;
     }
   }, [authUserId, entries, licenseId]);
 
   return {
     entries,
     loading,
     fetchEntries,
     createEntry,
     updateEntry,
     deleteEntry,
     getEntriesForDate,
     getEntriesForVehicle,
     createTour,
      importExcelPlanningWeek,
      deleteTourInWeek,
     duplicateToNextWeeks,
    applyVehicleToTour: async (vehicleId: string, tourName: string): Promise<boolean> => {
      try {
        if (!licenseId) {
          if (!contextLoading) {
            toast.error('Session non initialisée. Veuillez recharger la page.');
          }
          return false;
        }

        const { error } = await supabase
          .from('planning_entries')
          .update({ vehicle_id: vehicleId, updated_at: new Date().toISOString() })
          .eq('license_id', licenseId)
          .eq('tour_name', tourName);

        if (error) throw error;

        // Update local state
        setEntries(prev => prev.map(e => 
          e.tour_name === tourName ? { ...e, vehicle_id: vehicleId, updated_at: new Date().toISOString() } : e
        ));

        toast.success(`Véhicule appliqué à toutes les missions "${tourName}"`);
        return true;
      } catch (error) {
        console.error('Error applying vehicle to tour:', error);
        toast.error('Erreur lors de l\'application du véhicule');
        return false;
      }
    },
   };
 }