import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FeatureGate } from '@/components/license/FeatureGate';
import { useLicense } from '@/hooks/useLicense';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  Mail, 
  Trash2, 
  Loader2,
  Building2,
  RefreshCw,
  Clock,
  Activity
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CompanyUser {
  id: string;
  license_id: string;
  user_id: string | null;
  email: string;
  role: 'owner' | 'admin' | 'member';
  display_name?: string;
  is_active: boolean;
  created_at: string;
  last_activity_at?: string | null;
  accepted_at?: string | null;
}

interface License {
  id: string;
  license_code: string;
  email: string;
  company_name?: string;
  plan_type: string;
  max_users: number;
}

interface Props {
  getAdminToken: () => string | null;
}

export function CompanyUsersManager({ getAdminToken }: Props) {
  const { toast } = useToast();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<string | null>(null);

  // Add user form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');

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

  // Fetch company users when license is selected
  useEffect(() => {
    if (!selectedLicenseId) {
      setCompanyUsers([]);
      return;
    }

    const fetchCompanyUsers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('company_users')
        .select('*')
        .eq('license_id', selectedLicenseId)
        .order('role', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching company users:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les utilisateurs',
          variant: 'destructive',
        });
      } else {
        setCompanyUsers((data || []).map(u => ({
          ...u,
          role: u.role as 'owner' | 'admin' | 'member',
        })));
      }
      setIsLoading(false);
    };

    fetchCompanyUsers();
  }, [selectedLicenseId, toast]);

  const handleAddUser = async () => {
    if (!selectedLicenseId || !newUserEmail.trim()) return;

    setIsAddingUser(true);
    try {
      // Check if user already exists in this company
      const existing = companyUsers.find(u => u.email.toLowerCase() === newUserEmail.toLowerCase());
      if (existing) {
        toast({
          title: 'Erreur',
          description: 'Cet email est déjà dans cette société',
          variant: 'destructive',
        });
        setIsAddingUser(false);
        return;
      }

      // Check max users limit
      const license = licenses.find(l => l.id === selectedLicenseId);
      if (license && companyUsers.length >= license.max_users) {
        toast({
          title: 'Limite atteinte',
          description: `Cette société est limitée à ${license.max_users} utilisateur(s)`,
          variant: 'destructive',
        });
        setIsAddingUser(false);
        return;
      }

      // Use RPC function to bypass RLS
      const { data: newId, error } = await supabase
        .rpc('admin_add_company_user', {
          p_license_id: selectedLicenseId,
          p_email: newUserEmail.toLowerCase().trim(),
          p_role: newUserRole,
          p_display_name: newUserDisplayName.trim() || null,
        });

      if (error) {
        console.error('Error adding user:', error);
        toast({
          title: 'Erreur',
          description: error.message || 'Impossible d\'ajouter l\'utilisateur',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Utilisateur ajouté',
          description: `${newUserEmail} a été ajouté à la société`,
        });
        setShowAddDialog(false);
        setNewUserEmail('');
        setNewUserRole('member');
        setNewUserDisplayName('');
        
        // Refresh list
        const { data } = await supabase
          .from('company_users')
          .select('*')
          .eq('license_id', selectedLicenseId)
          .order('role')
          .order('created_at');
        setCompanyUsers((data || []).map(u => ({
          ...u,
          role: u.role as 'owner' | 'admin' | 'member',
        })));
      }
    } catch (e) {
      console.error('Error:', e);
      toast({
        title: 'Erreur',
        description: 'Une erreur inattendue s\'est produite',
        variant: 'destructive',
      });
    }
    setIsAddingUser(false);
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;

    const user = companyUsers.find(u => u.id === userToRemove);
    if (user?.role === 'owner') {
      toast({
        title: 'Impossible',
        description: 'Impossible de supprimer le propriétaire',
        variant: 'destructive',
      });
      setUserToRemove(null);
      return;
    }

    // Use RPC function to bypass RLS
    const { data: success, error } = await supabase
      .rpc('admin_remove_company_user', {
        p_user_id: userToRemove,
      });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'utilisateur',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Utilisateur supprimé',
        description: 'L\'utilisateur a été retiré de la société',
      });
      setCompanyUsers(prev => prev.filter(u => u.id !== userToRemove));
    }
    setUserToRemove(null);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    // Use RPC function to bypass RLS
    const { data: success, error } = await supabase
      .rpc('admin_update_company_user_role', {
        p_user_id: userId,
        p_role: newRole,
      });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le rôle',
        variant: 'destructive',
      });
    } else {
      setCompanyUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      toast({
        title: 'Rôle modifié',
        description: `Rôle changé en ${newRole}`,
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-amber-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  const selectedLicense = licenses.find(l => l.id === selectedLicenseId);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gestion des Sociétés
          </CardTitle>
          <CardDescription>
            Ajoutez des utilisateurs aux sociétés pour partager les données
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* License selector */}
          <div>
            <Label>Sélectionner une société (licence)</Label>
            <Select
              value={selectedLicenseId || ''}
              onValueChange={setSelectedLicenseId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir une licence..." />
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

          {/* Selected license info */}
          {selectedLicense && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedLicense.company_name || 'Sans nom'}</p>
                  <p className="text-sm text-muted-foreground">{selectedLicense.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {companyUsers.length} / {selectedLicense.max_users === 999 ? '∞' : selectedLicense.max_users}
                  </p>
                  <p className="text-xs text-muted-foreground">utilisateurs</p>
                </div>
              </div>
              <FeatureGate feature="company_invite_members" showLockedIndicator={false}>
                <Button
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  disabled={companyUsers.length >= selectedLicense.max_users && selectedLicense.max_users !== 999}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter un utilisateur
                </Button>
              </FeatureGate>
            </div>
          )}

          {/* Users list */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedLicenseId && companyUsers.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Utilisateurs de la société
              </h4>
              {companyUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {user.display_name?.[0] || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {user.display_name || user.email}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                        {user.last_activity_at ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Activity className="h-3 w-3" />
                            Actif {formatDistanceToNow(new Date(user.last_activity_at), { addSuffix: true, locale: fr })}
                          </span>
                        ) : user.accepted_at ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Connecté {format(new Date(user.accepted_at), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" />
                            Jamais connecté
                          </span>
                        )}
                        {!user.user_id && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-600 border-amber-500/30">
                            En attente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center gap-1">
                      {getRoleIcon(user.role)}
                      {user.role === 'owner' ? 'Propriétaire' : user.role === 'admin' ? 'Admin' : 'Membre'}
                    </Badge>
                    {user.role !== 'owner' && (
                      <>
                        <FeatureGate feature="company_change_roles" showLockedIndicator={false}>
                          <Select
                            value={user.role}
                            onValueChange={(v) => handleRoleChange(user.id, v as 'admin' | 'member')}
                          >
                            <SelectTrigger className="w-24 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Membre</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </FeatureGate>
                        <FeatureGate feature="company_remove_members" showLockedIndicator={false}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setUserToRemove(user.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </FeatureGate>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : selectedLicenseId ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun utilisateur dans cette société</p>
              <p className="text-sm">Le propriétaire sera ajouté automatiquement à la première connexion</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Add user dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un utilisateur</DialogTitle>
            <DialogDescription>
              Ajoutez un utilisateur à la société {selectedLicense?.company_name || selectedLicense?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="utilisateur@entreprise.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="displayName">Nom affiché</Label>
              <Input
                id="displayName"
                placeholder="Jean Dupont"
                value={newUserDisplayName}
                onChange={(e) => setNewUserDisplayName(e.target.value)}
              />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Membre</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="owner">Propriétaire</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Propriétaire : accès complet • Admin : peut modifier • Membre : lecture/écriture
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddUser} disabled={isAddingUser || !newUserEmail.trim()}>
              {isAddingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm remove dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utilisateur perdra l'accès aux données partagées de la société.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
