import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Settings,
  LogIn,
  Loader2,
  Eye,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from '@/components/ui/alert-dialog';
import type { PlanType } from '@/hooks/useLicense';
import type { License } from '@/types/admin';

interface AdminLicensesTabProps {
  licenses: License[];
  companyUserCounts: Record<string, number>;
  loading: boolean;
  fetchLicenses: () => void;
  openCreateDialog: () => void;
  setSelectedLicenseForDetail: (license: License) => void;
  setUserDetailOpen: (open: boolean) => void;
  loginAsUser: (license: License) => void;
  openLimitsEditor: (license: License) => void;
  openEditDialog: (license: License) => void;
  toggleLicenseStatus: (id: string, currentStatus: boolean) => void;
  deleteLicense: (id: string) => void;
  getPlanIcon: (plan: string | null) => JSX.Element;
  getPlanBadgeClass: (plan: string | null) => string;
}

/**
 * Onglet "Licences" : stats, recherche/filtres, et table des licences.
 * Extrait de src/pages/Admin.tsx pour alléger ce fichier — comportement
 * identique. Les filtres (recherche, statut, forfait) sont désormais un
 * état purement local à cet onglet, comme ils l'étaient déjà
 * fonctionnellement dans le fichier d'origine.
 */
export function AdminLicensesTab({
  licenses,
  companyUserCounts,
  loading,
  fetchLicenses,
  openCreateDialog,
  setSelectedLicenseForDetail,
  setUserDetailOpen,
  loginAsUser,
  openLimitsEditor,
  openEditDialog,
  toggleLicenseStatus,
  deleteLicense,
  getPlanIcon,
  getPlanBadgeClass,
}: AdminLicensesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterPlan] = useState<'all' | PlanType>('all');

  const filteredLicenses = licenses.filter(license => {
    const matchesSearch =
      license.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      license.license_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (license.company_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && license.is_active) ||
      (filterStatus === 'inactive' && !license.is_active);
    const matchesPlan = filterPlan === 'all' || license.plan_type === filterPlan;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const stats = {
    total: licenses.length,
    active: licenses.filter(l => l.is_active).length,
    inactive: licenses.filter(l => !l.is_active).length,
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total licences</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Actives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Désactivées</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actifs</SelectItem>
            <SelectItem value="inactive">Inactifs</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchLicenses} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle licence
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Licence</TableHead>
              <TableHead>Société</TableHead>
              <TableHead>Forfait</TableHead>
              <TableHead>Utilisateurs</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredLicenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucune licence trouvée
                </TableCell>
              </TableRow>
            ) : (
              filteredLicenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell>
                    <div>
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                        {license.company_identifier || license.license_code}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">{license.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{license.company_name || '-'}</p>
                    {license.city && <p className="text-xs text-muted-foreground">{license.city}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("gap-1", getPlanBadgeClass(license.plan_type))}>
                      {getPlanIcon(license.plan_type)}
                      {'optiflow'.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {companyUserCounts[license.id] || 0}/{license.max_users || '∞'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={license.is_active ? "default" : "secondary"}>
                      {license.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedLicenseForDetail(license); setUserDetailOpen(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => loginAsUser(license)}>
                        <LogIn className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openLimitsEditor(license)}>
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(license)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleLicenseStatus(license.id, license.is_active)}>
                        {license.is_active ? <XCircle className="w-4 h-4 text-orange-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la licence ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible. La licence <strong>{license.license_code}</strong> sera supprimée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteLicense(license.id)} className="bg-destructive text-destructive-foreground">
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
      </Card>
    </>
  );
}
