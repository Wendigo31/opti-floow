import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Upload, Search, X } from 'lucide-react';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePlanning } from '@/hooks/usePlanning';
import { useCloudVehicles } from '@/hooks/useCloudVehicles';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useClients } from '@/hooks/useClients';
import { AddTourDialog } from '@/components/planning/AddTourDialog';
import { ImportPlanningDialog } from '@/components/planning/ImportPlanningDialog';
import { PlanningFilters } from '@/components/planning/PlanningFilters';
import { PlanningRowDetailPanel } from '@/components/planning/PlanningRowDetailPanel';
import type { PlanningEntry, PlanningEntryInput } from '@/types/planning';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useLicenseContext, getLicenseId } from '@/context/LicenseContext';
import { cn } from '@/lib/utils';
import { usePlanningImport } from '@/context/PlanningImportContext';
import { UncreatedDriversBanner } from '@/components/planning/UncreatedDriversBanner';

const DAY_COLUMNS = [
  { label: 'Lundi', idx: 0 },
  { label: 'Mardi', idx: 1 },
  { label: 'Mercredi', idx: 2 },
  { label: 'Jeudi', idx: 3 },
  { label: 'Vendredi', idx: 4 },
  { label: 'Samedi', idx: 5 },
  { label: 'Dim. soir', idx: 6 },
];

/** Compound key for grouping entries into traction rows */
function tractionKey(e: PlanningEntry): string {
  return `${e.tour_name || ''}|||${e.mission_order || ''}`;
}

interface TractionGroup {
  tourName: string;
  missionOrder: string | null;
  sectorManager: string | null;
  clientId: string | null;
  driverId: string | null;
  entries: PlanningEntry[];
}

