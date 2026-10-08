import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyUsersManager } from '@/components/admin/CompanyUsersManager';
import { CompanyDataStats } from '@/components/admin/CompanyDataStats';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { UserFeatureOverrides } from '@/components/admin/UserFeatureOverrides';
import { CompanyDetailPanel } from '@/components/admin/CompanyDetailPanel';
import { CompanyMergeManager } from '@/components/admin/CompanyMergeManager';

interface AdminCompaniesTabProps {
  getAdminToken: () => string | null;
  fetchLicenses: () => void;
}

/**
 * Onglet "Sociétés" : utilisateurs, détails, statistiques, accès et
 * fusion de sociétés, plus le dialogue de création. Extrait de
 * src/pages/Admin.tsx pour alléger ce fichier — comportement identique.
 * L'état d'ouverture du dialogue de création est désormais local à cet
 * onglet (il n'était utilisé que là dans le fichier d'origine).
 */
export function AdminCompaniesTab({ getAdminToken, fetchLicenses }: AdminCompaniesTabProps) {
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Gestion des Sociétés</h2>
          <p className="text-sm text-muted-foreground">Utilisateurs, données et permissions</p>
        </div>
        <Button onClick={() => setCreateCompanyOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Créer une société
        </Button>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="data">Statistiques</TabsTrigger>
          <TabsTrigger value="access">Accès</TabsTrigger>
          <TabsTrigger value="merge">Fusion</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-4">
          <CompanyUsersManager getAdminToken={getAdminToken} />
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <CompanyDetailPanel getAdminToken={getAdminToken} />
        </TabsContent>
        <TabsContent value="data" className="mt-4">
          <CompanyDataStats getAdminToken={getAdminToken} />
        </TabsContent>
        <TabsContent value="access" className="mt-4">
          <UserFeatureOverrides getAdminToken={getAdminToken} />
        </TabsContent>
        <TabsContent value="merge" className="mt-4">
          <CompanyMergeManager getAdminToken={getAdminToken} />
        </TabsContent>
      </Tabs>

      <CreateCompanyDialog
        open={createCompanyOpen}
        onOpenChange={setCreateCompanyOpen}
        getAdminToken={getAdminToken}
        onCompanyCreated={fetchLicenses}
      />
    </div>
  );
}
