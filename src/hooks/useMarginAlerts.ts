import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

export interface MarginAlertSettings {
  enabled: boolean;
  minMarginPercent: number; // Seuil minimal de marge (ex: 10%)
  alertOnNegativeProfit: boolean;
  alertOnBelowThreshold: boolean;
  showInCalculator: boolean;
  showInDashboard: boolean;
  soundEnabled: boolean;
}

export interface MarginAlert {
  id: string;
  type: 'negative' | 'below_threshold' | 'critical';
  message: string;
  currentMargin: number;
  threshold: number;
  tripName?: string;
  timestamp: Date;
  dismissed: boolean;
}

const DEFAULT_SETTINGS: MarginAlertSettings = {
  enabled: true,
  minMarginPercent: 10,
  alertOnNegativeProfit: true,
  alertOnBelowThreshold: true,
  showInCalculator: true,
  showInDashboard: true,
  soundEnabled: false,
};

export function useMarginAlerts() {
  const [settings, setSettings] = useLocalStorage<MarginAlertSettings>(
    'optiflow_margin_alert_settings',
    DEFAULT_SETTINGS
  );
  const [alerts, setAlerts] = useState<MarginAlert[]>([]);
  const [lastAlertShown, setLastAlertShown] = useState<string | null>(null);

  // Check margin and generate alerts
  const checkMargin = useCallback((
    currentMargin: number,
    revenue: number,
    profit: number,
    tripName?: string,
    silent = false
  ): MarginAlert | null => {
    if (!settings.enabled) return null;

    let alert: MarginAlert | null = null;
    const alertId = `margin-${Date.now()}`;

    // Critical: Negative profit
    if (settings.alertOnNegativeProfit && profit < 0) {
      alert = {
        id: alertId,
        type: 'critical',
        message: `Attention : Ce trajet génère une perte de ${Math.abs(profit).toFixed(2)} €`,
        currentMargin,
        threshold: 0,
        tripName,
        timestamp: new Date(),
        dismissed: false,
      };
    }
    // Below threshold
    else if (settings.alertOnBelowThreshold && currentMargin < settings.minMarginPercent && currentMargin >= 0) {
      alert = {
        id: alertId,
        type: currentMargin < settings.minMarginPercent / 2 ? 'critical' : 'below_threshold',
        message: `Marge faible : ${currentMargin.toFixed(1)}% (seuil: ${settings.minMarginPercent}%)`,
        currentMargin,
        threshold: settings.minMarginPercent,
        tripName,
        timestamp: new Date(),
        dismissed: false,
      };
    }
    // Negative margin
    else if (settings.alertOnNegativeProfit && currentMargin < 0) {
      alert = {
        id: alertId,
        type: 'negative',
        message: `Marge négative : ${currentMargin.toFixed(1)}%`,
        currentMargin,
        threshold: 0,
        tripName,
        timestamp: new Date(),
        dismissed: false,
      };
    }

    if (alert && !silent) {
      // Avoid duplicate alerts in quick succession
      const alertKey = `${alert.type}-${Math.round(currentMargin)}`;
      if (alertKey !== lastAlertShown) {
        setLastAlertShown(alertKey);
        setAlerts(prev => [...prev.slice(-9), alert!]); // Keep last 10 alerts

        // Show toast notification
        if (alert.type === 'critical' || alert.type === 'negative') {
          toast.error(alert.message, {
            description: tripName ? `Trajet: ${tripName}` : 'Trajet en cours',
            duration: 5000,
          });
        } else {
          toast.warning(alert.message, {
            description: tripName ? `Trajet: ${tripName}` : 'Trajet en cours',
            duration: 4000,
          });
        }

        // Play sound if enabled
        if (settings.soundEnabled) {
          try {
            const audio = new Audio('/alert-sound.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore autoplay errors
          } catch (e) {
            // Sound not available
          }
        }
      }
    }

    return alert;
  }, [settings, lastAlertShown]);

  // Get alert severity class
  const getAlertSeverity = useCallback((margin: number): 'none' | 'warning' | 'critical' => {
    if (!settings.enabled) return 'none';
    if (margin < 0) return 'critical';
    if (margin < settings.minMarginPercent / 2) return 'critical';
    if (margin < settings.minMarginPercent) return 'warning';
    return 'none';
  }, [settings]);

  // Dismiss an alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, dismissed: true } : a));
  }, []);

  // Clear all alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLastAlertShown(null);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<MarginAlertSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, [setSettings]);

  // Get active (non-dismissed) alerts
  const activeAlerts = alerts.filter(a => !a.dismissed);

  return {
    settings,
    updateSettings,
    alerts,
    activeAlerts,
    checkMargin,
    getAlertSeverity,
    dismissAlert,
    clearAlerts,
  };
}
