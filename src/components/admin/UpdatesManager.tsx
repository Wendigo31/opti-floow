import { useState, useEffect } from 'react';
import { 
  Download, 
  Plus, 
  Trash2, 
  Upload, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Package,
  BarChart3,
  Filter,
  TrendingUp,
  Monitor,
  Apple,
  Laptop
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  downloadUrl: string;
  signature: string;
  platform: string;
}

const emptyFormData: UpdateFormData = {
  version: '',
  releaseNotes: '',
  downloadUrl: '',
  signature: '',
  platform: 'windows-x86_64',
};

const PLATFORMS = [
  { value: 'windows-x86_64', label: 'Windows (x64)', icon: Monitor },
  { value: 'darwin-x86_64', label: 'macOS Intel', icon: Apple },
  { value: 'darwin-aarch64', label: 'macOS Apple Silicon', icon: Apple },
  { value: 'linux-x86_64', label: 'Linux (x64)', icon: Laptop },
];

export function UpdatesManager() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [stats, setStats] = useState<UpdateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<UpdateFormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
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
      if (data?.updates) {
        setUpdates(data.updates);
      }
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast.error('Erreur lors du chargement des mises à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.version || !formData.downloadUrl) {
      toast.error('Version et URL de téléchargement requis');
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
          downloadUrl: formData.downloadUrl,
          signature: formData.signature || null,
          platform: formData.platform,
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
      toast.success(`Mise à jour ${!currentStatus ? 'activée' : 'désactivée'}`);
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
      fetchUpdates(); // Refresh stats
    } catch (error) {
      console.error('Error deleting update:', error);
      toast.error('Erreur lors de la suppression');
    }
  };


  const openEditDialog = (update: AppUpdate) => {
    setFormData({
      version: update.version,
      releaseNotes: update.release_notes || '',
      downloadUrl: update.download_url || '',
      signature: update.signature || '',
      platform: update.platform,
    });
    setEditingId(update.id);
    setDialogOpen(true);
  };

  const resetDialog = () => {
    setFormData(emptyFormData);
    setEditingId(null);
    setDialogOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier');
  };

  const getUpdateEndpoint = () => {
    // Use the Supabase URL from the client or fall back to env variable
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    // Extract project ID from URL: https://xxx.supabase.co -> xxx
    const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectId = match ? match[1] : import.meta.env.VITE_SUPABASE_PROJECT_ID;
    return projectId ? `https://${projectId}.supabase.co/functions/v1/manage-updates` : 'URL non configurée';
  };

  const getPlatformIcon = (platform: string) => {
    const p = PLATFORMS.find(pl => pl.value === platform);
    if (p) {
      const Icon = p.icon;
      return <Icon className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  // Filter updates
  const filteredUpdates = updates.filter(update => {
    const matchesPlatform = filterPlatform === 'all' || update.platform === filterPlatform;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && update.is_active) ||
      (filterStatus === 'inactive' && !update.is_active);
    return matchesPlatform && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total versions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.active} actives
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Téléchargements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDownloads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total cumulé
              </p>
            </CardContent>
          </Card>
          
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Par plateforme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.byPlatform).map(([platform, data]) => {
                  const platformInfo = PLATFORMS.find(p => p.value === platform);
                  return (
                    <div key={platform} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                      {getPlatformIcon(platform)}
                      <div>
                        <div className="text-sm font-medium">
                          {platformInfo?.label || platform}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {data.count} versions • {data.downloads} DL
                        </div>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(stats.byPlatform).length === 0 && (
                  <span className="text-sm text-muted-foreground">Aucune donnée</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Endpoint Info */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Endpoint Tauri Updater</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Configurez cet endpoint dans votre <code className="bg-muted px-1 rounded">tauri.conf.json</code> :
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border overflow-x-auto">
            {getUpdateEndpoint()}
          </code>
          <Button 
            size="icon" 
            variant="outline"
            onClick={() => copyToClipboard(getUpdateEndpoint())}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          L'app Tauri vérifiera automatiquement les mises à jour à cet endpoint.
        </p>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Plateforme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les plateformes</SelectItem>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Select value={filterStatus} onValueChange={(v: 'all' | 'active' | 'inactive') => setFilterStatus(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
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
              Nouvelle version
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Modifier la version' : 'Publier une nouvelle version'}
              </DialogTitle>
              <DialogDescription>
                {editingId 
                  ? 'Modifiez les informations de cette version' 
                  : 'Ajoutez une nouvelle version pour le déploiement automatique'}
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
                <p className="text-xs text-muted-foreground">Format semver : major.minor.patch</p>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label htmlFor="platform">Plateforme</Label>
                <Select 
                  value={formData.platform} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, platform: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Download URL */}
              <div className="space-y-2">
                <Label htmlFor="downloadUrl">URL de téléchargement *</Label>
                <Input
                  id="downloadUrl"
                  placeholder="https://github.com/user/repo/releases/download/v1.0.0/app.msi"
                  value={formData.downloadUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, downloadUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  URL directe vers le fichier .msi, .exe, .dmg ou .AppImage
                </p>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label htmlFor="signature">Signature (optionnel)</Label>
                <Textarea
                  id="signature"
                  placeholder="Signature du fichier pour vérification..."
                  value={formData.signature}
                  onChange={(e) => setFormData(prev => ({ ...prev, signature: e.target.value }))}
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Signature générée par Tauri lors du build
                </p>
              </div>

              {/* Release Notes */}
              <div className="space-y-2">
                <Label htmlFor="releaseNotes">Notes de version</Label>
                <Textarea
                  id="releaseNotes"
                  placeholder="Nouveautés, corrections de bugs..."
                  value={formData.releaseNotes}
                  onChange={(e) => setFormData(prev => ({ ...prev, releaseNotes: e.target.value }))}
                  rows={3}
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
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {editingId ? 'Enregistrer' : 'Publier'}
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
              <TableHead>Plateforme</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Téléchargements</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredUpdates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {updates.length === 0 ? 'Aucune mise à jour publiée' : 'Aucun résultat avec ces filtres'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUpdates.map((update) => (
                <TableRow key={update.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="font-mono font-semibold">v{update.version}</span>
                    </div>
                    {update.release_notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {update.release_notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      {getPlatformIcon(update.platform)}
                      {PLATFORMS.find(p => p.value === update.platform)?.label || update.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(update.pub_date), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{(update.download_count || 0).toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {update.is_active ? (
                      <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {update.download_url && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => window.open(update.download_url!, '_blank')}
                          title="Ouvrir l'URL"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(update)}
                        title="Modifier"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant={update.is_active ? "ghost" : "default"}
                        onClick={() => toggleActive(update.id, update.is_active)}
                        title={update.is_active ? "Désactiver" : "Activer"}
                      >
                        {update.is_active ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
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
                            <AlertDialogTitle>Supprimer cette version ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La version {update.version} sera définitivement supprimée.
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
