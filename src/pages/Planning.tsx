 import { useState, useEffect, useMemo, useCallback } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Copy, Check, Upload } from 'lucide-react';
 import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
 import { fr } from 'date-fns/locale';
 import { usePlanning } from '@/hooks/usePlanning';
 import { useCloudVehicles } from '@/hooks/useCloudVehicles';
 import { useCloudDrivers } from '@/hooks/useCloudDrivers';
 import { useClients } from '@/hooks/useClients';
 import { PlanningEntryDialog } from '@/components/planning/PlanningEntryDialog';
 import { PlanningCell } from '@/components/planning/PlanningCell';
 import { AddTourDialog } from '@/components/planning/AddTourDialog';
 import { DuplicateWeeksDialog } from '@/components/planning/DuplicateWeeksDialog';
 import { ImportPlanningDialog } from '@/components/planning/ImportPlanningDialog';
 import type { PlanningEntry, PlanningEntryInput } from '@/types/planning';
 import type { Vehicle } from '@/types/vehicle';
 import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
 import { Checkbox } from '@/components/ui/checkbox';
 import { toast } from 'sonner';
 
 export default function Planning() {
   const [currentWeekStart, setCurrentWeekStart] = useState(() => 
     startOfWeek(new Date(), { weekStartsOn: 1 })
   );
   const [selectedEntry, setSelectedEntry] = useState<PlanningEntry | null>(null);
   const [isDialogOpen, setIsDialogOpen] = useState(false);
   const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
   const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
   const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
   const [newEntryDefaults, setNewEntryDefaults] = useState<Partial<PlanningEntryInput>>({});
   const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
   const [isSelectionMode, setIsSelectionMode] = useState(false);
 
   const { entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry, createTour, duplicateToNextWeeks } = usePlanning();
   const { vehicles, fetchVehicles } = useCloudVehicles();
   const { cdiDrivers, interimDrivers, fetchDrivers } = useCloudDrivers();
   const { clients } = useClients();
 
   const allDrivers = useMemo(() => [...cdiDrivers, ...interimDrivers], [cdiDrivers, interimDrivers]);
 
   // Only show active vehicles of type "tracteur"
   const tractions = useMemo(() => 
     vehicles.filter(v => v.isActive && v.type === 'tracteur'),
     [vehicles]
   );

  // Get entries without a vehicle assigned
  const unassignedEntries = useMemo(() => 
    entries.filter(e => !e.vehicle_id),
    [entries]
  );

  // Check if we have unassigned entries for a specific date
  const getUnassignedEntriesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return unassignedEntries.filter(e => e.planning_date === dateStr);
  };
 
   // Generate week days
   const weekDays = useMemo(() => {
     return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
   }, [currentWeekStart]);
 
   // Fetch data on mount and week change
   useEffect(() => {
     const startDate = format(currentWeekStart, 'yyyy-MM-dd');
     const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
     fetchEntries(startDate, endDate);
   }, [currentWeekStart, fetchEntries]);
 
   useEffect(() => {
     fetchVehicles();
     fetchDrivers();
   }, [fetchVehicles, fetchDrivers]);
 
   const handlePreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
   const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
   const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
 
   const toggleSelectionMode = () => {
     setIsSelectionMode(prev => !prev);
     setSelectedEntryIds(new Set());
   };
 
   const toggleEntrySelection = useCallback((entryId: string) => {
     setSelectedEntryIds(prev => {
       const newSet = new Set(prev);
       if (newSet.has(entryId)) {
         newSet.delete(entryId);
       } else {
         newSet.add(entryId);
       }
       return newSet;
     });
   }, []);
 
   const selectAllInWeek = () => {
     const weekEntryIds = entries.map(e => e.id);
     setSelectedEntryIds(new Set(weekEntryIds));
   };
 
   const handleCellClick = (vehicle: Vehicle, date: Date) => {
     if (isSelectionMode) return;
     setSelectedEntry(null);
     setNewEntryDefaults({
       vehicle_id: vehicle.id,
       planning_date: format(date, 'yyyy-MM-dd'),
     });
     setIsDialogOpen(true);
   };
 
   const handleEntryClick = (entry: PlanningEntry) => {
     if (isSelectionMode) {
       toggleEntrySelection(entry.id);
       return;
     }
     setSelectedEntry(entry);
     setNewEntryDefaults({});
     setIsDialogOpen(true);
   };
 
   const handleSave = async (input: PlanningEntryInput) => {
     if (selectedEntry) {
       await updateEntry(selectedEntry.id, input);
     } else {
       await createEntry(input);
     }
     setIsDialogOpen(false);
     setSelectedEntry(null);
   };
 
   const handleDelete = async () => {
     if (selectedEntry) {
       await deleteEntry(selectedEntry.id);
       setIsDialogOpen(false);
       setSelectedEntry(null);
     }
   };
 
   const handleDuplicate = async (numWeeks: number) => {
     const success = await duplicateToNextWeeks(Array.from(selectedEntryIds), numWeeks);
     if (success) {
       setSelectedEntryIds(new Set());
       setIsSelectionMode(false);
       // Refetch entries
       const startDate = format(currentWeekStart, 'yyyy-MM-dd');
       const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
       fetchEntries(startDate, endDate);
     }
     return success;
   };
 
   // Get entries for a specific vehicle and date
   const getEntriesForCell = (vehicleId: string, date: Date) => {
     const dateStr = format(date, 'yyyy-MM-dd');
     return entries.filter(e => e.vehicle_id === vehicleId && e.planning_date === dateStr);
   };

  // Handle click on unassigned cell
  const handleUnassignedCellClick = (date: Date) => {
    if (isSelectionMode) return;
    setSelectedEntry(null);
    setNewEntryDefaults({
      planning_date: format(date, 'yyyy-MM-dd'),
    });
    setIsDialogOpen(true);
  };
 
   // Get client name helper
   const getClientName = (clientId: string | null) => {
     if (!clientId) return null;
     const client = clients.find(c => c.id === clientId);
     return client?.name || client?.company || null;
   };
 
   // Get driver name helper
   const getDriverName = (driverId: string | null) => {
     if (!driverId) return null;
     const driver = allDrivers.find(d => d.id === driverId);
     return driver?.name || null;
   };
 
   // Get relay driver name helper
   const getRelayDriverName = (driverId: string | null) => {
     if (!driverId) return null;
     const driver = allDrivers.find(d => d.id === driverId);
     return driver?.name || null;
   };
 
   return (
     <div className="space-y-4 h-full flex flex-col">
       <div className="flex items-center justify-between flex-shrink-0">
         <div>
           <h1 className="text-2xl font-bold">Planning</h1>
           <p className="text-muted-foreground">
             Gérez les missions de vos tractions
           </p>
         </div>
         
         <div className="flex items-center gap-2">
           <Button 
             variant="default" 
             size="sm" 
             onClick={() => setIsTourDialogOpen(true)}
             className="gap-2"
           >
             <Plus className="h-4 w-4" />
             Ajouter une tournée
           </Button>
           
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => setIsImportDialogOpen(true)}
             className="gap-2"
           >
             <Upload className="h-4 w-4" />
             Importer Excel
           </Button>
           
           <div className="h-6 w-px bg-border mx-2" />
           
           {isSelectionMode && (
             <>
               <Button variant="outline" size="sm" onClick={selectAllInWeek}>
                 Tout sélectionner
               </Button>
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setIsDuplicateDialogOpen(true)}
                 disabled={selectedEntryIds.size === 0}
                 className="gap-2"
               >
                 <Copy className="h-4 w-4" />
                 Dupliquer ({selectedEntryIds.size})
               </Button>
             </>
           )}
           <Button 
             variant={isSelectionMode ? "secondary" : "outline"} 
             size="sm" 
             onClick={toggleSelectionMode}
             className="gap-2"
           >
             {isSelectionMode ? (
               <>
                 <Check className="h-4 w-4" />
                 Terminer
               </>
             ) : (
               <>
                 <Copy className="h-4 w-4" />
                 Sélectionner
               </>
             )}
           </Button>
           
           <div className="h-6 w-px bg-border mx-2" />
           
           <Button variant="outline" size="sm" onClick={handleToday}>
             Aujourd'hui
           </Button>
           <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
             <ChevronLeft className="h-4 w-4" />
           </Button>
           <div className="min-w-[200px] text-center font-medium">
             <span className="flex items-center justify-center gap-2">
               <CalendarIcon className="h-4 w-4" />
               {format(currentWeekStart, "'Semaine du' d MMMM yyyy", { locale: fr })}
             </span>
           </div>
           <Button variant="outline" size="icon" onClick={handleNextWeek}>
             <ChevronRight className="h-4 w-4" />
           </Button>
         </div>
       </div>
 
       <Card className="flex-1 overflow-hidden">
         <CardContent className="p-0 h-full">
           {loading ? (
             <div className="flex items-center justify-center h-64">
               <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
             </div>
           ) : tractions.length === 0 ? (
            <ScrollArea className="h-full">
              <div className="min-w-[900px]">
                {/* Header row with days */}
                <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/50 sticky top-0 z-10">
                  <div className="p-3 font-medium border-r">
                    Traction
                  </div>
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div 
                        key={i} 
                        className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/10' : ''}`}
                      >
                        <div className="font-medium">
                          {format(day, 'EEEE', { locale: fr })}
                        </div>
                        <div className={`text-sm ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {format(day, 'd MMM', { locale: fr })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Row for unassigned entries */}
                 <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-accent/10">
                   <div className="p-3 border-r bg-accent/20 flex flex-col justify-center">
                     <div className="font-medium text-accent-foreground">
                      Non assigné
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Sans véhicule
                    </div>
                  </div>

                  {weekDays.map((day, i) => {
                    const cellEntries = getUnassignedEntriesForDate(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <PlanningCell
                        key={i}
                        date={day}
                        entries={cellEntries}
                        isToday={isToday}
                        onCellClick={() => handleUnassignedCellClick(day)}
                        onEntryClick={handleEntryClick}
                        getClientName={getClientName}
                        getDriverName={getDriverName}
                        getRelayDriverName={getRelayDriverName}
                        isSelectionMode={isSelectionMode}
                        selectedEntryIds={selectedEntryIds}
                        onToggleSelection={toggleEntrySelection}
                      />
                    );
                  })}
                </div>

                {/* Message to add vehicles */}
                <div className="p-4 text-center text-muted-foreground border-t">
                  <p className="text-sm">
                    Ajoutez des véhicules de type "Tracteur" pour organiser vos missions par véhicule.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-2"
                    onClick={() => window.location.href = '/vehicles'}
                  >
                    Aller aux Véhicules
                  </Button>
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
             <ScrollArea className="h-full">
               <div className="min-w-[900px]">
                 {/* Header row with days */}
                 <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/50 sticky top-0 z-10">
                   <div className="p-3 font-medium border-r">
                     Traction
                   </div>
                   {weekDays.map((day, i) => {
                     const isToday = isSameDay(day, new Date());
                     return (
                       <div 
                         key={i} 
                         className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/10' : ''}`}
                       >
                         <div className="font-medium">
                           {format(day, 'EEEE', { locale: fr })}
                         </div>
                         <div className={`text-sm ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                           {format(day, 'd MMM', { locale: fr })}
                         </div>
                       </div>
                     );
                   })}
                 </div>
 
                 {/* Rows for each traction */}
                 {tractions.map((vehicle) => (
                   <div 
                     key={vehicle.id} 
                     className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-b-0"
                   >
                     {/* Vehicle info */}
                     <div className="p-3 border-r bg-muted/30 flex flex-col justify-center">
                       <div className="font-medium truncate" title={vehicle.name}>
                         {vehicle.name}
                       </div>
                       <div className="text-xs text-muted-foreground">
                         {vehicle.licensePlate}
                       </div>
                     </div>
 
                     {/* Cells for each day */}
                     {weekDays.map((day, i) => {
                       const cellEntries = getEntriesForCell(vehicle.id, day);
                       const isToday = isSameDay(day, new Date());
                       
                       return (
                         <PlanningCell
                           key={i}
                           date={day}
                           entries={cellEntries}
                           isToday={isToday}
                           onCellClick={() => handleCellClick(vehicle, day)}
                           onEntryClick={handleEntryClick}
                           getClientName={getClientName}
                           getDriverName={getDriverName}
                             getRelayDriverName={getRelayDriverName}
                             isSelectionMode={isSelectionMode}
                             selectedEntryIds={selectedEntryIds}
                             onToggleSelection={toggleEntrySelection}
                         />
                       );
                     })}
                   </div>
                 ))}

                {/* Row for unassigned entries at the bottom */}
                {unassignedEntries.length > 0 && (
                   <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-accent/10">
                     <div className="p-3 border-r bg-accent/20 flex flex-col justify-center">
                       <div className="font-medium text-accent-foreground">
                        Non assigné
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {unassignedEntries.length} mission(s)
                      </div>
                    </div>

                    {weekDays.map((day, i) => {
                      const cellEntries = getUnassignedEntriesForDate(day);
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <PlanningCell
                          key={i}
                          date={day}
                          entries={cellEntries}
                          isToday={isToday}
                          onCellClick={() => handleUnassignedCellClick(day)}
                          onEntryClick={handleEntryClick}
                          getClientName={getClientName}
                          getDriverName={getDriverName}
                          getRelayDriverName={getRelayDriverName}
                          isSelectionMode={isSelectionMode}
                          selectedEntryIds={selectedEntryIds}
                          onToggleSelection={toggleEntrySelection}
                        />
                      );
                    })}
                  </div>
                )}
               </div>
               <ScrollBar orientation="horizontal" />
             </ScrollArea>
           )}
         </CardContent>
       </Card>
 
       <PlanningEntryDialog
         open={isDialogOpen}
         onOpenChange={setIsDialogOpen}
         entry={selectedEntry}
         defaultValues={newEntryDefaults}
         clients={clients}
         drivers={allDrivers}
         vehicles={tractions}
         onSave={handleSave}
         onDelete={selectedEntry ? handleDelete : undefined}
       />
       
       <AddTourDialog
         open={isTourDialogOpen}
         onOpenChange={setIsTourDialogOpen}
         clients={clients}
         drivers={allDrivers}
         vehicles={tractions}
         onSave={createTour}
       />
       
       <DuplicateWeeksDialog
         open={isDuplicateDialogOpen}
         onOpenChange={setIsDuplicateDialogOpen}
         selectedCount={selectedEntryIds.size}
         onDuplicate={handleDuplicate}
       />
       
       <ImportPlanningDialog
         open={isImportDialogOpen}
         onOpenChange={setIsImportDialogOpen}
         vehicles={tractions}
         drivers={allDrivers}
         clients={clients}
         onImport={async (entries) => {
            let allOk = true;

            for (const entry of entries) {
              const ok = await createTour(entry, 4);
              if (!ok) allOk = false;
            }

            // After import, jump to the imported start week so users immediately see the result.
            const importedStart = entries?.[0]?.start_date;
            if (importedStart) {
              const importedWeekStart = startOfWeek(parseISO(importedStart), { weekStartsOn: 1 });
              setCurrentWeekStart(importedWeekStart);
              const startDate = format(importedWeekStart, 'yyyy-MM-dd');
              const endDate = format(addDays(importedWeekStart, 6), 'yyyy-MM-dd');
              fetchEntries(startDate, endDate);
            } else {
              // Fallback: refresh current week
              const startDate = format(currentWeekStart, 'yyyy-MM-dd');
              const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
              fetchEntries(startDate, endDate);
            }
            return allOk;
         }}
       />
     </div>
   );
 }