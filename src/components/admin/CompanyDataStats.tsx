import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Truck, Container, Users, Route, DollarSign, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface License {
  id: string;
  license_code: string;
  email: string;
  company_name?: string;
  plan_type: string;
}

interface CompanyStats {
  vehicleCount: number;
  trailerCount: number;
  driverCount: number;
  chargeCount: number;
  tourCount: number;
  userCount: number;
}

interface VehicleData {
  id: string;
  name: string;
  license_plate: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  current_km?: number;
  user_email?: string;
  created_at: string;
}

interface TrailerData {
  id: string;
  name: string;
  license_plate?: string;
  brand?: string;
  model?: string;
  trailer_type?: string;
  user_email?: string;
  created_at: string;
}

interface TourData {
  id: string;
  name: string;
  origin_address: string;
  destination_address: string;
  distance_km: number;
  total_cost: number;
  revenue: number;
  profit_margin?: number;
  user_id: string;
  created_at: string;
}

interface Props {
  getAdminToken: () => string | null;
}

export function CompanyDataStats({ getAdminToken }: Props) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'trailers' | 'tours'>('overview');
  
  // Detailed data
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [trailers, setTrailers] = useState<TrailerData[]>([]);
  const [tours, setTours] = useState<TourData[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Fetch licenses on mount
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

  // Fetch stats when license is selected
  useEffect(() => {
    if (!selectedLicenseId) {
      setStats(null);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        // Fetch counts for each entity type
        const [vehiclesRes, trailersRes, driversRes, chargesRes, toursRes, usersRes] = await Promise.all([
          supabase.from('user_vehicles').select('id', { count: 'exact' }).eq('license_id', selectedLicenseId),
          supabase.from('user_trailers').select('id', { count: 'exact' }).eq('license_id', selectedLicenseId),
          supabase.from('user_drivers').select('id', { count: 'exact' }).eq('license_id', selectedLicenseId),
          supabase.from('user_charges').select('id', { count: 'exact' }).eq('license_id', selectedLicenseId),
          supabase.from('saved_tours').select('id', { count: 'exact' }).eq('license_id', selectedLicenseId),
          supabase.from('company_users').select('id', { count: 'exact' }).eq('license_id', selectedLicenseId).eq('is_active', true),
        ]);

        setStats({
          vehicleCount: vehiclesRes.count || 0,
          trailerCount: trailersRes.count || 0,
          driverCount: driversRes.count || 0,
          chargeCount: chargesRes.count || 0,
          tourCount: toursRes.count || 0,
          userCount: usersRes.count || 0,
        });

        // Fetch detailed data
        const [vehiclesData, trailersData, toursData] = await Promise.all([
          supabase.from('user_vehicles').select('*').eq('license_id', selectedLicenseId).order('created_at', { ascending: false }),
          supabase.from('user_trailers').select('*').eq('license_id', selectedLicenseId).order('created_at', { ascending: false }),
          supabase.from('saved_tours').select('*').eq('license_id', selectedLicenseId).order('created_at', { ascending: false }),
        ]);

        // Get user emails for mapping
        const { data: companyUsers } = await supabase
          .from('company_users')
          .select('user_id, email')
          .eq('license_id', selectedLicenseId);
        
        const userEmailMap = new Map(companyUsers?.map(u => [u.user_id, u.email]) || []);

        setVehicles((vehiclesData.data || []).map(v => ({
          id: v.id,
          name: v.name,
          license_plate: v.license_plate || '',
          brand: v.brand,
          model: v.model,
          vehicle_type: v.vehicle_type,
          current_km: v.current_km,
          user_email: userEmailMap.get(v.user_id),
          created_at: v.created_at,
        })));

        setTrailers((trailersData.data || []).map(t => ({
          id: t.id,
          name: t.name,
          license_plate: t.license_plate,
          brand: t.brand,
          model: t.model,
          trailer_type: t.trailer_type,
          user_email: userEmailMap.get(t.user_id),
          created_at: t.created_at,
        })));

        setTours((toursData.data || []).map(t => ({
          id: t.id,
          name: t.name,
          origin_address: t.origin_address,
          destination_address: t.destination_address,
          distance_km: t.distance_km,
          total_cost: t.total_cost,
          revenue: t.revenue || 0,
          profit_margin: t.profit_margin,
          user_id: t.user_id,
          created_at: t.created_at,
        })));
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Erreur lors du chargement des statistiques');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [selectedLicenseId]);

  const selectedLicense = licenses.find(l => l.id === selectedLicenseId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Données des Sociétés
        </CardTitle>
        <CardDescription>
          Visualisez les véhicules, remorques, tournées et autres données par société
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License selector */}
        <div className="flex items-center gap-4">
          <Select
            value={selectedLicenseId || ''}
            onValueChange={setSelectedLicenseId}
          >
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder="Sélectionner une société..." />
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
          {selectedLicenseId && (
            <Button variant="outline" size="icon" onClick={() => setSelectedLicenseId(selectedLicenseId)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Stats overview */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats && selectedLicense ? (
          <>
            {/* Company info header */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedLicense.company_name || 'Sans nom'}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLicense.email}</p>
                </div>
                <Badge variant="secondary">{stats.userCount} utilisateur(s)</Badge>
              </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('vehicles')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Truck className="h-4 w-4" />
                    <span className="text-sm">Véhicules</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.vehicleCount}</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('trailers')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Container className="h-4 w-4" />
                    <span className="text-sm">Remorques</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.trailerCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Conducteurs</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.driverCount}</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab('tours')}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Route className="h-4 w-4" />
                    <span className="text-sm">Tournées</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.tourCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Charges</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.chargeCount}</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed data tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList>
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="vehicles">Véhicules ({vehicles.length})</TabsTrigger>
                <TabsTrigger value="trailers">Remorques ({trailers.length})</TabsTrigger>
                <TabsTrigger value="tours">Tournées ({tours.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="text-center py-8 text-muted-foreground">
                  <p>Cliquez sur un onglet pour voir les détails</p>
                </div>
              </TabsContent>

              <TabsContent value="vehicles" className="mt-4">
                {vehicles.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Aucun véhicule</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Immatriculation</TableHead>
                        <TableHead>Marque/Modèle</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Kilométrage</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vehicles.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell>{v.license_plate}</TableCell>
                          <TableCell>{v.brand} {v.model}</TableCell>
                          <TableCell><Badge variant="outline">{v.vehicle_type}</Badge></TableCell>
                          <TableCell>{v.current_km?.toLocaleString('fr-FR')} km</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.user_email || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(v.created_at), 'dd/MM/yy', { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="trailers" className="mt-4">
                {trailers.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Aucune remorque</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Immatriculation</TableHead>
                        <TableHead>Marque/Modèle</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Créé par</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trailers.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell>{t.license_plate || '-'}</TableCell>
                          <TableCell>{t.brand} {t.model}</TableCell>
                          <TableCell><Badge variant="outline">{t.trailer_type}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.user_email || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(t.created_at), 'dd/MM/yy', { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="tours" className="mt-4">
                {tours.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Aucune tournée</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Trajet</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Coût</TableHead>
                        <TableHead>Recette</TableHead>
                        <TableHead>Marge</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tours.map(t => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {t.origin_address} → {t.destination_address}
                          </TableCell>
                          <TableCell>{t.distance_km?.toFixed(0)} km</TableCell>
                          <TableCell>{formatCurrency(t.total_cost)}</TableCell>
                          <TableCell>{formatCurrency(t.revenue)}</TableCell>
                          <TableCell>
                            <Badge variant={t.profit_margin && t.profit_margin >= 15 ? 'default' : 'destructive'}>
                              {t.profit_margin?.toFixed(1) || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(t.created_at), 'dd/MM/yy', { locale: fr })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </>
        ) : selectedLicenseId ? (
          <p className="text-center py-8 text-muted-foreground">Sélectionnez une société pour voir les données</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
