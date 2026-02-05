 /**
  * CloudSyncIndicator - Indicateur de synchronisation en temps réel
  * Affiche le statut de connexion et l'activité récente des collègues
  */
 import { useState, useEffect } from 'react';
 import { Cloud, CloudOff, Users, Loader2 } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import {
   Popover,
   PopoverContent,
   PopoverTrigger,
 } from '@/components/ui/popover';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import { cn } from '@/lib/utils';
 import { formatDistanceToNow } from 'date-fns';
 import { fr } from 'date-fns/locale';
 
 interface UserActivity {
   userId: string;
   displayName: string;
   action: string;
   entityType: string;
   entityName?: string;
   timestamp: Date;
 }
 
 interface CloudSyncIndicatorProps {
   isConnected: boolean;
   isLoading: boolean;
   recentActivity: UserActivity[];
   className?: string;
 }
 
 const ACTION_LABELS: Record<string, string> = {
   create: 'a créé',
   update: 'a modifié',
   delete: 'a supprimé',
 };
 
 const ENTITY_LABELS: Record<string, string> = {
   vehicle: 'un véhicule',
   trailer: 'une remorque',
   driver: 'un conducteur',
   charge: 'une charge',
   client: 'un client',
   tour: 'une tournée',
   trip: 'un trajet',
   quote: 'un devis',
 };
 
 export function CloudSyncIndicator({
   isConnected,
   isLoading,
   recentActivity,
   className,
 }: CloudSyncIndicatorProps) {
   const [showPulse, setShowPulse] = useState(false);
 
   // Show pulse animation when new activity arrives
   useEffect(() => {
     if (recentActivity.length > 0) {
       setShowPulse(true);
       const timer = setTimeout(() => setShowPulse(false), 2000);
       return () => clearTimeout(timer);
     }
   }, [recentActivity]);
 
   return (
     <Popover>
       <PopoverTrigger asChild>
         <button
           className={cn(
             'relative flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
             'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20',
             className
           )}
         >
           {isLoading ? (
             <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
           ) : isConnected ? (
             <Cloud className="h-4 w-4 text-green-500" />
           ) : (
             <CloudOff className="h-4 w-4 text-destructive" />
           )}
           
           {recentActivity.length > 0 && (
             <Badge
               variant="secondary"
               className={cn(
                 'h-5 px-1.5 text-xs',
                 showPulse && 'animate-pulse bg-primary text-primary-foreground'
               )}
             >
               <Users className="h-3 w-3 mr-1" />
               {recentActivity.length}
             </Badge>
           )}
         </button>
       </PopoverTrigger>
       
       <PopoverContent className="w-80 p-0" align="end">
         <div className="p-3 border-b">
           <div className="flex items-center justify-between">
             <h4 className="font-semibold text-sm">Synchronisation Cloud</h4>
             <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
               {isConnected ? 'Connecté' : 'Hors ligne'}
             </Badge>
           </div>
           <p className="text-xs text-muted-foreground mt-1">
             Les modifications sont partagées en temps réel avec votre équipe
           </p>
         </div>
         
         <ScrollArea className="h-64">
           {recentActivity.length === 0 ? (
             <div className="p-4 text-center text-muted-foreground text-sm">
               Aucune activité récente
             </div>
           ) : (
             <div className="divide-y">
               {recentActivity.map((activity, index) => (
                 <div key={`${activity.userId}-${index}`} className="p-3 hover:bg-muted/50">
                   <div className="flex items-start gap-2">
                     <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                       {activity.displayName.charAt(0).toUpperCase()}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-sm">
                         <span className="font-medium">{activity.displayName}</span>{' '}
                         <span className="text-muted-foreground">
                           {ACTION_LABELS[activity.action] || activity.action}{' '}
                           {ENTITY_LABELS[activity.entityType] || activity.entityType}
                         </span>
                       </p>
                       {activity.entityName && (
                         <p className="text-xs text-muted-foreground truncate">
                           {activity.entityName}
                         </p>
                       )}
                       <p className="text-xs text-muted-foreground mt-0.5">
                         {formatDistanceToNow(activity.timestamp, { 
                           addSuffix: true, 
                           locale: fr 
                         })}
                       </p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </ScrollArea>
       </PopoverContent>
     </Popover>
   );
 }