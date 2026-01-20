import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Users, 
  Activity, 
  Mail, 
  Clock, 
  Crown, 
  Shield, 
  User,
  Loader2,
  RefreshCw,
  Route,
  MapPin,
  FileText,
  Receipt,
  Truck,
  Fuel,
  BarChart3,
  Calendar,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  CheckCircle,
  XCircle,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface License {
  id: string;
  license_code: string;
  email: string;
  company_name?: string;
  plan_type: string;
  max_users: number;
  created_at: string;
  activated_at?: string;
  last_used_at?: string;
}

interface CompanyUser {
  id: string;
  email: string;
  display_name?: string;
  role: 'owner' | 'admin' | 'member';
  user_id: string | null;
  is_active: boolean;
  created_at: string;
  accepted_at?: string;
  last_activity_at?: string;
}

interface UserStats {
  company_user_id?: string;
  user_id: string | null;
  email: string;
  display_name?: string;
  role: string;
  tours_count: number;
  trips_count: number;
  clients_count: number;
  quotes_count: number;
  vehicles_count: number;
  drivers_count: number;
  charges_count: number;
  total_revenue: number;
  total_distance: number;
  last_activity_at?: string;
  accepted_at?: string;
}

interface LoginEntry {
  id: string;
  license_id: string;
  login_at: string;
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  location?: string;
  success: boolean;
}

interface Props {
  getAdminToken: () => string | null;
}

