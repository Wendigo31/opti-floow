import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  EyeOff, 
  Lock, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Shield,
  Info,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useLicense } from '@/hooks/useLicense';
import { toast } from 'sonner';

// Feature labels for display
const FEATURE_LABELS: Record<string, { label: string; description: string; category: string }> = {
  // Navigation
  page_dashboard: { label: 'Tableau de bord', description: 'Accès à la page tableau de bord analytique', category: 'Navigation' },
  page_calculator: { label: 'Calculateur', description: 'Accès au calculateur de rentabilité', category: 'Navigation' },
  page_itinerary: { label: 'Itinéraire', description: 'Accès à la planification d\'itinéraire', category: 'Navigation' },
  page_tours: { label: 'Tournées', description: 'Accès à la gestion des tournées', category: 'Navigation' },
  page_clients: { label: 'Clients', description: 'Accès à la gestion des clients', category: 'Navigation' },
  page_vehicles: { label: 'Véhicules', description: 'Accès à la gestion de la flotte', category: 'Navigation' },
  page_drivers: { label: 'Conducteurs', description: 'Accès à la gestion des conducteurs', category: 'Navigation' },
  page_charges: { label: 'Charges', description: 'Accès à la gestion des charges', category: 'Navigation' },
  page_forecast: { label: 'Prévisionnel', description: 'Accès aux prévisions financières', category: 'Navigation' },
  page_ai_analysis: { label: 'Analyse IA', description: 'Accès à l\'analyse par intelligence artificielle', category: 'Navigation' },
  page_settings: { label: 'Paramètres', description: 'Accès aux paramètres de l\'application', category: 'Navigation' },
  
  // Fonctionnalités IA
  ai_optimization: { label: 'Optimisation IA', description: 'Optimisation des trajets par IA', category: 'Intelligence Artificielle' },
  ai_pdf_analysis: { label: 'Analyse PDF IA', description: 'Analyse de documents par IA', category: 'Intelligence Artificielle' },
  
  // Export
  btn_export_pdf: { label: 'Export PDF', description: 'Exporter les données en PDF', category: 'Export' },
  btn_export_excel: { label: 'Export Excel', description: 'Exporter les données en Excel', category: 'Export' },
  
  // Autres fonctionnalités
  multi_drivers: { label: 'Multi-conducteurs', description: 'Gérer plusieurs conducteurs', category: 'Fonctionnalités' },
  multi_users: { label: 'Multi-utilisateurs', description: 'Plusieurs utilisateurs par société', category: 'Fonctionnalités' },
  saved_tours: { label: 'Tournées sauvegardées', description: 'Sauvegarder et réutiliser des tournées', category: 'Fonctionnalités' },
  client_analysis: { label: 'Analyse clients', description: 'Analyser la rentabilité par client', category: 'Fonctionnalités' },
  forecast: { label: 'Prévisionnel', description: 'Prévisions financières détaillées', category: 'Fonctionnalités' },
  
  // Gestion société
  company_invite_members: { label: 'Inviter des membres', description: 'Inviter de nouveaux membres', category: 'Gestion d\'équipe' },
  company_remove_members: { label: 'Supprimer des membres', description: 'Retirer des membres de l\'équipe', category: 'Gestion d\'équipe' },
  company_change_roles: { label: 'Modifier les rôles', description: 'Changer les rôles des membres', category: 'Gestion d\'équipe' },
  company_view_activity: { label: 'Voir l\'activité', description: 'Consulter l\'historique d\'activité', category: 'Gestion d\'équipe' },
};

