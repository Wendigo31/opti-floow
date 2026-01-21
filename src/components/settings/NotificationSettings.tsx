import { useState, useEffect } from 'react';
import { Bell, BellOff, Truck, Route, Container, Users, Building2, FileText, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export interface NotificationPreferences {
  enabled: boolean;
  vehicles: boolean;
  trailers: boolean;
  tours: boolean;
  drivers: boolean;
  clients: boolean;
  quotes: boolean;
  trips: boolean;
  showOwnActions: boolean;
}

const defaultPreferences: NotificationPreferences = {
  enabled: true,
  vehicles: true,
  trailers: true,
  tours: true,
  drivers: true,
  clients: true,
  quotes: true,
  trips: true,
  showOwnActions: false,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useLocalStorage<NotificationPreferences>(
    'optiflow_notification_prefs',
    defaultPreferences
  );

  return { preferences, setPreferences };
}

export function NotificationSettings() {
  const { preferences, setPreferences } = useNotificationPreferences();

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences({ ...preferences, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications temps réel
        </CardTitle>
        <CardDescription>
          Configurez les notifications lorsqu'un collègue modifie des données
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
          <div className="flex items-center gap-3">
            {preferences.enabled ? (
              <Bell className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="notifications-enabled" className="text-base font-medium">
                Activer les notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des alertes pour les modifications de l'équipe
              </p>
            </div>
          </div>
          <Switch
            id="notifications-enabled"
            checked={preferences.enabled}
            onCheckedChange={(checked) => updatePreference('enabled', checked)}
          />
        </div>

        {/* Category toggles */}
        <div className={preferences.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Catégories</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-vehicles">Véhicules</Label>
              </div>
              <Switch
                id="notif-vehicles"
                checked={preferences.vehicles}
                onCheckedChange={(checked) => updatePreference('vehicles', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Container className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-trailers">Remorques</Label>
              </div>
              <Switch
                id="notif-trailers"
                checked={preferences.trailers}
                onCheckedChange={(checked) => updatePreference('trailers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Route className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-tours">Tournées</Label>
              </div>
              <Switch
                id="notif-tours"
                checked={preferences.tours}
                onCheckedChange={(checked) => updatePreference('tours', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-drivers">Conducteurs</Label>
              </div>
              <Switch
                id="notif-drivers"
                checked={preferences.drivers}
                onCheckedChange={(checked) => updatePreference('drivers', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-clients">Clients</Label>
              </div>
              <Switch
                id="notif-clients"
                checked={preferences.clients}
                onCheckedChange={(checked) => updatePreference('clients', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-quotes">Devis</Label>
              </div>
              <Switch
                id="notif-quotes"
                checked={preferences.quotes}
                onCheckedChange={(checked) => updatePreference('quotes', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="notif-trips">Trajets</Label>
              </div>
              <Switch
                id="notif-trips"
                checked={preferences.trips}
                onCheckedChange={(checked) => updatePreference('trips', checked)}
              />
            </div>
          </div>
        </div>

        {/* Show own actions */}
        <div className={`border-t pt-4 ${preferences.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-own-actions" className="text-sm font-medium">
                Afficher mes propres actions
              </Label>
              <p className="text-xs text-muted-foreground">
                Voir les notifications pour vos propres modifications
              </p>
            </div>
            <Switch
              id="show-own-actions"
              checked={preferences.showOwnActions}
              onCheckedChange={(checked) => updatePreference('showOwnActions', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
