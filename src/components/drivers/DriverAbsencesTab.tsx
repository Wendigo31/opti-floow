import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, CalendarOff, Stethoscope, HardHat, Palmtree, HelpCircle, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useDriverAbsences, type DriverAbsence } from '@/hooks/useDriverAbsences';
import { useNotifications } from '@/hooks/useNotifications';
import type { Driver } from '@/types';
import { format, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DriverAbsencesTabProps {
  allDrivers: Driver[];
}

// Extended list of absence types
const ABSENCE_TYPES: Record<string, { label: string; emoji: string; color: string }> = {
  conges_payes: { label: 'Congés payés', emoji: '🌴', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  conges_sans_solde: { label: 'Congé sans solde', emoji: '📅', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400' },
  conge_sabbatique: { label: 'Congé sabbatique', emoji: '🧘', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' },
  conge_parental: { label: 'Congé de présence parentale', emoji: '👶', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  mariage_pacs: { label: 'Mariage ou PACS du salarié', emoji: '💍', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400' },
  naissance_adoption: { label: 'Naissance ou adoption', emoji: '🍼', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  deces_proche: { label: 'Décès d\'un proche', emoji: '🕊️', color: 'bg-gray-200 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400' },
  formation_pro: { label: 'Formation professionnelle', emoji: '📚', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  formation_syndicale: { label: 'Congé de formation économique, sociale et syndicale', emoji: '🎓', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' },
  convocation_judiciaire: { label: 'Convocation judiciaire', emoji: '⚖️', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  retard_injustifie: { label: 'Retard ou absence injustifiée', emoji: '⚠️', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  greve: { label: 'Grève', emoji: '✊', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  demenagement: { label: 'Déménagement', emoji: '📦', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  rdv_medical: { label: 'Rendez-vous médicaux', emoji: '🏥', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  maladie: { label: 'Arrêt maladie', emoji: '🩺', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  accident_travail: { label: 'Accident du travail', emoji: '🦺', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  maladie_pro: { label: 'Maladie professionnelle', emoji: '🏭', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  conge_maternite: { label: 'Congé maternité', emoji: '🤰', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  conge_paternite: { label: 'Congé paternité et d\'accueil de l\'enfant', emoji: '👨‍🍼', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  conge_adoption: { label: 'Congé d\'adoption', emoji: '🤱', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400' },
  conge_enfant_malade: { label: 'Congé pour enfant malade', emoji: '🧒', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  // legacy
  conges: { label: 'Congés', emoji: '🌴', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  autre: { label: 'Autre', emoji: '❓', color: 'bg-muted text-muted-foreground' },
};

const getTypeInfo = (type: string) => ABSENCE_TYPES[type] || ABSENCE_TYPES.autre;

export function DriverAbsencesTab({ allDrivers }: DriverAbsencesTabProps) {
  const { absences, loading, createAbsence, updateAbsence, deleteAbsence } = useDriverAbsences();
  const { broadcast } = useNotifications();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<DriverAbsence | null>(null);
  const [formData, setFormData] = useState({
    driver_id: '',
    absence_type: 'conges_payes',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [driverSearch, setDriverSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const driverMap = useMemo(() => {
    const map = new Map<string, string>();
    allDrivers.forEach(d => map.set(d.id, d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim()));
    return map;
  }, [allDrivers]);

  const filteredDriversForSelect = useMemo(() => {
    const q = driverSearch.toLowerCase().trim();
    if (!q) return allDrivers;
    return allDrivers.filter(d => {
      const name = (d.name || `${d.firstName || ''} ${d.lastName || ''}`).toLowerCase();
      return name.includes(q);
    });
  }, [allDrivers, driverSearch]);

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

  const activeAbsences = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return absences.filter(a => a.start_date <= today && (!a.end_date || a.end_date >= today));
  }, [absences]);

  const openAddDialog = () => {
    setEditingAbsence(null);
    setFormData({ driver_id: '', absence_type: 'conges_payes', start_date: '', end_date: '', notes: '' });
    setDriverSearch('');
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
        const ok = await createAbsence({
          driver_id: formData.driver_id,
          absence_type: formData.absence_type,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
        });
        if (ok) {
          const driverName = driverMap.get(formData.driver_id) || 'Conducteur';
          const typeLabel = getTypeInfo(formData.absence_type).label;
          await broadcast({
            event_type: 'driver_absence',
            title: `Absence : ${driverName}`,
            message: `${typeLabel} du ${format(parseISO(formData.start_date), 'dd/MM/yyyy', { locale: fr })}${formData.end_date ? ` au ${format(parseISO(formData.end_date), 'dd/MM/yyyy', { locale: fr })}` : ''}.`,
            link_url: '/planning',
            entity_id: formData.driver_id,
          });
        }
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

  // Build unique types present in data + dropdown options
  const allTypeKeys = Object.keys(ABSENCE_TYPES).filter(k => k !== 'conges' && k !== 'autre');
  const typeOptions = [...allTypeKeys, 'autre'];

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
              const typeInfo = getTypeInfo(a.absence_type);
              return (
                <Badge key={a.id} variant="outline" className="gap-1">
                  <span>{typeInfo.emoji}</span>
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
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Type d'absence" />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value="all">Tous les types</SelectItem>
            {typeOptions.map(k => (
              <SelectItem key={k} value={k}>{ABSENCE_TYPES[k].emoji} {ABSENCE_TYPES[k].label}</SelectItem>
            ))}
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
                const typeInfo = getTypeInfo(absence.absence_type);
                const active = isAbsenceActive(absence);
                return (
                  <TableRow key={absence.id} className={active ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}>
                    <TableCell className="font-medium">
                      {driverMap.get(absence.driver_id) || 'Conducteur inconnu'}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('gap-1', typeInfo.color)} variant="secondary">
                        <span>{typeInfo.emoji}</span>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAbsence ? 'Modifier l\'absence' : 'Déclarer une absence'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingAbsence && (
              <div className="space-y-2">
                <Label>Conducteur</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un conducteur par nom..."
                    value={driverSearch}
                    onChange={e => setDriverSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md border bg-card">
                  {filteredDriversForSelect.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun conducteur trouvé</p>
                  ) : (
                    filteredDriversForSelect.map(d => {
                      const name = d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Sans nom';
                      const selected = formData.driver_id === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, driver_id: d.id })}
                          className={cn(
                            'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between',
                            selected && 'bg-accent font-medium'
                          )}
                        >
                          <span>{name}</span>
                          {d.contractType && (
                            <span className="text-[10px] uppercase text-muted-foreground">{d.contractType}</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Type d'absence</Label>
              <Select value={formData.absence_type} onValueChange={v => setFormData({ ...formData, absence_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {typeOptions.map(k => (
                    <SelectItem key={k} value={k}>
                      {ABSENCE_TYPES[k].emoji} {ABSENCE_TYPES[k].label}
                    </SelectItem>
                  ))}
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
