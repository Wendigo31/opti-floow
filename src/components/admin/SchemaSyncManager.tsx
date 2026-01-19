import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle2, AlertCircle, Database, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SchemaStatus {
  existing_columns: number;
  expected_columns: number;
  missing_columns: string[];
  missing_boolean: string[];
  missing_integer: string[];
  is_synchronized: boolean;
}

interface SchemaSyncManagerProps {
  adminToken?: string;
}

export function SchemaSyncManager({ adminToken }: SchemaSyncManagerProps) {
  const [status, setStatus] = useState<SchemaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const checkSchema = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-features-schema', {
        body: { action: 'check' },
      });

      if (error) throw error;

      if (data.success) {
        setStatus(data);
      } else {
        throw new Error(data.error || 'Erreur lors de la vérification');
      }
    } catch (error: any) {
      console.error('Schema check error:', error);
      toast.error('Erreur lors de la vérification du schéma');
    } finally {
      setLoading(false);
    }
  };

  const syncSchema = async () => {
    if (!adminToken) {
      toast.error('Token admin requis pour synchroniser');
      return;
    }

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-features-schema', {
        body: { 
          action: 'sync',
          adminToken,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message || 'Schéma synchronisé avec succès');
        // Refresh status
        await checkSchema();
      } else if (data.manual_sql) {
        // Show SQL for manual execution
        toast.error('Synchronisation automatique impossible. SQL à exécuter manuellement affiché.');
        console.log('Manual SQL:', data.manual_sql);
      } else {
        throw new Error(data.error || 'Erreur lors de la synchronisation');
      }
    } catch (error: any) {
      console.error('Schema sync error:', error);
      toast.error('Erreur lors de la synchronisation du schéma');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    checkSchema();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Synchronisation du schéma Features
            </CardTitle>
            <CardDescription>
              Vérifiez et synchronisez le schéma de la table license_features
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkSchema}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Actualiser</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !status ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : status ? (
          <>
            {/* Status indicator */}
            <div className="flex items-center gap-3">
              {status.is_synchronized ? (
                <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Synchronisé
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Non synchronisé
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {status.existing_columns} / {status.expected_columns} colonnes
              </span>
            </div>

            {/* Missing columns alert */}
            {status.missing_columns.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">
                    {status.missing_columns.length} colonne(s) manquante(s) :
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {status.missing_columns.map((col) => (
                      <Badge key={col} variant="outline" className="text-xs">
                        {col}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Sync button */}
            {!status.is_synchronized && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={syncSchema}
                  disabled={syncing || !adminToken}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Synchroniser le schéma
                </Button>
              </div>
            )}

            {/* Success state */}
            {status.is_synchronized && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Le schéma de la table license_features est à jour avec toutes les fonctionnalités définies.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Impossible de vérifier le statut du schéma. Cliquez sur Actualiser pour réessayer.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
