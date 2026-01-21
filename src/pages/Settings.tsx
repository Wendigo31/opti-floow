import { Settings as SettingsIcon, Bell, History, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { LicenseSyncSettings } from '@/components/settings/LicenseSyncSettings';
import { ActivityHistory } from '@/components/shared/ActivityHistory';

export default function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="text-muted-foreground">Personnalisez votre expérience OptiFlow</p>
        </div>
      </div>

      <Tabs defaultValue="license" className="space-y-6">
        <TabsList>
          <TabsTrigger value="license" className="gap-2">
            <Shield className="w-4 h-4" />
            Licence
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <History className="w-4 h-4" />
            Activité équipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="license" className="space-y-6">
          <LicenseSyncSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