export default function Planning() {
  const { licenseId } = useLicenseContext();
  const { progress: importProgress } = usePlanningImport();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Detail panel
  const [selectedGroup, setSelectedGroup] = useState<TractionGroup | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Filters
  const [filterSector, setFilterSector] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry, createTour, importExcelPlanningWeek, deleteTourInWeek } = usePlanning();
  const { vehicles, fetchVehicles } = useCloudVehicles();
  const { cdiDrivers, cddDrivers, interimDrivers, fetchDrivers, createDriver } = useCloudDrivers();
  const { clients } = useClients();

  const allDrivers = useMemo(() => [...cdiDrivers, ...cddDrivers, ...interimDrivers], [cdiDrivers, cddDrivers, interimDrivers]);

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
      if (error) return null;
      return data?.id || null;
    } catch { return null; }
  }, [licenseId]);

  const handleQuickCreateDriver = useCallback(async (name: string) => {
    // Parse "LASTNAME FIRSTNAME" into parts
    const parts = name.trim().split(/\s+/);
    const lastName = parts[0] || name;
    const firstName = parts.slice(1).join(' ') || '';
    const driver: import('@/types').Driver = {
      id: `driver_${Date.now()}`,
      name: name.trim(),
      firstName,
      lastName,
      baseSalary: 0,
      hourlyRate: 12.5,
      hoursPerDay: 8,
      patronalCharges: 45,
      mealAllowance: 15.96,
      overnightAllowance: 0,
      workingDaysPerMonth: 21.67,
      sundayBonus: 0,
      nightBonus: 0,
      seniorityBonus: 0,
    };
    const ok = await createDriver(driver, 'cdi');
    if (ok) {
      fetchDrivers();
    }
  }, [createDriver, fetchDrivers]);

  // Mon-Sun (7 days)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  useEffect(() => {
    const startDate = format(currentWeekStart, 'yyyy-MM-dd');
    const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
    fetchEntries(startDate, endDate);
  }, [currentWeekStart, fetchEntries]);

  // Re-fetch when background import completes
  useEffect(() => {
    if (importProgress.completedAt > 0) {
      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
      // Force refetch to bypass any in-progress guard
      const timer = setTimeout(() => fetchEntries(startDate, endDate, true), 500);
      return () => clearTimeout(timer);
    }
  }, [importProgress.completedAt, currentWeekStart, fetchEntries]);

  useEffect(() => {
    fetchVehicles();
    fetchDrivers();
  }, [fetchVehicles, fetchDrivers]);

  const handlePreviousWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getDriverDisplay = useCallback((driverId: string | null) => {
    if (!driverId) return null;
    const driver = allDrivers.find(d => d.id === driverId);
    if (!driver) return null;
    const name = driver.firstName && driver.lastName
      ? `${driver.firstName} ${driver.lastName}`
      : driver.name || '';
    return { name, type: '' };
  }, [allDrivers]);

  const getClientName = useCallback((clientId: string | null) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client?.name || client?.company || null;
  }, [clients]);

  // Build traction groups
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
        clientId: first.client_id,
        driverId: first.driver_id,
        entries: groupEntries,
      });
    }
    groups.sort((a, b) => a.tourName.localeCompare(b.tourName));
    return groups;
  }, [entries]);

  // Unique sector managers for filter
  const sectorManagers = useMemo(() => {
    const set = new Set<string>();
    tractionGroups.forEach(g => { if (g.sectorManager) set.add(g.sectorManager); });
    return Array.from(set).sort();
  }, [tractionGroups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tractionGroups.filter(g => {
      if (filterSector && g.sectorManager !== filterSector) return false;
      if (filterClient && g.clientId !== filterClient) return false;
      if (filterDay) {
        const dayIdx = DAY_COLUMNS.find(d => d.label === filterDay)?.idx;
        if (dayIdx !== undefined) {
          const dayDate = format(addDays(currentWeekStart, dayIdx), 'yyyy-MM-dd');
          const hasEntry = g.entries.some(e => e.planning_date === dayDate);
          if (!hasEntry) return false;
        }
      }
      if (q) {
        const clientName = getClientName(g.clientId) || '';
        const driverInfo = getDriverDisplay(g.driverId);
        const driverName = driverInfo?.name || '';
        // Search in: tour name, ODM, sector manager, client name, driver name, day notes
        const dayNotes = g.entries.map(e => e.notes || '').join(' ');
        const haystack = [
          g.tourName,
          g.missionOrder || '',
          g.sectorManager || '',
          clientName,
          driverName,
          dayNotes,
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tractionGroups, filterSector, filterClient, filterDay, currentWeekStart, searchQuery, getClientName, getDriverDisplay]);

  const getGroupEntryForDay = (group: TractionGroup, date: Date): PlanningEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return group.entries.find(e => e.planning_date === dateStr);
  };

  const handleRowClick = (group: TractionGroup) => {
    setSelectedGroup(group);
    setIsDetailOpen(true);
  };

  const dayFilterLabels = DAY_COLUMNS.map(d => d.label);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Planning</h1>
          <p className="text-muted-foreground text-sm">Cliquez sur une ligne pour gérer la traction</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="default" size="sm" onClick={() => setIsTourDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Ajouter une tournée
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> Importer Excel
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          <Button variant="outline" size="sm" onClick={handleToday}>Aujourd'hui</Button>
          <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[200px] text-center font-medium">
            <span className="flex items-center justify-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4" />
              {format(currentWeekStart, "'Semaine du' d MMMM yyyy", { locale: fr })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <PlanningFilters
        sectorManagers={sectorManagers}
        clients={clients}
        days={dayFilterLabels}
        selectedSector={filterSector}
        selectedClient={filterClient}
        selectedDay={filterDay}
        onSectorChange={setFilterSector}
        onClientChange={setFilterClient}
        onDayChange={setFilterDay}
      />

      {/* Uncreated drivers banner */}
      <UncreatedDriversBanner drivers={allDrivers} onCreateDriver={handleQuickCreateDriver} />

      {/* Search bar + count */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ligne, un conducteur, un ODM…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Badge variant="secondary" className="text-xs whitespace-nowrap">
          {filteredGroups.length} ligne{filteredGroups.length > 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Grid */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
              <p>Aucune traction pour cette semaine.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsTourDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Importer
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="min-w-[1200px]">
                {/* Header row */}
                <div className="grid grid-cols-[140px_140px_160px_140px_repeat(7,1fr)] border-b bg-muted/50 sticky top-0 z-10">
                  <div className="p-2.5 font-medium text-xs border-r">Resp. secteur</div>
                  <div className="p-2.5 font-medium text-xs border-r">Client</div>
                  <div className="p-2.5 font-medium text-xs border-r">Ligne</div>
                  <div className="p-2.5 font-medium text-xs border-r">Titulaire</div>
                  {DAY_COLUMNS.map((col, i) => {
                    const day = weekDays[col.idx];
                    const isToday = day ? isSameDay(day, new Date()) : false;
                    return (
                      <div
                        key={i}
                        className={cn("p-2 text-center border-r last:border-r-0", isToday && "bg-primary/10")}
                      >
                        <div className="font-medium text-xs">{col.label}</div>
                        {day && (
                          <div className={cn("text-[10px]", isToday ? "text-primary font-bold" : "text-muted-foreground")}>
                            {format(day, 'd MMM', { locale: fr })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Rows */}
                {filteredGroups.map((group, gi) => {
                  const driverInfo = getDriverDisplay(group.driverId);
                  const clientName = getClientName(group.clientId);

                  return (
                    <div
                      key={gi}
                      className={cn(
                        "grid grid-cols-[140px_140px_160px_140px_repeat(7,1fr)] border-b last:border-b-0 cursor-pointer hover:bg-accent/40 transition-colors",
                        gi % 2 === 1 && "bg-muted/30"
                      )}
                      onClick={() => handleRowClick(group)}
                    >
                      {/* Resp. secteur */}
                      <div className="p-2 border-r flex items-center">
                        <span className="text-xs truncate">{group.sectorManager || <span className="text-muted-foreground">-</span>}</span>
                      </div>

                      {/* Client */}
                      <div className="p-2 border-r flex items-center">
                        <span className="text-xs truncate">{clientName || <span className="text-muted-foreground">-</span>}</span>
                      </div>

                      {/* Ligne */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="p-2 border-r flex items-center bg-muted/20">
                            <span className="text-xs font-medium truncate">🚚 {group.tourName}</span>
                          </div>
                        </TooltipTrigger>
                        {group.missionOrder && (
                          <TooltipContent side="right" className="max-w-md text-xs whitespace-pre-line max-h-60 overflow-y-auto">
                            <p className="font-semibold mb-1">Ordre de mission</p>
                            {group.missionOrder}
                          </TooltipContent>
                        )}
                      </Tooltip>

                      {/* Titulaire */}
                      <div className="p-2 border-r flex items-center">
                        {driverInfo ? (
                          <div className="text-xs truncate">
                            <span>👤 {driverInfo.name}</span>
                            {driverInfo.type && (
                              <Badge variant="outline" className="ml-1 text-[9px] px-1 py-0">{driverInfo.type}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>

                      {/* Day cells */}
                      {DAY_COLUMNS.map((col) => {
                        const day = weekDays[col.idx];
                        const dayEntry = day ? getGroupEntryForDay(group, day) : undefined;
                        const isToday = day ? isSameDay(day, new Date()) : false;

                        // Day cell shows the driver assigned for that specific day (from notes or driver_id)
                        let cellContent: string | null = null;
                        let cellDriverType: string | null = null;

                        if (dayEntry) {
                          // notes contain the driver name from Excel, or we use the driver_id
                          if (dayEntry.notes) {
                            cellContent = dayEntry.notes;
                          } else if (dayEntry.driver_id) {
                            const di = getDriverDisplay(dayEntry.driver_id);
                            if (di) {
                              cellContent = di.name;
                              cellDriverType = di.type;
                            }
                          }
                        }

                        return (
                          <div
                            key={col.idx}
                            className={cn(
                              "min-h-[56px] p-1.5 border-r last:border-r-0 flex items-center justify-center",
                              isToday && "bg-primary/5"
                            )}
                          >
                            {cellContent ? (
                              <div className="text-[11px] text-center leading-tight">
                                <span className="font-medium">{cellContent}</span>
                                {cellDriverType && (
                                  <Badge variant="outline" className="block mt-0.5 text-[8px] px-1 py-0 mx-auto w-fit">
                                    {cellDriverType}
                                  </Badge>
                                )}
                              </div>
                            ) : dayEntry ? (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail panel (Sheet) */}
      {selectedGroup && (
        <PlanningRowDetailPanel
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          entries={selectedGroup.entries}
          allEntries={entries}
          clients={clients}
          drivers={allDrivers}
          vehicles={vehicles.filter(v => v.isActive && v.type === 'tracteur')}
          onUpdateEntry={updateEntry}
          onDeleteEntry={deleteEntry}
          onDeleteTraction={async () => {
            const ok = await deleteTourInWeek(selectedGroup.tourName, currentWeekStart);
            if (ok) {
              const startDate = format(currentWeekStart, 'yyyy-MM-dd');
              const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
              await fetchEntries(startDate, endDate);
            }
            return ok;
          }}
          onSyncToSavedTour={async (savedTourId, updates) => {
            await supabase
              .from('saved_tours')
              .update({
                ...updates,
                stops: updates.stops ? (updates.stops as unknown as Json) : undefined,
              })
              .eq('id', savedTourId);
          }}
        />
      )}

      {/* Add Tour Dialog */}
      <AddTourDialog
        open={isTourDialogOpen}
        onOpenChange={setIsTourDialogOpen}
        clients={clients}
        drivers={allDrivers}
        vehicles={vehicles.filter(v => v.isActive && v.type === 'tracteur')}
        onSave={async (input, weeksAhead) => {
          const ok = await createTour(input, weeksAhead);
          if (ok) {
            const startDate = format(currentWeekStart, 'yyyy-MM-dd');
            const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
            await fetchEntries(startDate, endDate);
          }
          return ok;
        }}
      />

      {/* Import Dialog */}
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
            const endDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
            await fetchEntries(startDate, endDate);
          }
          return ok;
        }}
      />
    </div>
  );
}
