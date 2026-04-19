import { useState, useMemo, useEffect } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useDriverAbsences } from '@/hooks/useDriverAbsences';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useLicenseContext } from '@/context/LicenseContext';
import type { Driver } from '@/types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const ABSENCE_TYPES: Record<string, { label: string; emoji: string }> = {
  conges_payes: { label: 'Congés payés', emoji: '🌴' },
  conges_sans_solde: { label: 'Congé sans solde', emoji: '📅' },
  conge_sabbatique: { label: 'Congé sabbatique', emoji: '🧘' },
  conge_parental: { label: 'Congé de présence parentale', emoji: '👶' },
  mariage_pacs: { label: 'Mariage ou PACS du salarié', emoji: '💍' },
  naissance_adoption: { label: 'Naissance ou adoption', emoji: '🍼' },
  deces_proche: { label: "Décès d'un proche", emoji: '🕊️' },
  formation_pro: { label: 'Formation professionnelle', emoji: '📚' },
  formation_syndicale: { label: 'Congé de formation économique, sociale et syndicale', emoji: '🎓' },
  convocation_judiciaire: { label: 'Convocation judiciaire', emoji: '⚖️' },
  retard_injustifie: { label: 'Retard ou absence injustifiée', emoji: '⚠️' },
  greve: { label: 'Grève', emoji: '✊' },
  demenagement: { label: 'Déménagement', emoji: '📦' },
  rdv_medical: { label: 'Rendez-vous médicaux', emoji: '🏥' },
  maladie: { label: 'Arrêt maladie', emoji: '🩺' },
  accident_travail: { label: 'Accident du travail', emoji: '🦺' },
  maladie_pro: { label: 'Maladie professionnelle', emoji: '🏭' },
  conge_maternite: { label: 'Congé maternité', emoji: '🤰' },
  conge_paternite: { label: "Congé paternité et d'accueil de l'enfant", emoji: '👨‍🍼' },
  conge_adoption: { label: "Congé d'adoption", emoji: '🤱' },
  conge_enfant_malade: { label: 'Congé pour enfant malade', emoji: '🧒' },
  autre: { label: 'Autre', emoji: '❓' },
};

interface DeclareAbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allDrivers: Driver[];
  initialDriverId?: string;
}

export function DeclareAbsenceDialog({ open, onOpenChange, allDrivers, initialDriverId }: DeclareAbsenceDialogProps) {
  const { createAbsence } = useDriverAbsences();
  const { broadcast } = useNotifications();

  const [formData, setFormData] = useState({
    driver_id: initialDriverId || '',
    absence_type: 'conges_payes',
    start_date: '',
    end_date: '',
    notes: '',
  });
  const [driverSearch, setDriverSearch] = useState('');
  const [contractFilter, setContractFilter] = useState<'all' | 'cdi' | 'cdd' | 'interim' | 'joker' | 'autre'>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        driver_id: initialDriverId || '',
        absence_type: 'conges_payes',
        start_date: '',
        end_date: '',
        notes: '',
      });
      setDriverSearch('');
      setContractFilter('all');
    }
  }, [open, initialDriverId]);

  const typeOptions = Object.keys(ABSENCE_TYPES);

  const filteredDrivers = useMemo(() => {
    const q = driverSearch.toLowerCase().trim();
    return allDrivers.filter(d => {
      if (contractFilter !== 'all' && (d.contractType || 'autre') !== contractFilter) return false;
      if (!q) return true;
      const name = (d.name || `${d.firstName || ''} ${d.lastName || ''}`).toLowerCase();
      return name.includes(q);
    });
  }, [allDrivers, driverSearch, contractFilter]);

  const driverMap = useMemo(() => {
    const map = new Map<string, string>();
    allDrivers.forEach(d => map.set(d.id, d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim()));
    return map;
  }, [allDrivers]);

  const handleSave = async () => {
    if (!formData.driver_id || !formData.start_date) return;
    setSaving(true);
    try {
      const ok = await createAbsence({
        driver_id: formData.driver_id,
        absence_type: formData.absence_type,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        notes: formData.notes || null,
      });
      if (ok) {
        const driverName = driverMap.get(formData.driver_id) || 'Conducteur';
        const typeLabel = (ABSENCE_TYPES[formData.absence_type] || ABSENCE_TYPES.autre).label;
        await broadcast({
          event_type: 'driver_absence',
          title: `Absence : ${driverName}`,
          message: `${typeLabel} du ${format(parseISO(formData.start_date), 'dd/MM/yyyy', { locale: fr })}${formData.end_date ? ` au ${format(parseISO(formData.end_date), 'dd/MM/yyyy', { locale: fr })}` : ''}.`,
          link_url: '/drivers',
          entity_id: formData.driver_id,
        });
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const contractTypes: Array<{ value: typeof contractFilter; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'cdi', label: 'CDI' },
    { value: 'cdd', label: 'CDD' },
    { value: 'interim', label: 'Intérim' },
    { value: 'joker', label: 'Joker' },
    { value: 'autre', label: 'Autre' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Déclarer une absence</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
            <div className="flex flex-wrap gap-1.5">
              {contractTypes.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setContractFilter(t.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs border transition-colors',
                    contractFilter === t.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border bg-card">
              {filteredDrivers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun conducteur trouvé</p>
              ) : (
                filteredDrivers.map(d => {
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !formData.driver_id || !formData.start_date} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
