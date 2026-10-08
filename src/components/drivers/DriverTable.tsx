import { User, Users2, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface DriverTableProps {
  drivers: ExtendedDriver[];
  driverType: DriverContractType;
  selectedDriverIds: string[];
  checkedDriverIds: Set<string>;
  onToggleCheck: (id: string) => void;
  onToggleSelectAll: (ids: string[], select: boolean) => void;
  onEdit: (driver: ExtendedDriver, isInterim: boolean) => void;
  onDelete: (id: string, driverType: DriverContractType) => void;
  formatCurrency: (value: number) => string;
  calculateEmployerCost: (driver: ExtendedDriver) => number;
  isCompanyMember: boolean;
  getDriverInfo: (id: string) => SharedDriverInfo | undefined;
  isOwnData: (userId?: string) => boolean;
}

/**
 * Vue tableau des conducteurs d'une catégorie (CDI/CDD/Intérim/Joker/Autre).
 * Extraite de src/pages/Drivers.tsx pour alléger ce fichier — comportement
 * identique.
 */
export function DriverTable({
  drivers,
  driverType,
  selectedDriverIds,
  checkedDriverIds,
  onToggleCheck,
  onToggleSelectAll,
  onEdit,
  onDelete,
  formatCurrency,
  calculateEmployerCost,
  isCompanyMember,
  getDriverInfo,
  isOwnData,
}: DriverTableProps) {
  const isInterim = driverType === 'interim';

  return (
    <div className="glass-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={drivers.length > 0 && drivers.every(d => checkedDriverIds.has(d.id))}
                  onCheckedChange={(checked) => onToggleSelectAll(drivers.map(d => d.id), !!checked)}
                />
                Conducteur
              </div>
            </TableHead>
            <TableHead>{isInterim ? 'Agence' : 'Contrat'}</TableHead>
            <TableHead>Taux horaire</TableHead>
            <TableHead>Heures/jour</TableHead>
            <TableHead>Jours/mois</TableHead>
            <TableHead className="text-right">Coût mensuel</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => {
            const driverInfo = getDriverInfo(driver.id);
            const isShared = !!driverInfo?.licenseId;
            const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;

            return (
              <TableRow key={driver.id} className={cn(
                selectedDriverIds.includes(driver.id) && "bg-primary/5",
                checkedDriverIds.has(driver.id) && "bg-primary/10"
              )}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={checkedDriverIds.has(driver.id)}
                      onCheckedChange={() => onToggleCheck(driver.id)}
                    />
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      isInterim ? "bg-orange-500/20" : "bg-purple-500/20"
                    )}>
                      {isInterim ? (
                        <Users2 className="w-4 h-4 text-orange-400" />
                      ) : (
                        <User className="w-4 h-4 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {driver.firstName && driver.lastName
                          ? `${driver.firstName} ${driver.lastName}`
                          : driver.name
                        }
                      </p>
                      {driver.phone && (
                        <span className="text-xs text-muted-foreground">{driver.phone}</span>
                      )}
                      {driver.scheduleType && driver.scheduleType !== 'day' && (
                        <span className={cn(
                          "text-xs px-1.5 py-0.5 rounded-full",
                          driver.scheduleType === 'night' ? "bg-indigo-500/20 text-indigo-400" : "bg-amber-500/20 text-amber-400"
                        )}>
                          {driver.scheduleType === 'night' ? 'Nuit' : 'Mixte'}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {isInterim ? (
                    <span className="text-sm text-muted-foreground">{driver.interimAgency || 'Intérim'}</span>
                  ) : (
                    <span className="text-sm">CDI</span>
                  )}
                </TableCell>
                <TableCell>
                  {isInterim
                    ? formatCurrency(driver.interimHourlyRate || 0)
                    : formatCurrency(driver.hourlyRate || 0)
                  }/h
                </TableCell>
                <TableCell>{driver.hoursPerDay || 10}h</TableCell>
                <TableCell>{driver.workingDaysPerMonth} j/mois</TableCell>
                <TableCell className="text-right font-medium text-primary">
                  {formatCurrency(calculateEmployerCost(driver))}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
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
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(driver, driverType === 'interim'); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete(driver.id, driverType); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
