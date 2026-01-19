import { X, RefreshCw, Bell, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAUpdates } from '@/hooks/usePWAUpdates';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function UpdateNotification() {
  const { latestUpdate, showNotification, dismissUpdate } = usePWAUpdates();

  if (!showNotification || !latestUpdate) {
    return null;
  }

  const handleRefresh = () => {
    // Store the new version before refreshing
    if (latestUpdate) {
      localStorage.setItem('optiflow_current_version', latestUpdate.version);
      dismissUpdate(latestUpdate.id);
    }
    // Force a hard refresh to get the latest version
    window.location.reload();
  };

  const handleDismiss = () => {
    dismissUpdate(latestUpdate.id);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={`rounded-lg border shadow-lg p-4 ${
        latestUpdate.is_critical 
          ? 'bg-orange-500/10 border-orange-500/30' 
          : 'bg-primary/10 border-primary/30'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${
            latestUpdate.is_critical 
              ? 'bg-orange-500/20 text-orange-600' 
              : 'bg-primary/20 text-primary'
          }`}>
            {latestUpdate.is_critical ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-foreground">
                Nouvelle version disponible
              </h4>
              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                v{latestUpdate.version}
              </span>
              {latestUpdate.is_critical && (
                <span className="text-xs bg-orange-500/20 text-orange-600 px-1.5 py-0.5 rounded font-medium">
                  Important
                </span>
              )}
            </div>
            
            {latestUpdate.release_notes && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {latestUpdate.release_notes}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground mb-3">
              Publiée le {format(new Date(latestUpdate.pub_date), 'dd MMM yyyy', { locale: fr })}
            </p>
            
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant={latestUpdate.is_critical ? "destructive" : "gradient"}
                onClick={handleRefresh}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Actualiser maintenant
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleDismiss}
              >
                Plus tard
              </Button>
            </div>
          </div>
          
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
