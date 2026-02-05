 import { Plus } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { Checkbox } from '@/components/ui/checkbox';
 import type { PlanningEntry } from '@/types/planning';
 import { planningStatusColors } from '@/types/planning';
 import { cn } from '@/lib/utils';
 
 interface PlanningCellProps {
   date: Date;
   entries: PlanningEntry[];
   isToday: boolean;
   onCellClick: () => void;
   onEntryClick: (entry: PlanningEntry) => void;
   getClientName: (clientId: string | null) => string | null;
   getDriverName: (driverId: string | null) => string | null;
   getRelayDriverName: (driverId: string | null) => string | null;
   isSelectionMode: boolean;
   selectedEntryIds: Set<string>;
   onToggleSelection: (entryId: string) => void;
 }
 
 export function PlanningCell({
   date,
   entries,
   isToday,
   onCellClick,
   onEntryClick,
   getClientName,
   getDriverName,
   getRelayDriverName,
   isSelectionMode,
   selectedEntryIds,
   onToggleSelection,
 }: PlanningCellProps) {
   return (
     <div 
       className={cn(
         "min-h-[100px] p-2 border-r last:border-r-0 relative group cursor-pointer hover:bg-muted/20 transition-colors",
         isToday && "bg-primary/5"
       )}
       onClick={(e) => {
         // Only trigger if clicking on the cell background, not on entries
         if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('cell-bg')) {
           if (!isSelectionMode) {
             onCellClick();
           }
         }
       }}
     >
       <div className="cell-bg absolute inset-0" />
       
       {/* Add button on hover */}
       {!isSelectionMode && (
         <Button
           variant="ghost"
           size="sm"
           className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
           onClick={(e) => {
             e.stopPropagation();
             onCellClick();
           }}
         >
           <Plus className="h-4 w-4" />
         </Button>
       )}
 
       {/* Entries */}
       <div className="relative z-10 space-y-1">
         {entries.map((entry) => {
           const clientName = getClientName(entry.client_id);
           const driverName = getDriverName(entry.driver_id);
           const relayDriverName = getRelayDriverName(entry.relay_driver_id);
           const isSelected = selectedEntryIds.has(entry.id);
           
           return (
             <div
               key={entry.id}
               className={cn(
                 "p-2 rounded-md text-xs cursor-pointer transition-all",
                 planningStatusColors[entry.status],
                 isSelectionMode && isSelected && "ring-2 ring-primary",
                 !isSelectionMode && "hover:ring-2 hover:ring-primary/50"
               )}
               onClick={(e) => {
                 e.stopPropagation();
                 onEntryClick(entry);
               }}
             >
               {/* Selection checkbox */}
               {isSelectionMode && (
                 <div className="flex items-center gap-2 mb-1">
                   <Checkbox
                     checked={isSelected}
                     onCheckedChange={() => onToggleSelection(entry.id)}
                     onClick={(e) => e.stopPropagation()}
                   />
                   {entry.tour_name && (
                     <span className="font-medium text-[10px] truncate">{entry.tour_name}</span>
                   )}
                 </div>
               )}
               
               {/* Tour name when not in selection mode */}
               {!isSelectionMode && entry.tour_name && (
                 <div className="font-semibold mb-1 truncate" title={entry.tour_name}>
                   🚚 {entry.tour_name}
                 </div>
               )}
               
               {/* Time */}
               {entry.start_time && (
                 <div className="font-medium mb-1">
                   {entry.start_time.slice(0, 5)}
                   {entry.end_time && ` - ${entry.end_time.slice(0, 5)}`}
                 </div>
               )}
               
               {/* Client */}
               {clientName && (
                 <div className="font-medium truncate" title={clientName}>
                   {clientName}
                 </div>
               )}
               
               {/* Driver */}
               {driverName && (
                 <div className="text-[10px] opacity-80 truncate" title={driverName}>
                   👤 {driverName}
                 </div>
               )}
               
               {/* Relay Driver */}
               {relayDriverName && (
                 <div className="text-[10px] opacity-80 truncate" title={`Relais: ${relayDriverName}`}>
                   🔄 {relayDriverName}
                   {entry.relay_time && ` (${entry.relay_time.slice(0, 5)})`}
                 </div>
               )}
               
               {/* Mission preview */}
               {!isSelectionMode && entry.mission_order && (
                 <div className="mt-1 text-[10px] opacity-70 line-clamp-2" title={entry.mission_order}>
                   📋 {entry.mission_order}
                 </div>
               )}

                {/* Notes preview (used for day-cell placeholders from Excel) */}
                {!isSelectionMode && !entry.mission_order && entry.notes && (
                  <div className="mt-1 text-[10px] opacity-70 line-clamp-2" title={entry.notes}>
                    📝 {entry.notes}
                  </div>
                )}
               
               {/* Addresses preview */}
               {!isSelectionMode && (entry.origin_address || entry.destination_address) && (
                 <div className="mt-1 text-[10px] opacity-70 truncate">
                   {entry.origin_address && entry.destination_address 
                     ? `${entry.origin_address.split(',')[0]} → ${entry.destination_address.split(',')[0]}`
                     : entry.origin_address || entry.destination_address
                   }
                 </div>
               )}
             </div>
           );
         })}
       </div>
     </div>
   );
 }