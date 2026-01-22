import { useState } from 'react';
import { format } from 'date-fns';
import {
  Bug,
  Check,
  X,
  Clock,
  Database,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Truck,
  Users,
  Coins,
  Container,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { SyncOperation, RealtimeStatus } from '@/hooks/useSyncDebug';

interface SyncDebugPanelProps {
  operations: SyncOperation[];
  realtimeStatus: Map<string, RealtimeStatus>;
  licenseId: string | null;
  userId: string | null;
  onClear: () => void;
  onReloadSection: (section: 'vehicles' | 'drivers' | 'charges' | 'trailers') => Promise<void>;
  isReloading: Record<string, boolean>;
}

const TABLE_ICONS: Record<string, React.ElementType> = {
  user_vehicles: Truck,
  user_drivers: Users,
  user_charges: Coins,
  user_trailers: Container,
};

const TABLE_LABELS: Record<string, string> = {
  user_vehicles: 'Véhicules',
  user_drivers: 'Conducteurs',
  user_charges: 'Charges',
  user_trailers: 'Remorques',
  saved_tours: 'Tournées',
  trips: 'Trajets',
  clients: 'Clients',
  quotes: 'Devis',
  company_settings: 'Paramètres',
};

export function SyncDebugPanel({
  operations,
  realtimeStatus,
  licenseId,
  userId,
  onClear,
  onReloadSection,
  isReloading,
}: SyncDebugPanelProps) {
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isRealtimeOpen, setIsRealtimeOpen] = useState(true);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié`);
  };

  const getStatusColor = (status: RealtimeStatus['status']) => {
    switch (status) {
      case 'SUBSCRIBED':
        return 'bg-green-500/20 text-green-600 border-green-500/30';
      case 'CLOSED':
        return 'bg-muted text-muted-foreground border-muted';
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30';
    }
  };

  const getStatusIcon = (status: RealtimeStatus['status']) => {
    switch (status) {
      case 'SUBSCRIBED':
        return <Wifi className="w-3 h-3" />;
      case 'CLOSED':
        return <WifiOff className="w-3 h-3" />;
      case 'CHANNEL_ERROR':
      case 'TIMED_OUT':
        return <X className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const sections = [
    { key: 'vehicles' as const, label: 'Véhicules', icon: Truck },
    { key: 'drivers' as const, label: 'Conducteurs', icon: Users },
    { key: 'charges' as const, label: 'Charges', icon: Coins },
    { key: 'trailers' as const, label: 'Remorques', icon: Container },
  ];

  return (
    <div className="space-y-4">
      {/* Context Info */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Database className="w-3 h-3" />
          Contexte
        </h4>
        <div className="grid grid-cols-1 gap-1.5">
          <div className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
            <span className="text-muted-foreground">License ID</span>
            <div className="flex items-center gap-1">
              <code className="font-mono text-[10px] truncate max-w-[120px]">
                {licenseId || 'null'}
              </code>
              {licenseId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(licenseId, 'License ID')}
                >
                  <Copy className="w-2.5 h-2.5" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
            <span className="text-muted-foreground">User ID</span>
            <div className="flex items-center gap-1">
              <code className="font-mono text-[10px] truncate max-w-[120px]">
                {userId || 'null'}
              </code>
              {userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(userId, 'User ID')}
                >
                  <Copy className="w-2.5 h-2.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Reload per section */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          Recharger depuis le cloud
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {sections.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 justify-start"
              onClick={() => void onReloadSection(key)}
              disabled={isReloading[key]}
            >
              {isReloading[key] ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}
              {label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Realtime Status */}
      <Collapsible open={isRealtimeOpen} onOpenChange={setIsRealtimeOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between h-7 px-2">
            <span className="text-xs font-medium flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              État Realtime ({realtimeStatus.size} tables)
            </span>
            {isRealtimeOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="space-y-1">
            {Array.from(realtimeStatus.entries()).map(([table, status]) => (
              <div
                key={table}
                className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1"
              >
                <span className="truncate">{TABLE_LABELS[table] || table}</span>
                <div className="flex items-center gap-2">
                  {status.eventCount > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {status.eventCount} evt
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${getStatusColor(status.status)}`}
                  >
                    {getStatusIcon(status.status)}
                    {status.status}
                  </Badge>
                </div>
              </div>
            ))}
            {realtimeStatus.size === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Aucune souscription active
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Operations Log */}
      <Collapsible open={isOperationsOpen} onOpenChange={setIsOperationsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between h-7 px-2">
            <span className="text-xs font-medium flex items-center gap-1">
              <Bug className="w-3 h-3" />
              Opérations ({operations.length})
            </span>
            {isOperationsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={onClear}
              disabled={operations.length === 0}
            >
              <Trash2 className="w-3 h-3" />
              Effacer
            </Button>
          </div>
          <ScrollArea className="h-[150px]">
            <div className="space-y-1">
              {operations.map((op) => {
                const Icon = TABLE_ICONS[op.table] || Database;
                return (
                  <div
                    key={op.id}
                    className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${
                      op.success ? 'bg-muted/30' : 'bg-destructive/10'
                    }`}
                  >
                    <Icon className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1 py-0 h-4 ${
                            op.operation === 'upsert'
                              ? 'border-blue-500/50 text-blue-600'
                              : op.operation === 'select'
                              ? 'border-green-500/50 text-green-600'
                              : 'border-red-500/50 text-red-600'
                          }`}
                        >
                          {op.operation.toUpperCase()}
                        </Badge>
                        <span className="truncate">{TABLE_LABELS[op.table] || op.table}</span>
                        <span className="text-muted-foreground">×{op.count}</span>
                        {op.success ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-destructive" />
                        )}
                      </div>
                      {op.error && (
                        <p className="text-[10px] text-destructive truncate mt-0.5">{op.error}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {format(op.timestamp, 'HH:mm:ss')}
                    </span>
                  </div>
                );
              })}
              {operations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucune opération enregistrée
                </p>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
