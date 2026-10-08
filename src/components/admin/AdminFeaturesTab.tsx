import { Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FeatureEditor } from '@/components/admin/FeatureEditor';
import { AccessRequestsManager } from '@/components/admin/AccessRequestsManager';
import { SchemaSyncManager } from '@/components/admin/SchemaSyncManager';
import type { LicenseFeatures } from '@/types/features';
import type { License } from '@/types/admin';

interface AdminFeaturesTabProps {
  licenses: License[];
  selectedLicenseForFeatures: License | null;
  setSelectedLicenseForFeatures: (license: License | null) => void;
  handleSaveFeatures: (features: Partial<LicenseFeatures>) => void;
  savingFeatures: boolean;
  getAdminToken: () => string | null;
  getPlanIcon: (plan: string | null) => JSX.Element;
}

/**
 * Onglet "Fonctionnalités & Demandes" : édition des fonctionnalités par
 * licence, demandes d'accès, et synchronisation de schéma. Extrait de
 * src/pages/Admin.tsx pour alléger ce fichier — comportement identique.
 */
export function AdminFeaturesTab({
  licenses,
  selectedLicenseForFeatures,
  setSelectedLicenseForFeatures,
  handleSaveFeatures,
  savingFeatures,
  getAdminToken,
  getPlanIcon,
}: AdminFeaturesTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Fonctionnalités & Demandes</h2>
        <p className="text-sm text-muted-foreground">Configurez les fonctionnalités et gérez les demandes</p>
      </div>

      <Tabs defaultValue="license-features" className="w-full">
        <TabsList>
          <TabsTrigger value="license-features">Par licence</TabsTrigger>
          <TabsTrigger value="requests">Demandes d'accès</TabsTrigger>
          <TabsTrigger value="schema">Schéma</TabsTrigger>
        </TabsList>
        <TabsContent value="license-features" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sélectionner une licence</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedLicenseForFeatures?.id || ''}
                onValueChange={(id) => setSelectedLicenseForFeatures(licenses.find(l => l.id === id) || null)}
              >
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder="Choisir une licence..." />
                </SelectTrigger>
                <SelectContent>
                  {licenses.map(license => (
                    <SelectItem key={license.id} value={license.id}>
                      <div className="flex items-center gap-2">
                        {getPlanIcon(license.plan_type)}
                        <span>{license.company_name || license.email}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {'optiflow'.toUpperCase()}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedLicenseForFeatures ? (
            <FeatureEditor
              planType={'optiflow'}
              currentFeatures={selectedLicenseForFeatures.features || null}
              onSave={handleSaveFeatures}
              saving={savingFeatures}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Sélectionnez une licence pour personnaliser ses fonctionnalités</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <AccessRequestsManager getAdminToken={getAdminToken} />
        </TabsContent>
        <TabsContent value="schema" className="mt-4">
          <SchemaSyncManager adminToken={getAdminToken() || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
