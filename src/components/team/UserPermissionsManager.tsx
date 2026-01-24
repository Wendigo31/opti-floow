import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Shield, 
  ChevronDown, 
  ChevronRight,
  Loader2,
  Calculator,
  Route,
  BarChart3,
  TrendingUp,
  Truck,
  Users,
  Building2,
  UserCircle,
  DollarSign,
  Eye,
  EyeOff,
  Save,
  Plus,
  Trash2
} from 'lucide-react';
import { TeamMember } from '@/types/team';

// Feature definitions for granular permissions
const PERMISSION_FEATURES = {
  // Page access
  page_calculator: { label: 'Calculateur', icon: Calculator, category: 'Pages' },
  page_itinerary: { label: 'Itinéraire', icon: Route, category: 'Pages' },
  page_tours: { label: 'Tournées', icon: Route, category: 'Pages' },
  page_dashboard: { label: 'Tableau de bord', icon: BarChart3, category: 'Pages' },
  page_forecast: { label: 'Prévisionnel', icon: TrendingUp, category: 'Pages' },
  page_vehicles: { label: 'Véhicules', icon: Truck, category: 'Pages' },
  page_drivers: { label: 'Conducteurs', icon: Users, category: 'Pages' },
  page_charges: { label: 'Charges', icon: Building2, category: 'Pages' },
  page_clients: { label: 'Clients', icon: UserCircle, category: 'Pages' },
  
  // Financial visibility
  view_costs: { label: 'Voir les coûts', icon: DollarSign, category: 'Données financières' },
  view_margins: { label: 'Voir les marges', icon: TrendingUp, category: 'Données financières' },
  view_profits: { label: 'Voir les bénéfices', icon: DollarSign, category: 'Données financières' },
  view_pricing: { label: 'Voir les tarifs', icon: DollarSign, category: 'Données financières' },
  
  // CRUD actions
  crud_vehicles: { label: 'Gérer véhicules', icon: Truck, category: 'Actions' },
  crud_drivers: { label: 'Gérer conducteurs', icon: Users, category: 'Actions' },
  crud_clients: { label: 'Gérer clients', icon: UserCircle, category: 'Actions' },
  crud_tours: { label: 'Gérer tournées', icon: Route, category: 'Actions' },
} as const;

type FeatureKey = keyof typeof PERMISSION_FEATURES;

interface UserOverride {
  id?: string;
  feature_key: string;
  enabled: boolean;
}

interface MemberPermissions {
  member: TeamMember;
  overrides: UserOverride[];
  isExpanded: boolean;
  hasChanges: boolean;
}

