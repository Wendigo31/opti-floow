import { useState, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Bell,
  Package,
  BarChart3,
  TrendingUp,
  Eye,
  FileText,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAdminToken } from '@/hooks/useAdminToken';

interface AppUpdate {
  id: string;
  version: string;
  release_notes: string | null;
  download_url: string | null;
  signature: string | null;
  pub_date: string;
  platform: string;
  is_active: boolean;
  created_at: string;
  download_count?: number;
}

interface UpdateStats {
  total: number;
  active: number;
  totalDownloads: number;
  byPlatform: Record<string, { count: number; active: number; downloads: number }>;
}

interface UpdateFormData {
  version: string;
  releaseNotes: string;
  isCritical: boolean;
}

const emptyFormData: UpdateFormData = {
  version: '',
  releaseNotes: '',
  isCritical: false,
};

export function PWAUpdatesManager() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [stats, setStats] = useState<UpdateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateFormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-updates', {
        body: { action: 'list' },
      });

      if (error) throw error;
      
      // Filter to only show PWA updates (platform = 'pwa')
      const pwaUpdates = (data?.updates || []).filter(
        (u: AppUpdate) => u.platform === 'pwa'
      );
      setUpdates(pwaUpdates);
      
      if (data?.stats) {
        // Recalculate stats for PWA only
        const pwaStats = {
          total: pwaUpdates.length,
          active: pwaUpdates.filter((u: AppUpdate) => u.is_active).length,
          totalDownloads: pwaUpdates.reduce((sum: number, u: AppUpdate) => sum + (u.download_count || 0), 0),
          byPlatform: { pwa: { count: pwaUpdates.length, active: pwaUpdates.filter((u: AppUpdate) => u.is_active).length, downloads: 0 } },
        };
        setStats(pwaStats);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error('Erreur lors du chargement des mises à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.version) {
      toast.error('Version requise');
      return;
    }

    const adminToken = getAdminToken();
    if (!adminToken) {
      toast.error('Session admin expirée, veuillez vous reconnecter');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('manage-updates', {
        body: {
          action: editingId ? 'update' : 'create',
          updateId: editingId,
          version: formData.version,
          releaseNotes: formData.releaseNotes || null,
          downloadUrl: formData.isCritical ? 'critical' : null,
          signature: formData.isCritical ? 'critical' : null,
          platform: 'pwa',
          adminToken,
        },
      });

      if (error) throw error;

      toast.success(editingId ? 'Mise à jour modifiée' : 'Mise à jour créée');
      fetchUpdates();
      resetDialog();
    } catch (error: any) {
      console.error('Error saving update:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (updateId: string, currentStatus: boolean) => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      toast.error('Session admin expirée');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('manage-updates', {
        body: { 
          action: 'toggle-active', 
          updateId, 
          isActive: !currentStatus,
          adminToken,
        },
      });

      if (error) throw error;

      setUpdates(prev => 
        prev.map(u => u.id === updateId ? { ...u, is_active: !currentStatus } : u)
      );
      
      if (!currentStatus) {
        toast.success('Mise à jour publiée - Les utilisateurs seront notifiés');
      } else {
        toast.success('Mise à jour masquée');
      }
    } catch (error) {
      console.error('Error toggling update:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const deleteUpdate = async (updateId: string) => {
    const adminToken = getAdminToken();
    if (!adminToken) {
      toast.error('Session admin expirée');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('manage-updates', {
        body: { action: 'delete', updateId, adminToken },
      });

      if (error) throw error;

      setUpdates(prev => prev.filter(u => u.id !== updateId));
      toast.success('Mise à jour supprimée');
      fetchUpdates();
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditDialog = (update: AppUpdate) => {
    setFormData({
      version: update.version,
      releaseNotes: update.release_notes || '',
      isCritical: update.download_url === 'critical',
    });
    setEditingId(update.id);
    setDialogOpen(true);
  };

  const resetDialog = () => {
    setFormData(emptyFormData);
    setEditingId(null);
    setDialogOpen(false);
  };

  const filteredUpdates = updates.filter(update => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return update.is_active;
    return !update.is_active;
  });

  const latestActiveVersion = updates
    .filter(u => u.is_active)
    .sort((a, b) => new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime())[0];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Notifications de mise à jour PWA</CardTitle>
          </div>
          <CardDescription>
            Publiez des annonces de mise à jour que les utilisateurs verront dans l'application.
            Les mises à jour actives seront affichées aux utilisateurs lors de leur prochaine visite.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total annonces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active} publiée{stats.active > 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Version active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {latestActiveVersion ? `v${latestActiveVersion.version}` : 'Aucune'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {latestActiveVersion 
                  ? format(new Date(latestActiveVersion.pub_date), 'dd MMM yyyy', { locale: fr })
                  : 'Pas de version publiée'
                }
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Vues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total cumulé
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'inactive') => setFilterStatus(v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="active">Publiées</SelectItem>
              <SelectItem value="inactive">Brouillons</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchUpdates} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) resetDialog();
          else setDialogOpen(true);
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setFormData(emptyFormData);
              setEditingId(null);
              setDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle annonce
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier l\'annonce' : 'Créer une annonce de mise à jour'}
              </DialogTitle>
              <DialogDescription>
                {editingId 
                  ? 'Modifiez les informations de cette annonce' 
                  : 'Informez vos utilisateurs d\'une nouvelle version de l\'application'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Version */}
              <div className="space-y-2">
                <Label htmlFor="version">Version *</Label>
                <Input
                  id="version"
                  placeholder="1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Format : major.minor.patch</p>
              </div>

              {/* Release Notes */}
              <div className="space-y-2">
                <Label htmlFor="releaseNotes">Notes de version</Label>
                <Textarea
                  id="releaseNotes"
                  placeholder="• Nouvelles fonctionnalités...
• Corrections de bugs...
• Améliorations..."
                  value={formData.releaseNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, releaseNotes: e.target.value }))}
                  rows={5}
                />
              </div>

              {/* Critical Update */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="critical" className="text-base">Mise à jour critique</Label>
                  <p className="text-sm text-muted-foreground">
                    Affiche un badge "Important" pour cette mise à jour
                  </p>
                </div>
                <Switch
                  id="critical"
                  checked={formData.isCritical}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isCritical: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {editingId ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Updates Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredUpdates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {updates.length === 0 ? 'Aucune annonce créée' : 'Aucun résultat avec ce filtre'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUpdates.map((update) => (
                <TableRow key={update.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono font-semibold">v{update.version}</span>
                      {update.download_url === 'critical' && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Important
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {update.release_notes ? (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {update.release_notes}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 italic">Aucune note</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(update.pub_date), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {update.is_active ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Publiée
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <FileText className="w-3 h-3 mr-1" />
                        Brouillon
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(update)}
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={update.is_active ? "ghost" : "default"}
                        onClick={() => toggleActive(update.id, update.is_active)}
                        title={update.is_active ? "Masquer" : "Publier"}
                      >
                        {update.is_active ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. L'annonce v{update.version} sera définitivement supprimée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUpdate(update.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
