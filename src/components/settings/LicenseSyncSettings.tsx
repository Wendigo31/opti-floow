import { useState } from 'react';
import { RefreshCw, Shield, Check, AlertTriangle, Users, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLicense } from '@/hooks/useLicense';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function LicenseSyncSettings() {
  const { toast } = useToast();
  const { licenseData, planType, refreshLicense, isOffline } = useLicense();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleSyncLicense = async () => {
    if (isOffline) {
      toast({
        title: "Mode hors-ligne",
        description: "Synchronisation impossible sans connexion internet",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      // Refresh license data from server
      await refreshLicense();
      
      // Also notify other tabs/windows to refresh
      const channel = new BroadcastChannel('optiflow-license-sync');
      channel.postMessage({ action: 'refresh' });
      channel.close();
      
      setLastSync(new Date());
      
      toast({
        title: "Licence synchronisée",
        description: "Vos fonctionnalités ont été mises à jour",
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser la licence",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAllCompanyUsers = async () => {
    if (isOffline) {
      toast({
        title: "Mode hors-ligne",
        description: "Synchronisation impossible sans connexion internet",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      // Call edge function to trigger sync for all company users
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'sync-company',
          licenseCode: licenseData?.code,
          email: licenseData?.email,
        },
      });

      if (error) throw error;

      // Refresh own license
      await refreshLicense();
      
      setLastSync(new Date());
      
      toast({
        title: "Synchronisation entreprise",
        description: `${data?.syncedCount || 0} utilisateurs notifiés de la mise à jour`,
      });
    } catch (error) {
      console.error('Company sync error:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser l'entreprise",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const getPlanBadge = () => {
    switch (planType) {
      case 'enterprise':
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">Enterprise</Badge>;
      case 'pro':
        return <Badge className="bg-primary text-primary-foreground">Pro</Badge>;
      default:
        return <Badge variant="secondary">Start</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Licence & Fonctionnalités</CardTitle>
              <CardDescription>Synchronisez votre licence pour mettre à jour vos fonctionnalités</CardDescription>
            </div>
          </div>
          {getPlanBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* License Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium truncate">{licenseData?.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Entreprise</p>
            <p className="font-medium truncate">{licenseData?.companyName || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Forfait</p>
            <p className="font-medium capitalize">{planType}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dernière sync</p>
            <p className="font-medium">
              {lastSync ? lastSync.toLocaleTimeString('fr-FR') : 'Non synchronisé'}
            </p>
          </div>
        </div>

        {/* Offline Warning */}
        {isOffline && (
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">Mode hors-ligne - Synchronisation impossible</span>
          </div>
        )}

        {/* Sync Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSyncLicense}
            disabled={syncing || isOffline}
            variant="outline"
            className="flex-1 gap-2"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Synchroniser ma licence
          </Button>
          
          {(planType === 'pro' || planType === 'enterprise') && (
            <Button
              onClick={handleSyncAllCompanyUsers}
              disabled={syncing || isOffline}
              variant="gradient"
              className="flex-1 gap-2"
            >
              {syncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              Synchroniser toute l'entreprise
            </Button>
          )}
        </div>

        {/* Features Status */}
        <div className="pt-4 border-t border-border/50">
          <p className="text-sm font-medium mb-3">Fonctionnalités actives</p>
          <div className="flex flex-wrap gap-2">
            {planType === 'enterprise' && (
              <>
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3 text-success" />
                  IA Avancée
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Multi-agences
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Analyse toxicité
                </Badge>
              </>
            )}
            {(planType === 'pro' || planType === 'enterprise') && (
              <>
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Itinéraires
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Tournées sauvegardées
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Export Excel
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Check className="w-3 h-3 text-success" />
                  Équipe
                </Badge>
              </>
            )}
            <Badge variant="outline" className="gap-1">
              <Check className="w-3 h-3 text-success" />
              Calculateur
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Check className="w-3 h-3 text-success" />
              Dashboard
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
