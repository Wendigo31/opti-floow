import { AlertTriangle, AlertCircle, Bell, BellOff, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useMarginAlerts, type MarginAlertSettings } from '@/hooks/useMarginAlerts';
import { cn } from '@/lib/utils';

interface MarginAlertIndicatorProps {
  currentMargin: number;
  profit: number;
  revenue: number;
  tripName?: string;
  showSettings?: boolean;
  compact?: boolean;
}

export function MarginAlertIndicator({
  currentMargin,
  profit,
  revenue,
  tripName,
  showSettings = false,
  compact = false,
}: MarginAlertIndicatorProps) {
  const { settings, updateSettings, checkMargin, getAlertSeverity, activeAlerts, dismissAlert, clearAlerts } = useMarginAlerts();

  const severity = getAlertSeverity(currentMargin);
  
  // Check and potentially trigger alert (silent check for UI display)
  const currentAlert = checkMargin(currentMargin, revenue, profit, tripName, true);

  if (!settings.enabled || severity === 'none') {
    return null;
  }

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        severity === 'critical' ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"
      )}>
        {severity === 'critical' ? (
          <AlertCircle className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        <span>
          {currentMargin < 0 ? 'Perte' : `Marge: ${currentMargin.toFixed(1)}%`}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border-2",
      severity === 'critical' 
        ? "bg-destructive/10 border-destructive/50" 
        : "bg-warning/10 border-warning/50"
    )}>
      <div className="flex items-center gap-3">
        {severity === 'critical' ? (
          <AlertCircle className="h-5 w-5 text-destructive" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-warning" />
        )}
        <div>
          <p className={cn(
            "font-medium text-sm",
            severity === 'critical' ? "text-destructive" : "text-warning"
          )}>
            {currentAlert?.message || `Marge faible: ${currentMargin.toFixed(1)}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            Seuil configuré : {settings.minMarginPercent}%
          </p>
        </div>
      </div>
      
      {showSettings && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <MarginAlertSettingsPanel settings={settings} onUpdate={updateSettings} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

interface MarginAlertSettingsPanelProps {
  settings: MarginAlertSettings;
  onUpdate: (settings: Partial<MarginAlertSettings>) => void;
}

export function MarginAlertSettingsPanel({ settings, onUpdate }: MarginAlertSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Alertes de marge</h4>
          <p className="text-xs text-muted-foreground">Configurez vos seuils d'alerte</p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(checked) => onUpdate({ enabled: checked })}
        />
      </div>

      {settings.enabled && (
        <>
          <div className="space-y-2">
            <Label htmlFor="minMargin">Seuil minimal de marge (%)</Label>
            <Input
              id="minMargin"
              type="number"
              min={0}
              max={100}
              value={settings.minMarginPercent}
              onChange={(e) => onUpdate({ minMarginPercent: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="alertNegative" className="cursor-pointer">
                Alerter si perte
              </Label>
              <Switch
                id="alertNegative"
                checked={settings.alertOnNegativeProfit}
                onCheckedChange={(checked) => onUpdate({ alertOnNegativeProfit: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="alertThreshold" className="cursor-pointer">
                Alerter sous le seuil
              </Label>
              <Switch
                id="alertThreshold"
                checked={settings.alertOnBelowThreshold}
                onCheckedChange={(checked) => onUpdate({ alertOnBelowThreshold: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showCalculator" className="cursor-pointer">
                Afficher dans le calculateur
              </Label>
              <Switch
                id="showCalculator"
                checked={settings.showInCalculator}
                onCheckedChange={(checked) => onUpdate({ showInCalculator: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="showDashboard" className="cursor-pointer">
                Afficher dans le dashboard
              </Label>
              <Switch
                id="showDashboard"
                checked={settings.showInDashboard}
                onCheckedChange={(checked) => onUpdate({ showInDashboard: checked })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface MarginAlertsListProps {
  maxItems?: number;
}

export function MarginAlertsList({ maxItems = 5 }: MarginAlertsListProps) {
  const { activeAlerts, dismissAlert, clearAlerts } = useMarginAlerts();

  if (activeAlerts.length === 0) {
    return null;
  }

  const displayAlerts = activeAlerts.slice(-maxItems);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertes récentes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={clearAlerts} className="h-6 text-xs">
            Tout effacer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "flex items-center justify-between p-2 rounded text-sm",
              alert.type === 'critical' ? "bg-destructive/10" : "bg-warning/10"
            )}
          >
            <div className="flex items-center gap-2">
              {alert.type === 'critical' ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning" />
              )}
              <span className="text-foreground">{alert.message}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
