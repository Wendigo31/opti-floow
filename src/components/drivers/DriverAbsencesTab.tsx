import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, CalendarOff, Stethoscope, HardHat, Palmtree, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDriverAbsences, type DriverAbsence } from '@/hooks/useDriverAbsences';
import type { Driver } from '@/types';
import { format, differenceInDays, parseISO, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DriverAbsencesTabProps {
  allDrivers: Driver[];
}

const ABSENCE_TYPES = {
  maladie: { label: 'Arrêt maladie', icon: Stethoscope, color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  accident_travail: { label: 'Accident de travail', icon: HardHat, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  conges: { label: 'Congés', icon: Palmtree, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  autre: { label: 'Autre', icon: HelpCircle, color: 'bg-muted text-muted-foreground' },
} as const;

export function DriverAbsencesTab({ allDrivers }: DriverAbsencesTabProps) {
  const { absences, loading, createAbsence, updateAbsence, deleteAbsence } = useDriverAbsences();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<DriverAbsence | null>(null);
  const [formData, setFormData] = useState({
    driver_id: '',
    absence_type: 'maladie' as DriverAbsence['absence_type'],
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const driverMap = useMemo(() => {
    const map = new Map<string, string>();
    allDrivers.forEach(d => map.set(d.id, d.name));
    return map;
  }, [allDrivers]);

  const filteredAbsences = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return absences.filter(a => {
      if (filterType !== 'all' && a.absence_type !== filterType) return false;
      if (filterStatus === 'active') {
        if (a.end_date && a.end_date < today) return false;
      }
      if (filterStatus === 'past') {
        if (!a.end_date || a.end_date >= today) return false;
      }
      return true;
    });
  }, [absences, filterType, filterStatus]);

  // Current absences grouped by driver for the status indicator
  const activeAbsences = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return absences.filter(a => a.start_date <= today && (!a.end_date || a.end_date >= today));
  }, [absences]);

  const openAddDialog = () => {
    setEditingAbsence(null);
    setFormData({ driver_id: '', absence_type: 'maladie', start_date: '', end_date: '', notes: '' });
    setIsDialogOpen(true);
  };

  const openEditDialog = (absence: DriverAbsence) => {
    setEditingAbsence(absence);
    setFormData({
      driver_id: absence.driver_id,
      absence_type: absence.absence_type,
      start_date: absence.start_date,
      end_date: absence.end_date || '',
      notes: absence.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.driver_id || !formData.start_date) return;
    setSaving(true);
    try {
      if (editingAbsence) {
        await updateAbsence(editingAbsence.id, {
          absence_type: formData.absence_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
        });
      } else {
        await createAbsence({
          driver_id: formData.driver_id,
          absence_type: formData.absence_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
        });
      }
      setIsDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer cette absence ?')) {
      await deleteAbsence(id);
    }
  };

  const getAbsenceDuration = (start: string, end: string | null) => {
    if (!end) return 'En cours';
    const days = differenceInDays(parseISO(end), parseISO(start)) + 1;
    return `${days} jour${days > 1 ? 's' : ''}`;
  };

  const isAbsenceActive = (absence: DriverAbsence) => {
    const today = new Date().toISOString().split('T')[0];
    return absence.start_date <= today && (!absence.end_date || absence.end_date >= today);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active absences summary */}
      {activeAbsences.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-4">
          <h3 className="font-medium text-orange-800 dark:text-orange-300 mb-2 flex items-center gap-2">
            <CalendarOff className="h-4 w-4" />
            {activeAbsences.length} conducteur{activeAbsences.length > 1 ? 's' : ''} actuellement absent{activeAbsences.length > 1 ? 's' : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeAbsences.map(a => {
              const typeInfo = ABSENCE_TYPES[a.absence_type];
              const Icon = typeInfo.icon;
              return (
                <Badge key={a.id} variant="outline" className="gap-1">
                  <Icon className="h-3 w-3" />
                  {driverMap.get(a.driver_id) || 'Inconnu'} — {typeInfo.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters + Add button */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Type d'absence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="maladie">Arrêt maladie</SelectItem>
            <SelectItem value="accident_travail">Accident de travail</SelectItem>
            <SelectItem value="conges">Congés</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">En cours</SelectItem>
            <SelectItem value="past">Terminé</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Déclarer une absence
        </Button>
      </div>

      {/* Table */}
      {filteredAbsences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucune absence enregistrée</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conducteur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Début</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAbsences.map(absence => {
                const typeInfo = ABSENCE_TYPES[absence.absence_type];
                const Icon = typeInfo.icon;
                const active = isAbsenceActive(absence);
                return (
                  <TableRow key={absence.id} className={active ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}>
                    <TableCell className="font-medium">
                      {driverMap.get(absence.driver_id) || 'Conducteur inconnu'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${typeInfo.color}`} variant="secondary">
                        <Icon className="h-3 w-3" />
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(parseISO(absence.start_date), 'dd MMM yyyy', { locale: fr })}</TableCell>
                    <TableCell>
                      {absence.end_date
                        ? format(parseISO(absence.end_date), 'dd MMM yyyy', { locale: fr })
                        : <Badge variant="outline" className="text-orange-600">En cours</Badge>
                      }
                    </TableCell>
                    <TableCell>{getAbsenceDuration(absence.start_date, absence.end_date)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs">
                      {absence.notes || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(absence)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(absence.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAbsence ? 'Modifier l\'absence' : 'Déclarer une absence'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingAbsence && (
              <div className="space-y-2">
                <Label>Conducteur</Label>
                <Select value={formData.driver_id} onValueChange={v => setFormData({ ...formData, driver_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un conducteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {allDrivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Type d'absence</Label>
              <Select value={formData.absence_type} onValueChange={v => setFormData({ ...formData, absence_type: v as DriverAbsence['absence_type'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maladie">🩺 Arrêt maladie</SelectItem>
                  <SelectItem value="accident_travail">🦺 Accident de travail</SelectItem>
                  <SelectItem value="conges">🌴 Congés</SelectItem>
                  <SelectItem value="autre">❓ Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date de fin (optionnelle)</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !formData.driver_id || !formData.start_date} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingAbsence ? 'Mettre à jour' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
