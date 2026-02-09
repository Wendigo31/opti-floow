import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Copy, Check, Upload } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlanning } from '@/hooks/usePlanning';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useClients } from '@/hooks/useClients';
import { PlanningEntryDialog } from '@/components/planning/PlanningEntryDialog';
import { AddTourDialog } from '@/components/planning/AddTourDialog';
import { DuplicateWeeksDialog } from '@/components/planning/DuplicateWeeksDialog';
import { ImportPlanningDialog } from '@/components/planning/ImportPlanningDialog';
import type { PlanningEntry, PlanningEntryInput } from '@/types/planning';
import type { ExcelTourInput } from '@/hooks/usePlanning';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/** Compound key for grouping entries into traction rows */
function tractionKey(e: PlanningEntry): string {
  return `${e.tour_name || ''}|||${e.mission_order || ''}`;
}

interface TractionGroup {
  tourName: string;
  missionOrder: string | null;
  sectorManager: string | null;
  driverName: string | null;
  relayDriverName: string | null;
  entries: PlanningEntry[];
}

export default function Planning() {
  const navigate = useNavigate();
  const { licenseId } = useLicenseContext();
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

  const { entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry, createTour, importExcelPlanningWeek, deleteTourInWeek, duplicateToNextWeeks, applyVehicleToTour } = usePlanning();
  const { vehicles, fetchVehicles } = useCloudVehicles();
  const { cdiDrivers, interimDrivers, fetchDrivers } = useCloudDrivers();
  const { clients } = useClients();

  const allDrivers = useMemo(() => [...cdiDrivers, ...interimDrivers], [cdiDrivers, interimDrivers]);

  /** Silent create client for import auto-creation */
  const autoCreateClient = useCallback(async (name: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const currentLicenseId = licenseId || await getLicenseId();
      const { data, error } = await supabase
        .from('clients')
        .insert({ user_id: user.id, license_id: currentLicenseId, name })
        .select('id')
        .single();
      if (error) { console.error('Auto-create client error:', error); return null; }
      return data?.id || null;
    } catch (e) { console.error('Auto-create client exception:', e); return null; }
  }, [licenseId]);

  // Mon-Sat only (6 days)
  const weekDays = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Fetch data on mount and week change
  useEffect(() => {
    const startDate = format(currentWeekStart, 'yyyy-MM-dd');
    const endDate = format(addDays(currentWeekStart, 5), 'yyyy-MM-dd');
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
      if (newSet.has(entryId)) newSet.delete(entryId);
      else newSet.add(entryId);
      return newSet;
    });
  }, []);

  const selectAllInWeek = () => {
    setSelectedEntryIds(new Set(entries.map(e => e.id)));
  };

  const handleEntryClick = (entry: PlanningEntry) => {
    if (isSelectionMode) { toggleEntrySelection(entry.id); return; }
    setSelectedEntry(entry);
    setNewEntryDefaults({});
    setIsDialogOpen(true);
  };

  const handleAddClick = (date: Date) => {
    if (isSelectionMode) return;
    setSelectedEntry(null);
    setNewEntryDefaults({ planning_date: format(date, 'yyyy-MM-dd') });
    setIsDialogOpen(true);
  };

  const handleSave = async (input: PlanningEntryInput) => {
    if (selectedEntry) { await updateEntry(selectedEntry.id, input); }
    else { await createEntry(input); }
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
      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
      fetchEntries(startDate, endDate);
    }
    return success;
  };

  // Get driver name helper
  const getDriverName = useCallback((driverId: string | null) => {
    if (!driverId) return null;
    const driver = allDrivers.find(d => d.id === driverId);
    if (driver?.firstName && driver?.lastName) return `${driver.firstName} ${driver.lastName}`;
    return driver?.name || null;
  }, [allDrivers]);

  const getRelayDriverName = useCallback((driverId: string | null) => {
    if (!driverId) return null;
    const driver = allDrivers.find(d => d.id === driverId);
    if (driver?.firstName && driver?.lastName) return `${driver.firstName} ${driver.lastName}`;
    return driver?.name || null;
  }, [allDrivers]);

  const getClientName = useCallback((clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || client?.company || null;
  }, [clients]);

  // ---- Group entries into traction rows ----
  const tractionGroups = useMemo((): TractionGroup[] => {
    const map = new Map<string, PlanningEntry[]>();
    entries.forEach(e => {
      const key = tractionKey(e);
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    });

    const groups: TractionGroup[] = [];
    for (const [, groupEntries] of map) {
      const first = groupEntries[0];
      groups.push({
        tourName: first.tour_name || 'Sans nom',
        missionOrder: first.mission_order,
        sectorManager: first.sector_manager,
        driverName: getDriverName(first.driver_id),
        relayDriverName: getRelayDriverName(first.relay_driver_id),
        entries: groupEntries,
      });
    }

    // Sort by tour name
    groups.sort((a, b) => a.tourName.localeCompare(b.tourName));
    return groups;
  }, [entries, getDriverName, getRelayDriverName]);

  // Helper: get the entry for a specific day within a traction group
  const getGroupEntryForDay = (group: TractionGroup, date: Date): PlanningEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return group.entries.find(e => e.planning_date === dateStr);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Planning</h1>
          <p className="text-muted-foreground">
            Gérez les missions de vos tractions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="default" size="sm" onClick={() => setIsTourDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une tournée
          </Button>

          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
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
              <><Check className="h-4 w-4" /> Terminer</>
            ) : (
              <><Copy className="h-4 w-4" /> Sélectionner</>
            )}
          </Button>

          <div className="h-6 w-px bg-border mx-2" />

          <Button variant="outline" size="sm" onClick={handleToday}>Aujourd'hui</Button>
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
          ) : tractionGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
              <p>Aucune traction pour cette semaine.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsTourDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter une tournée
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Importer Excel
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="min-w-[1100px]">
                {/* Header */}
                <div className="grid grid-cols-[200px_120px_120px_repeat(6,1fr)] border-b bg-muted/50 sticky top-0 z-10">
                  <div className="p-3 font-medium border-r">Traction</div>
                  <div className="p-3 font-medium border-r text-xs text-center">Conducteur</div>
                  <div className="p-3 font-medium border-r text-xs text-center">Resp. secteur</div>
                  {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={i}
                        className={cn("p-3 text-center border-r last:border-r-0", isToday && "bg-primary/10")}
                      >
                        <div className="font-medium">{format(day, 'EEEE', { locale: fr })}</div>
                        <div className={cn("text-sm", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                          {format(day, 'd MMM', { locale: fr })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Traction rows */}
                {tractionGroups.map((group, gi) => (
                  <div
                    key={gi}
                    className="grid grid-cols-[200px_120px_120px_repeat(6,1fr)] border-b last:border-b-0 hover:bg-muted/5"
                  >
                    {/* Traction name + ODM tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="p-3 border-r bg-muted/30 flex flex-col justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            const entry = group.entries[0];
                            if (entry) handleEntryClick(entry);
                          }}
                        >
                          <div className="font-medium truncate" title={group.tourName}>
                            🚚 {group.tourName}
                          </div>
                          {group.missionOrder && (
                            <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                              📋 {group.missionOrder.slice(0, 80)}…
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {group.missionOrder && (
                        <TooltipContent side="right" className="max-w-md whitespace-pre-line text-xs max-h-80 overflow-y-auto">
                          <p className="font-semibold mb-1">Ordre de mission</p>
                          {group.missionOrder}
                        </TooltipContent>
                      )}
                    </Tooltip>

                    {/* Conducteur (titulaire) */}
                    <div className="p-2 border-r bg-muted/10 flex items-center justify-center">
                      <div className="text-xs text-center truncate">
                        {group.driverName ? (
                          <span className="text-foreground">👤 {group.driverName}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>

                    {/* Resp. secteur */}
                    <div className="p-2 border-r bg-muted/10 flex items-center justify-center">
                      <div className="text-xs text-center truncate" title={group.sectorManager || ''}>
                        {group.sectorManager ? (
                          <span className="text-foreground">{group.sectorManager}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>

                    {/* Day cells */}
                    {weekDays.map((day, di) => {
                      const dayEntry = getGroupEntryForDay(group, day);
                      const isToday = isSameDay(day, new Date());
                      const isSelected = dayEntry ? selectedEntryIds.has(dayEntry.id) : false;

                      return (
                        <div
                          key={di}
                          className={cn(
                            "min-h-[80px] p-2 border-r last:border-r-0 relative group cursor-pointer hover:bg-muted/20 transition-colors",
                            isToday && "bg-primary/5"
                          )}
                          onClick={() => {
                            if (dayEntry) handleEntryClick(dayEntry);
                            else handleAddClick(day);
                          }}
                        >
                          {dayEntry ? (
                            <div
                              className={cn(
                                "p-2 rounded-md text-xs bg-primary/10 text-foreground",
                                isSelectionMode && isSelected && "ring-2 ring-primary"
                              )}
                            >
                              {isSelectionMode && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleEntrySelection(dayEntry.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="mb-1"
                                />
                              )}

                              {/* Time */}
                              {dayEntry.start_time && (
                                <div className="font-medium mb-0.5 text-[10px] opacity-70">
                                  {dayEntry.start_time.slice(0, 5)}
                                  {dayEntry.end_time && ` - ${dayEntry.end_time.slice(0, 5)}`}
                                </div>
                              )}

                              {/* Notes = Excel day cell content (driver name / text) */}
                              {dayEntry.notes ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="font-semibold truncate cursor-help" title={dayEntry.notes}>
                                      {dayEntry.notes}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-sm text-xs">
                                    {dayEntry.notes}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="text-muted-foreground italic text-[10px]">—</div>
                              )}

                              {/* Client */}
                              {dayEntry.client_id && (
                                <div className="text-[10px] opacity-70 truncate mt-0.5">
                                  {getClientName(dayEntry.client_id)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center h-full opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
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
        vehicles={vehicles.filter(v => v.isActive && v.type === 'tracteur')}
        onSave={handleSave}
        onDelete={selectedEntry ? handleDelete : undefined}
        onApplyVehicleToTour={applyVehicleToTour}
        onDeleteTourInWeek={selectedEntry?.tour_name ? (tourName) => {
          void deleteTourInWeek(tourName, currentWeekStart);
        } : undefined}
      />

      <AddTourDialog
        open={isTourDialogOpen}
        onOpenChange={setIsTourDialogOpen}
        clients={clients}
        drivers={allDrivers}
        vehicles={vehicles.filter(v => v.isActive && v.type === 'tracteur')}
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
        vehicles={vehicles.filter(v => v.isActive && v.type === 'tracteur')}
        drivers={allDrivers}
        clients={clients}
        weekStartDate={currentWeekStart}
        onAutoCreateClient={autoCreateClient}
        onImport={async (importEntries, onProgress) => {
          const ok = await importExcelPlanningWeek(importEntries, currentWeekStart, onProgress);
          if (ok) {
            await new Promise(r => setTimeout(r, 500));
            const startDate = format(currentWeekStart, 'yyyy-MM-dd');
            const endDate = format(addDays(currentWeekStart, 5), 'yyyy-MM-dd');
            await fetchEntries(startDate, endDate);
          }
          return ok;
        }}
      />
    </div>
  );
}
