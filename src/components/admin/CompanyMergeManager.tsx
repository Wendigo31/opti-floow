import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  GitMerge, 
  Building2, 
  Users, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Check,
  ArrowRight,
  MapPin
} from 'lucide-react';

interface DuplicateGroup {
  siren: string;
  licenses: {
    id: string;
    license_code: string;
    email: string;
    company_name: string | null;
    address: string | null;
    city: string | null;
    postal_code: string | null;
    plan_type: string | null;
    is_active: boolean;
    created_at: string;
    user_count: number;
  }[];
}

interface Props {
  getAdminToken: () => string | null;
}

export function CompanyMergeManager({ getAdminToken }: Props) {
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeDialog, setMergeDialog] = useState<{
    open: boolean;
    group: DuplicateGroup | null;
    targetId: string | null;
  }>({ open: false, group: null, targetId: null });

  const fetchDuplicates = async () => {
    const token = getAdminToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'detect-duplicates', adminToken: token },
      });

      if (error) throw error;

      if (data?.success && data.duplicates) {
        setDuplicates(data.duplicates);
      }
    } catch (err) {
      console.error('Error fetching duplicates:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de détecter les doublons',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleMerge = async () => {
    if (!mergeDialog.group || !mergeDialog.targetId) return;

    const token = getAdminToken();
    if (!token) return;

    setIsMerging(true);
    try {
      const sourceIds = mergeDialog.group.licenses
        .filter(l => l.id !== mergeDialog.targetId)
        .map(l => l.id);

      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'merge-companies',
          adminToken: token,
          targetLicenseId: mergeDialog.targetId,
          sourceLicenseIds: sourceIds,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Fusion réussie',
          description: `${sourceIds.length} licence(s) fusionnée(s). Les anciens codes restent valides comme alias.`,
        });
        setMergeDialog({ open: false, group: null, targetId: null });
        fetchDuplicates();
      } else {
        throw new Error(data?.error || 'Erreur inconnue');
      }
    } catch (err: any) {
      console.error('Merge error:', err);
      toast({
        title: 'Erreur de fusion',
        description: err.message || 'Impossible de fusionner les sociétés',
        variant: 'destructive',
      });
    } finally {
      setIsMerging(false);
    }
  };

  const openMergeDialog = (group: DuplicateGroup, targetId: string) => {
    setMergeDialog({ open: true, group, targetId });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitMerge className="h-5 w-5" />
                Fusion / Déduplication
              </CardTitle>
              <CardDescription>
                Détectez et fusionnez les sociétés en double (même SIREN)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDuplicates} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : duplicates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="font-medium text-foreground">Aucun doublon détecté</p>
              <p className="text-sm">Toutes les sociétés ont un SIREN unique</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-6">
                {duplicates.map((group) => (
                  <Card key={group.siren} className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          <CardTitle className="text-base">
                            SIREN : <span className="font-mono">{group.siren}</span>
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                          {group.licenses.length} doublons
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Société</TableHead>
                            <TableHead>Code licence</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Adresse</TableHead>
                            <TableHead>Utilisateurs</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.licenses.map((license) => (
                            <TableRow key={license.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{license.company_name || '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {license.license_code}
                                </code>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {license.email}
                              </TableCell>
                              <TableCell>
                                {license.city ? (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3" />
                                    {license.city}
                                  </div>
                                ) : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{license.user_count}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={license.is_active ? 'default' : 'secondary'}>
                                  {license.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openMergeDialog(group, license.id)}
                                >
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Fusionner ici
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Merge confirmation dialog */}
      <AlertDialog open={mergeDialog.open} onOpenChange={(open) => !open && setMergeDialog({ open: false, group: null, targetId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GitMerge className="h-5 w-5" />
              Confirmer la fusion
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Vous allez fusionner {(mergeDialog.group?.licenses.length || 0) - 1} licence(s) vers la licence cible.
                </p>
                <div className="p-3 rounded-lg bg-muted space-y-2">
                  <p className="font-medium text-foreground">Ce qui va se passer :</p>
                  <ul className="text-sm space-y-1">
                    <li>• Tous les utilisateurs seront transférés vers la société cible</li>
                    <li>• Les données (tours, trajets, clients...) seront reliées à la nouvelle licence</li>
                    <li>• Les anciens codes de licence resteront valides comme alias</li>
                    <li>• Les anciennes licences seront désactivées mais conservées</li>
                  </ul>
                </div>
                <p className="text-amber-600 font-medium">
                  Cette action est irréversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMerging}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMerge} 
              disabled={isMerging}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isMerging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fusion en cours...
                </>
              ) : (
                <>
                  <GitMerge className="h-4 w-4 mr-2" />
                  Confirmer la fusion
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
