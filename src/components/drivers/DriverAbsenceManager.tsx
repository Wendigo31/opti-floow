import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarOff,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDriverAbsences, type DriverAbsence } from '@/hooks/useDriverAbsences';
import { useNotifications } from '@/hooks/useNotifications';

const ABSENCE_LABELS: Record<DriverAbsence['absence_type'], string> = {
  maladie: 'Maladie',
  accident_travail: 'Accident du travail',
  conges: 'Congés',
  autre: 'Autre',
};

const ABSENCE_COLORS: Record<DriverAbsence['absence_type'], string> = {
  maladie: 'bg-red-500/10 text-red-700 border-red-500/30',
  accident_travail: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
  conges: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  autre: 'bg-muted text-muted-foreground border-border',
};

interface DriverAbsenceManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName: string;
}

export function DriverAbsenceManager({
  open,
  onOpenChange,
  driverId,
  driverName,
}: DriverAbsenceManagerProps) {
  const { absences, createAbsence, deleteAbsence } = useDriverAbsences();
  const { broadcast } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<DriverAbsence['absence_type']>('maladie');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const driverAbsences = absences.filter((a) => a.driver_id === driverId);

  const handleSave = async () => {
    if (!startDate) return;
    setSaving(true);
    const ok = await createAbsence({
      driver_id: driverId,
      absence_type: type,
      start_date: startDate,
      end_date: endDate || null,
      notes: notes || null,
    });
    if (ok) {
      // Notify all team members
      await broadcast({
        event_type: 'driver_absence',
        title: `Absence : ${driverName}`,
        message: `${ABSENCE_LABELS[type]} du ${format(new Date(startDate), 'dd/MM/yyyy', { locale: fr })}${endDate ? ` au ${format(new Date(endDate), 'dd/MM/yyyy', { locale: fr })}` : ''}. Vérifiez le planning si remplacement nécessaire.`,
        link_url: '/planning',
        entity_id: driverId,
      });
      setShowForm(false);
      setNotes('');
      setEndDate('');
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-amber-500" />
            Absences — {driverName}
          </DialogTitle>
          <DialogDescription>
            Toute absence créée déclenche une notification à toute l'équipe et marquera ce conducteur comme indisponible sur le planning.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add form */}
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full gap-2" variant="outline">
              <Plus className="h-4 w-4" />
              Déclarer une absence
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as DriverAbsence['absence_type'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ABSENCE_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date de début *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Date de fin (optionnel)</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Justificatif, certificat, remplaçant prévu..."
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button onClick={handleSave} disabled={saving || !startDate}>
                  Enregistrer
                </Button>
              </div>
            </div>
          )}

          {/* Existing absences */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Historique ({driverAbsences.length})
            </Label>
            {driverAbsences.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune absence enregistrée
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {driverAbsences.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-md border bg-card"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={ABSENCE_COLORS[a.absence_type]}>
                          {ABSENCE_LABELS[a.absence_type]}
                        </Badge>
                        <span className="text-sm font-medium">
                          {format(new Date(a.start_date), 'dd/MM/yyyy', { locale: fr })}
                          {a.end_date && (
                            <> → {format(new Date(a.end_date), 'dd/MM/yyyy', { locale: fr })}</>
                          )}
                        </span>
                      </div>
                      {a.notes && (
                        <p className="text-xs text-muted-foreground">{a.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteAbsence(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Sur la page Planning, ce conducteur sera signalé en cas de mission planifiée durant son absence si aucun remplaçant n'est défini.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
