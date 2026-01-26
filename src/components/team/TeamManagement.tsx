import { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  Mail, 
  Clock, 
  Trash2, 
  Edit2,
  Loader2,
  AlertCircle,
  Check,
  X
} from 'lucide-react';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, TeamRole } from '@/types/team';
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

export function TeamManagement() {
  const { toast } = useToast();
  const {
    members,
    pendingInvitations,
    currentUserRole,
    isOwner,
    canManageTeam,
    maxUsers,
    currentUserCount,
    canAddMore,
    isLoading,
    error,
    licensePlanType,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
  } = useTeam();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('membre');
  const [isInviting, setIsInviting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);

  const getRoleIcon = (role: TeamRole) => {
    switch (role) {
      case 'direction':
        return <Crown className="h-4 w-4 text-amber-500" />;
      case 'exploitation':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: TeamRole) => {
    switch (role) {
      case 'direction':
        return 'default';
      case 'exploitation':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Email requis',
        description: 'Veuillez entrer une adresse email',
        variant: 'destructive',
      });
      return;
    }

    if (!inviteDisplayName.trim()) {
      toast({
        title: 'Nom requis',
        description: 'Veuillez entrer le nom et prénom de l\'utilisateur',
        variant: 'destructive',
      });
      return;
    }

    setIsInviting(true);
    const result = await inviteMember(inviteEmail.trim(), inviteRole, inviteDisplayName.trim());
    setIsInviting(false);

    if (result.success) {
      toast({
        title: 'Invitation envoyée',
        description: `Une invitation a été créée pour ${inviteDisplayName || inviteEmail}`,
      });
      setInviteEmail('');
      setInviteDisplayName('');
      setInviteRole('membre');
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    const result = await removeMember(memberToRemove);
    setMemberToRemove(null);

    if (result.success) {
      toast({
        title: 'Membre supprimé',
        description: 'Le membre a été retiré de l\'équipe',
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;

    const result = await cancelInvitation(invitationToCancel);
    setInvitationToCancel(null);

    if (result.success) {
      toast({
        title: 'Invitation annulée',
        description: 'L\'invitation a été annulée',
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    const result = await updateMemberRole(memberId, newRole);

    if (result.success) {
      toast({
        title: 'Rôle mis à jour',
        description: 'Le rôle du membre a été modifié',
      });
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  // Check if multi-users is available (based on actual license plan type)
  // licensePlanType is now obtained from useLicense via useTeam hook
  if (licensePlanType !== 'pro' && licensePlanType !== 'enterprise') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gestion d'équipe
          </CardTitle>
          <CardDescription>
            Invitez des collaborateurs et partagez vos données
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Fonctionnalité Pro / Enterprise</h3>
            <p className="text-muted-foreground mb-4">
              La gestion d'équipe multi-utilisateurs est disponible avec les forfaits Pro et Enterprise.
            </p>
            <Badge variant="outline">Forfait actuel : {licensePlanType.toUpperCase()}</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with usage */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion d'équipe
                </CardTitle>
                <CardDescription>
                  Gérez les membres de votre entreprise
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{currentUserCount} / {maxUsers === 999 ? '∞' : maxUsers}</div>
                <div className="text-sm text-muted-foreground">utilisateurs</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Invite form */}
        {canManageTeam && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Inviter un collaborateur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="invite-name">Prénom et Nom *</Label>
                  <Input
                    id="invite-name"
                    type="text"
                    placeholder="Jean Dupont"
                    value={inviteDisplayName}
                    onChange={(e) => setInviteDisplayName(e.target.value)}
                    disabled={!canAddMore || isInviting}
                  />
                </div>
                <div>
                  <Label htmlFor="invite-email">Adresse email *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="collaborateur@entreprise.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={!canAddMore || isInviting}
                  />
                </div>
                <div>
                  <Label>Rôle</Label>
                  <Select
                    value={inviteRole}
                    onValueChange={(v) => setInviteRole(v as TeamRole)}
                    disabled={!canAddMore || isInviting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membre">Membre</SelectItem>
                      <SelectItem value="exploitation">Exploitation</SelectItem>
                      {/* Direction role can only be created by admin panel */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleInvite}
                    disabled={!canAddMore || isInviting || !inviteEmail.trim() || !inviteDisplayName.trim()}
                    className="w-full"
                  >
                    {isInviting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Inviter
                  </Button>
                </div>
              </div>
              {!canAddMore && (
                <p className="text-sm text-amber-600 mt-2">
                  Limite de {maxUsers} utilisateur(s) atteinte pour votre forfait.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Team members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Membres de l'équipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {member.display_name?.[0] || member.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.display_name || member.email}
                        </span>
                        {member.isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Vous</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      {ROLE_LABELS[member.role]}
                    </Badge>
                    {canManageTeam && member.role !== 'direction' && !member.isCurrentUser && (
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member.id, v as TeamRole)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="membre">Membre</SelectItem>
                            <SelectItem value="exploitation">Exploitation</SelectItem>
                          </SelectContent>
                        </Select>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setMemberToRemove(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun membre dans l'équipe
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending invitations */}
        {pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Invitations en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-dashed"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Expire le {new Date(invitation.expires_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{ROLE_LABELS[invitation.role]}</Badge>
                      {canManageTeam && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setInvitationToCancel(invitation.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role descriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rôles et permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                <div key={role} className="flex items-start gap-3">
                  {getRoleIcon(role as TeamRole)}
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role as TeamRole]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirm remove member dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce membre ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre perdra l'accès aux données de l'entreprise. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm cancel invitation dialog */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette invitation ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utilisateur ne pourra plus rejoindre l'équipe avec ce lien d'invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvitation}>
              Annuler l'invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