export function CompanyDetailPanel({ getAdminToken }: Props) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingLogins, setIsLoadingLogins] = useState(false);
  const [companyTotals, setCompanyTotals] = useState<{
    tours: number;
    trips: number;
    clients: number;
    quotes: number;
    vehicles: number;
    drivers: number;
    charges: number;
    revenue: number;
    distance: number;
  } | null>(null);

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
      setUserStats([]);
      setLoginHistory([]);
      setCompanyTotals(null);
      return;
    }

    fetchCompanyData();
  }, [selectedLicenseId]);

  const fetchCompanyData = async () => {
    if (!selectedLicenseId) return;
    
    const token = getAdminToken();
    if (!token) return;
    
    setIsLoading(true);
    setIsLoadingStats(true);
    setIsLoadingLogins(true);
    
    try {
      // Use edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { 
          action: 'get-company-data', 
          licenseId: selectedLicenseId,
          adminToken: token 
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        // Map company users
        const users = (data.companyUsers || []).map((u: any) => ({
          ...u,
          role: u.role as 'owner' | 'admin' | 'member',
        }));
        setCompanyUsers(users);
        
        // Map user stats
        const stats = (data.userStats || []).map((s: any) => ({
          user_id: s.user_id || s.company_user_id,
          email: s.email,
          display_name: s.display_name,
          role: s.role,
          tours_count: s.tours_count || 0,
          trips_count: s.trips_count || 0,
          clients_count: s.clients_count || 0,
          quotes_count: s.quotes_count || 0,
          vehicles_count: s.vehicles_count || 0,
          drivers_count: s.drivers_count || 0,
          charges_count: s.charges_count || 0,
          total_revenue: s.total_revenue || 0,
          total_distance: s.total_distance || 0,
          last_activity_at: s.last_activity_at,
          accepted_at: s.accepted_at,
        }));
        setUserStats(stats);
        
        // Set company totals
        setCompanyTotals(data.companyTotals || null);
        
        // Set login history
        setLoginHistory(data.loginHistory || []);
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingStats(false);
      setIsLoadingLogins(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="h-4 w-4 text-amber-500" />;
      case 'admin': return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const selectedLicense = licenses.find(l => l.id === selectedLicenseId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Détails complets par Société
        </CardTitle>
        <CardDescription>
          Visualisez l'activité détaillée de chaque utilisateur d'une société
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License selector */}
        <div>
          <Select
            value={selectedLicenseId || ''}
            onValueChange={setSelectedLicenseId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une société..." />
            </SelectTrigger>
            <SelectContent>
              {licenses.map(license => (
                <SelectItem key={license.id} value={license.id}>
                  <div className="flex items-center gap-2">
                    <span>{license.company_name || license.email}</span>
                    <Badge variant="outline" className="ml-2">
                      {license.plan_type?.toUpperCase()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : selectedLicense ? (
          <>
            {/* Company Overview */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedLicense.company_name || selectedLicense.email}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLicense.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Code: <code className="bg-background px-1 py-0.5 rounded">{selectedLicense.license_code}</code>
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="default" className="mb-2">
                    {selectedLicense.plan_type?.toUpperCase()}
                  </Badge>
                  <p className="text-lg font-bold">
                    {companyUsers.length} / {selectedLicense.max_users === 999 ? '∞' : selectedLicense.max_users}
                  </p>
                  <p className="text-xs text-muted-foreground">utilisateurs</p>
                </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={fetchCompanyData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div>

            {/* Company Totals */}
            {companyTotals && (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Route className="h-4 w-4" />
                    <span className="text-xs">Tournées</span>
                  </div>
                  <p className="text-xl font-bold">{companyTotals.tours}</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span className="text-xs">Trajets</span>
                  </div>
                  <p className="text-xl font-bold">{companyTotals.trips}</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Clients</span>
                  </div>
                  <p className="text-xl font-bold">{companyTotals.clients}</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">CA Total</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(companyTotals.revenue)}</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Distance</span>
                  </div>
                  <p className="text-lg font-bold">{Math.round(companyTotals.distance).toLocaleString()} km</p>
                </Card>
              </div>
            )}

            <Tabs defaultValue="users" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="users" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Utilisateurs ({companyUsers.length})
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  Activité
                </TabsTrigger>
                <TabsTrigger value="logins" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Connexions
                </TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-4">
                {isLoadingStats ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {companyUsers.map(user => {
                      // Find stats by user_id if available, otherwise by email
                      const stats = userStats.find(s => 
                        (user.user_id && s.user_id === user.user_id) || 
                        s.email === user.email
                      );
                      
                      return (
                        <Card key={user.id} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback>
                                  {user.display_name?.[0] || user.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{user.display_name || user.email}</p>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    {getRoleIcon(user.role)}
                                    {user.role === 'owner' ? 'Propriétaire' : user.role === 'admin' ? 'Admin' : 'Membre'}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {user.email}
                                </p>
                                {user.last_activity_at ? (
                                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                    <Activity className="h-3 w-3" />
                                    Actif {formatDistanceToNow(new Date(user.last_activity_at), { addSuffix: true, locale: fr })}
                                  </p>
                                ) : user.accepted_at ? (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    Connecté le {format(new Date(user.accepted_at), 'dd/MM/yyyy', { locale: fr })}
                                  </p>
                                ) : (
                                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />
                                    Jamais connecté
                                  </p>
                                )}
                              </div>
                            </div>
                            {!user.user_id && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                En attente
                              </Badge>
                            )}
                          </div>
                          
                          {stats && (
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-center">
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">Tournées</p>
                                <p className="font-semibold">{stats.tours_count}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">Trajets</p>
                                <p className="font-semibold">{stats.trips_count}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">Clients</p>
                                <p className="font-semibold">{stats.clients_count}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">Devis</p>
                                <p className="font-semibold">{stats.quotes_count}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">Véhicules</p>
                                <p className="font-semibold">{stats.vehicles_count}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">CA</p>
                                <p className="font-semibold text-sm">{formatCurrency(stats.total_revenue)}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/50">
                                <p className="text-xs text-muted-foreground">Distance</p>
                                <p className="font-semibold text-sm">{Math.round(stats.total_distance)} km</p>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-4">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Utilisateur</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="text-right">Tournées</TableHead>
                        <TableHead className="text-right">Trajets</TableHead>
                        <TableHead className="text-right">Clients</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                        <TableHead>Dernière activité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStats.map(stats => (
                        <TableRow key={stats.user_id}>
                          <TableCell className="font-medium">
                            {stats.display_name || stats.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              {getRoleIcon(stats.role)}
                              {stats.role === 'owner' ? 'Propriétaire' : stats.role === 'admin' ? 'Admin' : 'Membre'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{stats.tours_count}</TableCell>
                          <TableCell className="text-right">{stats.trips_count}</TableCell>
                          <TableCell className="text-right">{stats.clients_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(stats.total_revenue)}</TableCell>
                          <TableCell>
                            {stats.last_activity_at 
                              ? formatDistanceToNow(new Date(stats.last_activity_at), { addSuffix: true, locale: fr })
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Logins Tab */}
              <TabsContent value="logins" className="mt-4">
                {isLoadingLogins ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : loginHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucune connexion enregistrée</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Appareil</TableHead>
                          <TableHead>Localisation</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loginHistory.map(entry => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm">
                              {format(new Date(entry.login_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getDeviceIcon(entry.device_type)}
                                <span className="text-sm capitalize">{entry.device_type || 'desktop'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                {entry.location || 'Inconnu'}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {entry.ip_address || '-'}
                            </TableCell>
                            <TableCell>
                              {entry.success ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Succès
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Échec
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Sélectionnez une société pour voir les détails</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