export function UserPermissionsManager() {
  const { members, isDirection, licenseId, isLoading: teamLoading } = useTeam();
  const [memberPermissions, setMemberPermissions] = useState<MemberPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Filter out direction users - they have full access
  const editableMembers = members.filter(m => 
    m.role !== 'direction' && m.role !== 'owner' && !m.isCurrentUser
  );

  // Fetch existing overrides
  const fetchOverrides = useCallback(async () => {
    if (!editableMembers.length) {
      setIsLoading(false);
      return;
    }

    try {
      const memberIds = editableMembers.map(m => m.id);
      
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .select('*')
        .in('company_user_id', memberIds);

      if (error) {
        console.error('Error fetching overrides:', error);
      }

      const permissions: MemberPermissions[] = editableMembers.map(member => ({
        member,
        overrides: (data || [])
          .filter(o => o.company_user_id === member.id)
          .map(o => ({
            id: o.id,
            feature_key: o.feature_key,
            enabled: o.enabled,
          })),
        isExpanded: false,
        hasChanges: false,
      }));

      setMemberPermissions(permissions);
    } catch (e) {
      console.error('Error in fetchOverrides:', e);
    } finally {
      setIsLoading(false);
    }
  }, [editableMembers]);

  useEffect(() => {
    if (!teamLoading && editableMembers.length > 0) {
      fetchOverrides();
    } else if (!teamLoading) {
      setIsLoading(false);
    }
  }, [teamLoading, members]);

  // Toggle expansion for a member
  const toggleExpanded = (memberId: string) => {
    setMemberPermissions(prev => prev.map(mp => 
      mp.member.id === memberId 
        ? { ...mp, isExpanded: !mp.isExpanded }
        : mp
    ));
  };

  // Check if a feature is enabled for a member
  const isFeatureEnabled = (memberId: string, featureKey: FeatureKey): boolean => {
    const mp = memberPermissions.find(p => p.member.id === memberId);
    if (!mp) return true; // Default enabled
    
    const override = mp.overrides.find(o => o.feature_key === featureKey);
    return override ? override.enabled : true; // Default enabled if no override
  };

  // Toggle a feature for a member
  const toggleFeature = (memberId: string, featureKey: FeatureKey) => {
    setMemberPermissions(prev => prev.map(mp => {
      if (mp.member.id !== memberId) return mp;

      const existingIndex = mp.overrides.findIndex(o => o.feature_key === featureKey);
      let newOverrides: UserOverride[];

      if (existingIndex >= 0) {
        // Toggle existing override
        newOverrides = mp.overrides.map((o, i) => 
          i === existingIndex ? { ...o, enabled: !o.enabled } : o
        );
      } else {
        // Create new override (disabled since default is enabled)
        newOverrides = [...mp.overrides, { feature_key: featureKey, enabled: false }];
      }

      return { ...mp, overrides: newOverrides, hasChanges: true };
    }));
  };

  // Save permissions for a member
  const savePermissions = async (memberId: string) => {
    const mp = memberPermissions.find(p => p.member.id === memberId);
    if (!mp) return;

    setSavingMemberId(memberId);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Non authentifié');
        return;
      }

      // Delete all existing overrides for this member
      await supabase
        .from('user_feature_overrides')
        .delete()
        .eq('company_user_id', memberId);

      // Insert new overrides (only disabled features)
      const disabledOverrides = mp.overrides.filter(o => !o.enabled);
      
      if (disabledOverrides.length > 0) {
        const { error } = await supabase
          .from('user_feature_overrides')
          .insert(disabledOverrides.map(o => ({
            company_user_id: memberId,
            feature_key: o.feature_key,
            enabled: o.enabled,
            created_by: user.id,
          })));

        if (error) {
          console.error('Error saving overrides:', error);
          toast.error('Erreur lors de la sauvegarde');
          return;
        }
      }

      // Update state to mark as saved
      setMemberPermissions(prev => prev.map(p => 
        p.member.id === memberId ? { ...p, hasChanges: false } : p
      ));

      toast.success('Permissions enregistrées');
    } catch (e) {
      console.error('Error in savePermissions:', e);
      toast.error('Erreur inattendue');
    } finally {
      setSavingMemberId(null);
    }
  };

  // Group features by category
  const groupedFeatures = Object.entries(PERMISSION_FEATURES).reduce((acc, [key, value]) => {
    if (!acc[value.category]) acc[value.category] = [];
    acc[value.category].push({ key: key as FeatureKey, ...value });
    return acc;
  }, {} as Record<string, { key: FeatureKey; label: string; icon: any; category: string }[]>);

  if (!isDirection) {
    return null;
  }

  if (isLoading || teamLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (editableMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissions utilisateurs
          </CardTitle>
          <CardDescription>
            Configurez les accès granulaires pour chaque membre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun membre à configurer</p>
            <p className="text-sm">Invitez des collaborateurs depuis l'onglet Équipe</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Permissions utilisateurs
        </CardTitle>
        <CardDescription>
          Configurez les accès granulaires pour chaque membre (pages, données financières, actions)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {memberPermissions.map(({ member, overrides, isExpanded, hasChanges }) => (
          <Collapsible
            key={member.id}
            open={isExpanded}
            onOpenChange={() => toggleExpanded(member.id)}
          >
            <div className="border rounded-lg">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">
                        {member.display_name?.[0] || member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <div className="font-medium">{member.display_name || member.email}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                    {overrides.filter(o => !o.enabled).length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <EyeOff className="h-3 w-3 mr-1" />
                        {overrides.filter(o => !o.enabled).length} restriction(s)
                      </Badge>
                    )}
                    {hasChanges && (
                      <Badge variant="default" className="text-xs bg-orange-500">
                        Non sauvegardé
                      </Badge>
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="border-t p-4 space-y-4 bg-muted/20">
                  {Object.entries(groupedFeatures).map(([category, features]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium mb-3">{category}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {features.map(({ key, label, icon: Icon }) => {
                          const isEnabled = isFeatureEnabled(member.id, key);
                          return (
                            <div
                              key={key}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isEnabled ? 'bg-background' : 'bg-destructive/10 border-destructive/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${isEnabled ? 'text-muted-foreground' : 'text-destructive'}`} />
                                <Label htmlFor={`${member.id}-${key}`} className="text-sm cursor-pointer">
                                  {label}
                                </Label>
                              </div>
                              <Switch
                                id={`${member.id}-${key}`}
                                checked={isEnabled}
                                onCheckedChange={() => toggleFeature(member.id, key)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <Separator className="mt-4" />
                    </div>
                  ))}
                  
                  <div className="flex justify-end">
                    <Button
                      onClick={() => savePermissions(member.id)}
                      disabled={!hasChanges || savingMemberId === member.id}
                    >
                      {savingMemberId === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

        <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">💡 Fonctionnement</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Par défaut, toutes les fonctionnalités sont activées</li>
            <li>Désactivez une fonctionnalité pour la masquer à l'utilisateur</li>
            <li>Les restrictions sont synchronisées avec le panneau d'administration</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
