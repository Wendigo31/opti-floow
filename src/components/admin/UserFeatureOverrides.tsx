import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FEATURE_CATEGORIES } from '@/types/features';
import { 
  Users, 
  Settings2, 
  Crown, 
  Shield, 
  User,
  Loader2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Ban
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CompanyUser {
  id: string;
  license_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'admin' | 'member';
  display_name?: string;
  is_active: boolean;
}

interface License {
  id: string;
  license_code: string;
  email: string;
  company_name?: string;
  plan_type: string;
}

interface FeatureOverride {
  id: string;
  company_user_id: string;
  feature_key: string;
  enabled: boolean;
}

interface Props {
  getAdminToken: () => string | null;
}

export function UserFeatureOverrides({ getAdminToken }: Props) {
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<FeatureOverride[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Fetch licenses
  useEffect(() => {
    const fetchLicenses = async () => {
      const token = getAdminToken();
      if (!token) return;

      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'list-all', adminToken: token },
      });

      if (!error && data?.licenses) {
        setLicenses(data.licenses);
      }
    };

    fetchLicenses();
  }, [getAdminToken]);

  // Fetch company users when license is selected (via edge function to bypass RLS)
  useEffect(() => {
    if (!selectedLicenseId) {
      setCompanyUsers([]);
      setSelectedUserId(null);
      return;
    }

    const fetchCompanyUsers = async () => {
      setIsLoading(true);
      const token = getAdminToken();
      
      if (!token) {
        console.error('No admin token available');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('validate-license', {
          body: { 
            action: 'get-company-data', 
            adminToken: token,
            licenseId: selectedLicenseId 
          },
        });

        if (error) {
          console.error('Error fetching company users:', error);
        } else if (data?.companyUsers) {
          setCompanyUsers(data.companyUsers.map((u: any) => ({
            id: u.id,
            license_id: u.license_id,
            user_id: u.user_id,
            email: u.email,
            role: u.role as 'owner' | 'admin' | 'member',
            display_name: u.display_name,
            is_active: u.is_active ?? true,
          })));
        }
      } catch (err) {
        console.error('Error fetching company users:', err);
      }
      setIsLoading(false);
    };

    fetchCompanyUsers();
  }, [selectedLicenseId, getAdminToken]);

  // Fetch overrides when user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setOverrides([]);
      return;
    }

    const fetchOverrides = async () => {
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .select('*')
        .eq('company_user_id', selectedUserId);

      if (error) {
        console.error('Error fetching overrides:', error);
      } else {
        setOverrides(data || []);
      }
    };

    fetchOverrides();
  }, [selectedUserId]);

  const handleToggleOverride = async (featureKey: string, currentlyEnabled: boolean | null) => {
    if (!selectedUserId) return;

    setIsSaving(true);
    try {
      const existingOverride = overrides.find(o => o.feature_key === featureKey);

      if (existingOverride) {
        if (currentlyEnabled === null) {
          // Remove override (reset to default)
          const { error } = await supabase
            .from('user_feature_overrides')
            .delete()
            .eq('id', existingOverride.id);

          if (error) throw error;
          setOverrides(prev => prev.filter(o => o.id !== existingOverride.id));
        } else {
          // Toggle the override
          const { error } = await supabase
            .from('user_feature_overrides')
            .update({ enabled: !existingOverride.enabled, updated_at: new Date().toISOString() })
            .eq('id', existingOverride.id);

          if (error) throw error;
          setOverrides(prev => prev.map(o => 
            o.id === existingOverride.id ? { ...o, enabled: !o.enabled } : o
          ));
        }
      } else {
        // Create new override (default to disabled = restrict access)
        const { data, error } = await supabase
          .from('user_feature_overrides')
          .insert({
            company_user_id: selectedUserId,
            feature_key: featureKey,
            enabled: false, // Start with restricted
          })
          .select()
          .single();

        if (error) throw error;
        setOverrides(prev => [...prev, data]);
      }

      toast({
        title: 'Exception mise à jour',
        description: `L'accès à cette fonctionnalité a été modifié`,
      });
    } catch (error) {
      console.error('Error updating override:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour l\'exception',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  const getOverrideState = (featureKey: string): 'default' | 'enabled' | 'disabled' => {
    const override = overrides.find(o => o.feature_key === featureKey);
    if (!override) return 'default';
    return override.enabled ? 'enabled' : 'disabled';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-amber-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryName) 
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const selectedUser = companyUsers.find(u => u.id === selectedUserId);
  const selectedLicense = licenses.find(l => l.id === selectedLicenseId);

  // Filter features by search
  const filteredCategories = FEATURE_CATEGORIES.map(cat => ({
    ...cat,
    features: cat.features.filter(f => 
      !f.isLimit && (
        f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.key.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  })).filter(cat => cat.features.length > 0);

  const overrideCount = overrides.length;
  const restrictedCount = overrides.filter(o => !o.enabled).length;
  const grantedCount = overrides.filter(o => o.enabled).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Exceptions utilisateur
        </CardTitle>
        <CardDescription>
          Gérez les accès spécifiques par utilisateur (override des droits société)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Société</Label>
            <Select
              value={selectedLicenseId || ''}
              onValueChange={(v) => {
                setSelectedLicenseId(v);
                setSelectedUserId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une société..." />
              </SelectTrigger>
              <SelectContent>
                {licenses.map(license => (
                  <SelectItem key={license.id} value={license.id}>
                    <div className="flex items-center gap-2">
                      <span>{license.company_name || license.email}</span>
                      <Badge variant="outline" className="ml-2">
                        {license.plan_type.toUpperCase()}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Utilisateur</Label>
            <Select
              value={selectedUserId || ''}
              onValueChange={setSelectedUserId}
              disabled={!selectedLicenseId || companyUsers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedLicenseId 
                    ? "Sélectionnez d'abord une société" 
                    : companyUsers.length === 0 
                      ? "Aucun utilisateur"
                      : "Choisir un utilisateur..."
                } />
              </SelectTrigger>
              <SelectContent>
                {companyUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span>{user.display_name || user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected user info */}
        {selectedUser && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {selectedUser.display_name?.[0] || selectedUser.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedUser.display_name || selectedUser.email}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleIcon(selectedUser.role)}
                <Badge variant={selectedUser.role === 'owner' ? 'default' : 'secondary'}>
                  {selectedUser.role === 'owner' ? 'Propriétaire' : selectedUser.role === 'admin' ? 'Admin' : 'Membre'}
                </Badge>
              </div>
            </div>

            {/* Override stats */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Exceptions:</span>
                <Badge variant="outline">{overrideCount}</Badge>
              </div>
              {restrictedCount > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <Ban className="h-3 w-3" />
                  <span>{restrictedCount} restreint(s)</span>
                </div>
              )}
              {grantedCount > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="h-3 w-3" />
                  <span>{grantedCount} accordé(s)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feature overrides */}
        {selectedUserId && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une fonctionnalité..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {filteredCategories.map(category => (
                  <Collapsible
                    key={category.name}
                    open={expandedCategories.includes(category.name)}
                    onOpenChange={() => toggleCategory(category.name)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-3 h-auto"
                      >
                        <span className="font-medium">{category.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {category.features.length}
                          </Badge>
                          {expandedCategories.includes(category.name) 
                            ? <ChevronUp className="h-4 w-4" />
                            : <ChevronDown className="h-4 w-4" />
                          }
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-2">
                      <div className="space-y-2 pt-2">
                        {category.features.map(feature => {
                          const state = getOverrideState(feature.key);
                          return (
                            <div
                              key={feature.key}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                state === 'disabled' 
                                  ? 'bg-destructive/10 border-destructive/30'
                                  : state === 'enabled'
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-background'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{feature.label}</span>
                                  {state !== 'default' && (
                                    <Badge 
                                      variant={state === 'enabled' ? 'default' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {state === 'enabled' ? 'Accordé' : 'Restreint'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {feature.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                {state !== 'default' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => handleToggleOverride(feature.key, null)}
                                    disabled={isSaving}
                                  >
                                    Réinitialiser
                                  </Button>
                                )}
                                <div className="flex gap-1">
                                  <Button
                                    variant={state === 'disabled' ? 'destructive' : 'outline'}
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      if (state === 'disabled') {
                                        handleToggleOverride(feature.key, true);
                                      } else {
                                        handleToggleOverride(feature.key, false);
                                      }
                                    }}
                                    disabled={isSaving}
                                    title="Restreindre l'accès"
                                  >
                                    <Ban className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant={state === 'enabled' ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => {
                                      if (state === 'enabled') {
                                        handleToggleOverride(feature.key, true);
                                      } else {
                                        const override = overrides.find(o => o.feature_key === feature.key);
                                        if (override) {
                                          handleToggleOverride(feature.key, true);
                                        } else {
                                          // Create enabled override
                                          supabase
                                            .from('user_feature_overrides')
                                            .insert({
                                              company_user_id: selectedUserId,
                                              feature_key: feature.key,
                                              enabled: true,
                                            })
                                            .select()
                                            .single()
                                            .then(({ data, error }) => {
                                              if (!error && data) {
                                                setOverrides(prev => [...prev, data]);
                                                toast({
                                                  title: 'Exception ajoutée',
                                                  description: 'Accès accordé à cette fonctionnalité',
                                                });
                                              }
                                            });
                                        }
                                      }
                                    }}
                                    disabled={isSaving}
                                    title="Accorder l'accès"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!selectedLicenseId && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Sélectionnez une société puis un utilisateur</p>
            <p className="text-sm">pour gérer ses exceptions d'accès</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
