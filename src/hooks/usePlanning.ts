 import { useState, useCallback, useEffect, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';
 import { toast } from 'sonner';
 import type { PlanningEntry, PlanningEntryInput } from '@/types/planning';
 import type { RealtimeChannel } from '@supabase/supabase-js';
 
 export function usePlanning() {
   const { licenseId, authUserId } = useLicenseContext();
   const [entries, setEntries] = useState<PlanningEntry[]>([]);
   const [loading, setLoading] = useState(false);
   const channelRef = useRef<RealtimeChannel | null>(null);
 
   const fetchEntries = useCallback(async (startDate?: string, endDate?: string): Promise<void> => {
     if (!authUserId || !licenseId) {
       return;
     }
 
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
       }));
 
       setEntries(mappedEntries);
     } catch (error) {
       console.error('Error fetching planning entries:', error);
       toast.error('Erreur lors du chargement du planning');
     } finally {
       setLoading(false);
     }
   }, [authUserId, licenseId]);
 
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
           
           if (payload.eventType === 'INSERT') {
             const newEntry = payload.new as PlanningEntry;
             setEntries(prev => {
               if (prev.find(e => e.id === newEntry.id)) return prev;
               return [...prev, newEntry].sort((a, b) => 
                 a.planning_date.localeCompare(b.planning_date) || 
                 (a.start_time || '').localeCompare(b.start_time || '')
               );
             });
           } else if (payload.eventType === 'UPDATE') {
             const updated = payload.new as PlanningEntry;
             setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
           } else if (payload.eventType === 'DELETE') {
             const deletedId = (payload.old as { id: string }).id;
             setEntries(prev => prev.filter(e => e.id !== deletedId));
           }
         }
       )
       .subscribe();
 
     return () => {
       if (channelRef.current) {
         supabase.removeChannel(channelRef.current);
         channelRef.current = null;
       }
     };
   }, [licenseId]);
 
   const createEntry = useCallback(async (input: PlanningEntryInput): Promise<PlanningEntry | null> => {
     try {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         toast.error('Vous devez être connecté');
         return null;
       }
 
       const currentLicenseId = await getLicenseId();
 
       const { data, error } = await supabase
         .from('planning_entries')
         .insert({
           user_id: user.id,
           license_id: currentLicenseId,
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
   }, []);
 
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
 
   return {
     entries,
     loading,
     fetchEntries,
     createEntry,
     updateEntry,
     deleteEntry,
     getEntriesForDate,
     getEntriesForVehicle,
   };
 }