import { useState } from 'react';
import { TeamManagement } from '@/components/team/TeamManagement';
import { ExploitationMetricsConfig } from '@/components/team/ExploitationMetricsConfig';
import { RoleManagement } from '@/components/team/RoleManagement';
import { UserPermissionsManager } from '@/components/team/UserPermissionsManager';
import { useTeam } from '@/hooks/useTeam';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, UserCog, Shield } from 'lucide-react';

export default function Team() {
  const { isDirection } = useTeam();
  const [activeTab, setActiveTab] = useState('team');

  return (
    <div className="container mx-auto py-6 px-4 max-w-5xl">
      {isDirection ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Équipe</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Rôles</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Métriques</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="roles">
            <RoleManagement />
          </TabsContent>

          <TabsContent value="permissions">
            <UserPermissionsManager />
          </TabsContent>

          <TabsContent value="metrics">
            <ExploitationMetricsConfig />
          </TabsContent>
        </Tabs>
      ) : (
        <TeamManagement />
      )}
    </div>
  );
}
