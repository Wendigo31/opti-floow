import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter,
  Building2,
  User,
  Loader2,
  Send,
  RefreshCw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AccessRequest {
  id: string;
  company_user_id: string;
  license_id: string;
  requested_features: string[];
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_display_name?: string;
  company_name?: string;
}

interface License {
  id: string;
  company_name: string | null;
  email: string;
}

interface Props {
  getAdminToken: () => string | null;
}

// Feature labels for display
const FEATURE_LABELS: Record<string, string> = {
  ai_optimization: 'Optimisation IA',
  ai_pdf_analysis: 'Analyse PDF IA',
  page_dashboard: 'Tableau de bord',
  page_calculator: 'Calculateur',
  page_itinerary: 'Itinéraire',
  page_tours: 'Tournées',
  page_clients: 'Clients',
  page_vehicles: 'Véhicules',
  page_drivers: 'Conducteurs',
  page_charges: 'Charges',
  page_forecast: 'Prévisionnel',
  page_ai_analysis: 'Analyse IA',
  btn_export_pdf: 'Export PDF',
  btn_export_excel: 'Export Excel',
  multi_drivers: 'Multi-conducteurs',
  multi_users: 'Multi-utilisateurs',
  saved_tours: 'Tournées sauvegardées',
};

export function AccessRequestsManager({ getAdminToken }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

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

  // Fetch access requests.
  // NOTE (corrigé le 10/10) : la connexion au panneau admin (code secret) n'ouvre
  // aucune vraie session Supabase Auth, seulement un jeton interne — les anciens
  // appels directs `.from('access_requests')`/`.from('company_users')` ici étaient
  // donc bloqués par RLS (auth.uid() = NULL) et ne renvoyaient jamais rien. On passe
  // par l'edge function (service-role, autorisation via le jeton admin) à la place.
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const token = getAdminToken();
      if (!token) throw new Error('Session admin expirée');

      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { action: 'list-access-requests', adminToken: token },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erreur inconnue');

      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les demandes',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleProcessRequest = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Même raison que fetchRequests ci-dessus : le panneau admin n'a pas de vraie
      // session Supabase, donc ni la RPC `process_access_request` (qui revérifie
      // auth.uid() en interne) ni l'upsert direct sur user_feature_overrides ne
      // pouvaient fonctionner depuis ici. L'edge function fait les deux, en
      // service-role, avec l'autorisation déjà validée par le jeton admin.
      const token = getAdminToken();
      if (!token) throw new Error('Session admin expirée');

      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: {
          action: 'process-access-request',
          adminToken: token,
          requestId: selectedRequest.id,
          status,
          comment: adminComment || null,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erreur inconnue');

      toast({
        title: status === 'approved' ? 'Demande approuvée' : 'Demande refusée',
        description: status === 'approved' 
          ? 'Les accès ont été accordés à l\'utilisateur'
          : 'La demande a été refusée',
      });

      setSelectedRequest(null);
      setAdminComment('');
      fetchRequests();
    } catch (err) {
      console.error('Error processing request:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la demande',
        variant: 'destructive',
      });
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approuvée
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Refusée
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Apply filters
  const filteredRequests = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (companyFilter !== 'all' && r.license_id !== companyFilter) return false;
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Demandes d'accès
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {pendingCount} en attente
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Gérez les demandes d'accès aux fonctionnalités de vos utilisateurs
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="approved">Approuvées</SelectItem>
                  <SelectItem value="rejected">Refusées</SelectItem>
                </SelectContent>
              </Select>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Société" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sociétés</SelectItem>
                  {licenses.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.company_name || l.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requests list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune demande trouvée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${
                    request.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'
                  }`}
                  onClick={() => {
                    setSelectedRequest(request);
                    setAdminComment(request.admin_comment || '');
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{request.user_display_name || request.user_email}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Building2 className="w-3 h-3" />
                        <span>{request.company_name || 'Sans société'}</span>
                        <span className="text-xs">•</span>
                        <span>{format(new Date(request.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {request.requested_features.map(f => (
                          <Badge key={f} variant="secondary" className="text-xs">
                            {FEATURE_LABELS[f] || f}
                          </Badge>
                        ))}
                      </div>
                      {request.message && (
                        <p className="mt-2 text-sm text-muted-foreground italic">
                          "{request.message}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process request dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Traiter la demande</DialogTitle>
            <DialogDescription>
              Demande de {selectedRequest?.user_display_name || selectedRequest?.user_email}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Fonctionnalités demandées :</p>
                <div className="flex flex-wrap gap-1">
                  {selectedRequest.requested_features.map(f => (
                    <Badge key={f} variant="secondary">
                      {FEATURE_LABELS[f] || f}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedRequest.message && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-1">Message :</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.message}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Commentaire (optionnel)</Label>
                <Textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder="Ajouter un commentaire pour l'utilisateur..."
                  rows={3}
                  disabled={selectedRequest.status !== 'pending'}
                />
              </div>

              {selectedRequest.status !== 'pending' && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Traité le {format(new Date(selectedRequest.processed_at!), 'dd MMM yyyy HH:mm', { locale: fr })}
                    {selectedRequest.admin_comment && (
                      <span className="block mt-1 italic">"{selectedRequest.admin_comment}"</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {selectedRequest?.status === 'pending' ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleProcessRequest('rejected')}
                  disabled={processing}
                  className="text-destructive"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
                <Button
                  onClick={() => handleProcessRequest('approved')}
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approuver
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
