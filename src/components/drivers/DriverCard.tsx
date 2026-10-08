import type { ReactNode } from 'react';
import { User, Users2, Edit2, Trash2, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SharedDataBadge } from '@/components/shared/SharedDataBadge';
import { cn } from '@/lib/utils';
import type { DriverContractType, ExtendedDriver } from '@/types/driver';

interface SharedDriverInfo {
  licenseId?: string;
  userId?: string;
  isFormerMember?: boolean;
  displayName?: string;
  userEmail?: string;
}

interface DriverCardProps {
  driver: ExtendedDriver;
  index: number;
  driverType: DriverContractType;
  isEditing: boolean;
  /** Formulaire d'édition (DriverForm) affiché à la place de la carte quand isEditing est vrai. */
  editForm: ReactNode;
  isSelected: boolean;
  isChecked: boolean;
  onToggleCheck: (id: string) => void;
  onEdit: (driver: ExtendedDriver, isInterim: boolean) => void;
  onDelete: (id: string, driverType: DriverContractType) => void;
  formatCurrency: (value: number) => string;
  calculateEmployerCost: (driver: ExtendedDriver) => number;
  isCompanyMember: boolean;
  driverInfo: SharedDriverInfo | undefined;
  isOwn: boolean;
}

/**
 * Carte d'un conducteur (CDI/CDD/Intérim/Joker/Autre). Extraite de
 * src/pages/Drivers.tsx pour alléger ce fichier — comportement identique,
 * y compris les champs affichés selon le type de contrat.
 */
export function DriverCard({
  driver,
  index,
  driverType,
  isEditing,
  editForm,
  isSelected,
  isChecked,
  onToggleCheck,
  onEdit,
  onDelete,
  formatCurrency,
  calculateEmployerCost,
  isCompanyMember,
  driverInfo,
  isOwn,
}: DriverCardProps) {
  const isInterim = driverType === 'interim';
  const isShared = !!driverInfo?.licenseId;

  return (
    <div
      key={driver.id}
      className={cn(
        "glass-card p-6 opacity-0 animate-slide-up",
        isSelected && "ring-2 ring-primary/50",
        isChecked && "ring-2 ring-primary"
      )}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
    >
      {isEditing ? (
        editForm
      ) : (
        <>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={isChecked}
                onCheckedChange={() => onToggleCheck(driver.id)}
                className="mr-1"
              />
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isInterim ? "bg-orange-500/20" : "bg-purple-500/20"
              )}>
                {isInterim ? (
                  <Users2 className="w-6 h-6 text-orange-400" />
                ) : (
                  <User className="w-6 h-6 text-purple-400" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {driver.firstName && driver.lastName
                      ? `${driver.firstName} ${driver.lastName}`
                      : driver.name
                    }
                  </h3>
                  {driver.scheduleType === 'night' && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">Nuit</span>
                  )}
                  {driver.scheduleType === 'mixed' && (
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Mixte</span>
                  )}
                  {isCompanyMember && (
                    <TooltipProvider>
                      <SharedDataBadge
                        isShared={isShared}
                        isOwn={isOwn}
                        isFormerMember={driverInfo?.isFormerMember}
                        createdBy={driverInfo?.displayName}
                        createdByEmail={driverInfo?.userEmail}
                        compact
                      />
                    </TooltipProvider>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isInterim
                    ? `${driver.interimAgency || 'Intérim'} • ${formatCurrency(driver.interimHourlyRate || 0)}/h`
                    : `${formatCurrency(driver.baseSalary)} brut/mois`
                  }
                </p>
                {driver.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {driver.phone}
                  </p>
                )}
                {driver.assignedCity && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {driver.assignedCity}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(driver, driverType === 'interim'); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(driver.id, driverType); }}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {isInterim ? (
              <>
                <div>
                  <p className="text-muted-foreground">Taux horaire</p>
                  <p className="font-medium text-foreground">{formatCurrency(driver.interimHourlyRate || 0)}/h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Coefficient</p>
                  <p className="font-medium text-foreground">{driver.interimCoefficient || 1.85}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Heures/jour</p>
                  <p className="font-medium text-foreground">{driver.hoursPerDay || 10}h</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground">Taux horaire</p>
                  <p className="font-medium text-foreground">{formatCurrency(driver.hourlyRate || 0)}/h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Heures/jour</p>
                  <p className="font-medium text-foreground">{driver.hoursPerDay || 10}h</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jours/mois</p>
                  <p className="font-medium text-foreground">{driver.workingDaysPerMonth}</p>
                </div>
              </>
            )}
            <div>
              <p className="text-muted-foreground">Indemnité repas</p>
              <p className="font-medium text-foreground">{formatCurrency(driver.mealAllowance)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Indemnité découcher</p>
              <p className="font-medium text-foreground">{formatCurrency(driver.overnightAllowance)}</p>
            </div>
            {!isInterim && (
              <div>
                <p className="text-muted-foreground">Charges patronales</p>
                <p className="font-medium text-foreground">{driver.patronalCharges}%</p>
              </div>
            )}
          </div>
          {!isInterim && (driver.sundayBonus > 0 || driver.nightBonus > 0 || driver.seniorityBonus > 0) && (
            <div className="grid grid-cols-3 gap-4 text-sm mt-3 pt-3 border-t border-border/30">
              {driver.sundayBonus > 0 && (
                <div>
                  <p className="text-muted-foreground">Prime dimanche</p>
                  <p className="font-medium text-success">{formatCurrency(driver.sundayBonus)}</p>
                </div>
              )}
              {driver.nightBonus > 0 && (
                <div>
                  <p className="text-muted-foreground">Prime nuit</p>
                  <p className="font-medium text-success">{formatCurrency(driver.nightBonus)}</p>
                </div>
              )}
              {driver.seniorityBonus > 0 && (
                <div>
                  <p className="text-muted-foreground">Prime ancienneté</p>
                  <p className="font-medium text-success">{formatCurrency(driver.seniorityBonus)}</p>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {isInterim ? 'Coût agence mensuel' : 'Coût employeur mensuel'}
              </span>
              <span className="font-bold text-primary">
                {formatCurrency(calculateEmployerCost(driver))}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
