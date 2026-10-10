import { useState } from 'react';
import { TeamManagement } from '@/components/team/TeamManagement';
import { ExploitationMetricsConfig } from '@/components/team/ExploitationMetricsConfig';
import { RoleManagement } from '@/components/team/RoleManagement';
import { UserPermissionsManager } from '@/components/team/UserPermissionsManager';
import { useTeam } from '@/hooks/useTeam';
import { useLicense } from '@/hooks/useLicense';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Settings, UserCog, Shield, Lock } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function Team() {
  const { isDirection: isDirectionFromTeam, currentUserRole, isLoading: isTeamLoading } = useTeam();
  const { licenseData, isLoading: isLicenseLoading } = useLicense();
  const [activeTab, setActiveTab] = useState('team');

  const isLoading = isTeamLoading || isLicenseLoading;
  const isDirection = isDirectionFromTeam || licenseData?.userRole === 'direction';
  const isRH = currentUserRole === 'rh' || licenseData?.userRole === 'rh';

  if (isLoading) {
    return (
      <div className="w-full py-6 px-4 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Cet espace (gestion d'équipe/accès) est réservé à Direction et RH — accessible
  // directement via /team quel que soit l'espace affiché dans la barre latérale.
  if (!isDirection && !isRH) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Accès réservé</h2>
          <p className="text-muted-foreground max-w-sm">
            La gestion de l'équipe est réservée à la Direction et à la RH.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 px-4">
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
