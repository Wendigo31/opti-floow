import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  UserPlus,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Truck,
  Mail,
  Shield,
  User,
  Copy,
} from 'lucide-react';
import { ROLE_LABELS, TeamRole } from '@/types/team';

// Public URL of the OptiPlan exploitation app (shared backend).
const OPTIPLAN_URL = 'https://optiplan.lovable.app';

type OptiPlanRole = 'exploitation' | 'membre';

function generatePassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    pwd += chars[arr[i] % chars.length];
  }
  return pwd;
}

export function OptiPlanAccountsManager() {
  const { toast } = useToast();
  const {
    members,
    canManageTeam,
    maxUsers,
    currentUserCount,
    canAddMore,
    licensePlanType,
    refreshTeam,
  } = useTeam();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<OptiPlanRole>('exploitation');
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);

  // Accounts that can already log into OptiPlan = exploitation + membre roles
  const optiplanMembers = members.filter((m) => m.role === 'exploitation' || m.role === 'membre');

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copié', description: `${label} copié dans le presse-papiers` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier', variant: 'destructive' });
    }
  };

  const handleCreate = async () => {
    if (!email.trim() || !displayName.trim()) {
      toast({ title: 'Champs requis', description: 'Nom et email obligatoires', variant: 'destructive' });
      return;
    }
    const finalPassword = password.trim() || generatePassword();
    if (finalPassword.length < 8) {
      toast({ title: 'Mot de passe trop court', description: 'Au moins 8 caractères', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    setLastCreated(null);
    try {
      const { data, error } = await supabase.functions.invoke('create-optiplan-account', {
        body: {
          email: email.trim().toLowerCase(),
          password: finalPassword,
          displayName: displayName.trim(),
          role,
        },
      });

      if (error || !data?.success) {
        const msg = data?.error || error?.message || 'Erreur lors de la création du compte';
        toast({ title: 'Erreur', description: msg, variant: 'destructive' });
        return;
      }

      setLastCreated({ email: email.trim().toLowerCase(), password: finalPassword });
      toast({
        title: 'Compte OptiPlan créé',
        description: `${displayName} peut maintenant se connecter à OptiPlan`,
      });
      setEmail('');
      setDisplayName('');
      setPassword('');
      setRole('exploitation');
      await refreshTeam();
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleIcon = (r: TeamRole) =>
    r === 'exploitation' ? <Shield className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-muted-foreground" />;

  const multiUserAvailable = licensePlanType === 'pro' || licensePlanType === 'enterprise';

  return (
    <div className="space-y-6">
      {/* Intro / link to OptiPlan */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Comptes OptiPlan (exploitation)
              </CardTitle>
              <CardDescription className="mt-1 max-w-xl">
                Créez ici les identifiants de connexion pour OptiPlan, l'application
                d'exploitation & planning. Les comptes utilisent le même backend partagé :
                aucune création de compte n'est possible depuis OptiPlan.
              </CardDescription>
            </div>
            <Button asChild variant="outline">
              <a href={OPTIPLAN_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir OptiPlan
              </a>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!multiUserAvailable ? (
        <Card>
          <CardContent className="text-center py-8">
            <KeyRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Forfait Pro / Enterprise requis</h3>
            <p className="text-muted-foreground mb-4">
              La création de comptes OptiPlan multi-utilisateurs est disponible avec les forfaits Pro et Enterprise.
            </p>
            <Badge variant="outline">Forfait actuel : {licensePlanType.toUpperCase()}</Badge>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Creation form */}
          {canManageTeam && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Créer un compte OptiPlan
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {currentUserCount} / {maxUsers === 999 ? '∞' : maxUsers} utilisateurs
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="op-name">Prénom et Nom *</Label>
                    <Input
                      id="op-name"
                      placeholder="Jean Dupont"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!canAddMore || isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="op-email">Adresse email *</Label>
                    <Input
                      id="op-email"
                      type="email"
                      placeholder="exploitation@entreprise.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!canAddMore || isCreating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="op-password">Mot de passe</Label>
                    <div className="flex gap-2">
                      <Input
                        id="op-password"
                        placeholder="Laisser vide = généré"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={!canAddMore || isCreating}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        title="Générer un mot de passe"
                        onClick={() => setPassword(generatePassword())}
                        disabled={!canAddMore || isCreating}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Rôle</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as OptiPlanRole)} disabled={!canAddMore || isCreating}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exploitation">Exploitation</SelectItem>
                        <SelectItem value="membre">Membre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={!canAddMore || isCreating || !email.trim() || !displayName.trim()}
                >
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Créer le compte OptiPlan
                </Button>
                {!canAddMore && (
                  <p className="text-sm text-amber-600">
                    Limite de {maxUsers} utilisateur(s) atteinte pour votre forfait.
                  </p>
                )}

                {lastCreated && (
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-2">
                    <p className="text-sm font-medium">Identifiants à transmettre :</p>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">Email : <span className="font-mono">{lastCreated.email}</span></span>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(lastCreated.email, 'Email')}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">Mot de passe : <span className="font-mono">{lastCreated.password}</span></span>
                      <Button variant="ghost" size="sm" onClick={() => handleCopy(lastCreated.password, 'Mot de passe')}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ce mot de passe ne sera plus affiché. Transmettez-le de façon sécurisée.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Existing OptiPlan-capable accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comptes pouvant accéder à OptiPlan</CardTitle>
              <CardDescription>
                Tous les membres exploitation et membre peuvent se connecter à OptiPlan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optiplanMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {(member.display_name?.[0] || member.email?.[0] || '?').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.display_name || member.email}</span>
                          {!member.user_id && (
                            <Badge variant="secondary" className="text-xs">En attente de connexion</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </div>
                ))}

                {optiplanMembers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun compte OptiPlan pour le moment
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}