export default function MyRestrictions() {
  const { licenseData } = useLicense();
  const [requestMessage, setRequestMessage] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const restrictedFeatures = licenseData?.userFeatureOverrides?.filter(o => !o.enabled) || [];
  
  // Group restrictions by category
  const groupedRestrictions = restrictedFeatures.reduce((acc, restriction) => {
    const featureInfo = FEATURE_LABELS[restriction.feature_key] || {
      label: restriction.feature_key.replace(/_/g, ' '),
      description: 'Fonctionnalité restreinte',
      category: 'Autres'
    };
    
    if (!acc[featureInfo.category]) {
      acc[featureInfo.category] = [];
    }
    acc[featureInfo.category].push({
      key: restriction.feature_key,
      ...featureInfo
    });
    return acc;
  }, {} as Record<string, Array<{ key: string; label: string; description: string; category: string }>>);

  const toggleFeatureSelection = (featureKey: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureKey) 
        ? prev.filter(f => f !== featureKey)
        : [...prev, featureKey]
    );
  };

  const handleSendRequest = async () => {
    if (selectedFeatures.length === 0) {
      toast.error('Sélectionnez au moins une fonctionnalité');
      return;
    }

    setSending(true);
    
    try {
      const { data, error } = await supabase.rpc('create_access_request', {
        p_requested_features: selectedFeatures,
        p_message: requestMessage || null,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Demande envoyée', {
        description: 'Votre administrateur a été notifié de votre demande.'
      });

      // Reset after success
      setTimeout(() => {
        setSent(false);
        setSelectedFeatures([]);
        setRequestMessage('');
      }, 3000);
    } catch (err: any) {
      console.error('Error sending request:', err);
      toast.error('Erreur', {
        description: err.message || 'Impossible d\'envoyer la demande'
      });
    }
    
    setSending(false);
  };

  const getTitle = () => 'Mes Restrictions';
  const getSubtitle = () => 'Consultez les fonctionnalités restreintes pour votre compte';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          {getTitle()}
        </h1>
        <p className="text-muted-foreground mt-1">{getSubtitle()}</p>
      </div>

      {restrictedFeatures.length === 0 ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Aucune restriction</h3>
                <p className="text-sm text-muted-foreground">
                  Vous avez accès à toutes les fonctionnalités de votre forfait.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Restricted Features List */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <EyeOff className="w-5 h-5" />
                  Fonctionnalités restreintes ({restrictedFeatures.length})
                </CardTitle>
                <CardDescription>
                  Ces fonctionnalités ont été désactivées par votre administrateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(groupedRestrictions).map(([category, features]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                    <div className="space-y-2">
                      {features.map((feature) => (
                        <div 
                          key={feature.key}
                          onClick={() => toggleFeatureSelection(feature.key)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedFeatures.includes(feature.key)
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-muted/30 hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              selectedFeatures.includes(feature.key)
                                ? 'bg-primary/20'
                                : 'bg-destructive/20'
                            }`}>
                              <Lock className={`w-4 h-4 ${
                                selectedFeatures.includes(feature.key)
                                  ? 'text-primary'
                                  : 'text-destructive'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{feature.label}</p>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                            </div>
                            {selectedFeatures.includes(feature.key) && (
                              <Badge variant="default" className="bg-primary">
                                Sélectionné
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Request Access Form */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Demander un accès
                </CardTitle>
                <CardDescription>
                  Sélectionnez les fonctionnalités et envoyez une demande à votre administrateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedFeatures.length > 0 && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium text-primary mb-2">
                      Fonctionnalités demandées ({selectedFeatures.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFeatures.map(key => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {FEATURE_LABELS[key]?.label || key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Message (optionnel)</Label>
                  <Textarea
                    id="message"
                    placeholder="Expliquez pourquoi vous avez besoin de ces fonctionnalités..."
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button 
                  onClick={handleSendRequest}
                  disabled={selectedFeatures.length === 0 || sending || sent}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : sent ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Demande envoyée !
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer la demande
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Comment ça fonctionne ?</p>
                    <ul className="space-y-1 list-disc list-inside">
                      <li>Sélectionnez les fonctionnalités souhaitées</li>
                      <li>Ajoutez un message explicatif (optionnel)</li>
                      <li>Votre administrateur recevra une notification</li>
                      <li>Il pourra activer les fonctionnalités depuis son panneau</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
