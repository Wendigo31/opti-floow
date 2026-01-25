import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Crown, 
  Briefcase, 
  Truck,
  User,
  Mail,
  Loader2,
  AlertCircle,
  Check
} from 'lucide-react';
import { TeamRole } from '@/types/team';

const SIMPLE_ROLES = ['exploitation', 'membre'] as const;
type SimpleRole = typeof SIMPLE_ROLES[number];

const ROLE_CONFIG: Record<SimpleRole, { 
  label: string; 
  description: string; 
  icon: React.ElementType;
  color: string;
}> = {
  exploitation: {
    label: 'Exploitation',
    description: 'Accès au calculateur et données opérationnelles',
    icon: Truck,
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  },
  membre: {
    label: 'Membre',
    description: 'Gère véhicules, conducteurs et clients sans données financières',
    icon: User,
    color: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  },
};

export function RoleManagement() {
  const { toast } = useToast();
  const {
    members,
    isDirection,
    isLoading,
    error,
    updateMemberRole,
  } = useTeam();
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: SimpleRole) => {
    setUpdatingMember(memberId);
    const result = await updateMemberRole(memberId, newRole as TeamRole);
    setUpdatingMember(null);

    if (result.success) {
      toast({
        title: 'Rôle mis à jour',
        description: 'Le rôle du membre a été modifié avec succès',
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  // Map current role to simple role
  const getSimpleRole = (role: TeamRole): SimpleRole | 'direction' => {
    switch (role) {
      case 'direction':
        return 'direction';
      case 'exploitation':
        return 'exploitation';
      default:
        return 'membre';
    }
  };

  // Only direction can see this component
  if (!isDirection) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter out direction users - they can't be changed
  const editableMembers = members.filter(m => {
    const simpleRole = getSimpleRole(m.role);
    return simpleRole !== 'direction' && !m.isCurrentUser;
  });

  const directionMembers = members.filter(m => {
    const simpleRole = getSimpleRole(m.role);
    return simpleRole === 'direction';
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestion des rôles
        </CardTitle>
        <CardDescription>
          Changez le rôle des membres de l'équipe (Exploitation ou Membre)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Direction members (read-only) */}
        {directionMembers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              Direction
            </h3>
            <div className="space-y-2">
              {directionMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-amber-500/20 text-amber-600 text-sm">
                        {member.display_name?.[0] || member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {member.display_name || member.email}
                        {member.isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Vous</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    <Crown className="h-3 w-3 mr-1" />
                    Direction
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editable members */}
        {editableMembers.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Membres de l'équipe
            </h3>
            <div className="space-y-2">
              {editableMembers.map((member) => {
                const currentSimpleRole = getSimpleRole(member.role);
                const isUpdating = updatingMember === member.id;
                
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-sm">
                          {member.display_name?.[0] || member.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {member.display_name || member.email}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentSimpleRole as SimpleRole}
                        onValueChange={(v) => handleRoleChange(member.id, v as SimpleRole)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-40">
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {SIMPLE_ROLES.map((role) => {
                            const config = ROLE_CONFIG[role];
                            const RoleIcon = config.icon;
                            return (
                              <SelectItem key={role} value={role}>
                                <div className="flex items-center gap-2">
                                  <RoleIcon className="h-4 w-4" />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun membre à gérer</p>
            <p className="text-sm">Invitez des collaborateurs depuis l'onglet Équipe</p>
          </div>
        )}

        {/* Role descriptions */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm">Permissions par rôle</h4>
          {SIMPLE_ROLES.map((role) => {
            const config = ROLE_CONFIG[role];
            const RoleIcon = config.icon;
            return (
              <div key={role} className="flex items-start gap-3">
                <div className={`p-1.5 rounded ${config.color}`}>
                  <RoleIcon className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">{config.label}</div>
                  <div className="text-xs text-muted-foreground">{config.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
