import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DriverCard } from '@/components/drivers/DriverCard';
import { DriverTable } from '@/components/drivers/DriverTable';
import type { DriverContractType, ExtendedDriver } from '@/types/driver';

interface SharedDriverInfo {
  licenseId?: string;
  userId?: string;
  isFormerMember?: boolean;
  displayName?: string;
  userEmail?: string;
}

interface EmptyStateConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel: string;
}

interface DriverCategoryTabProps {
  driverType: DriverContractType;
  /** Liste déjà filtrée/triée pour l'affichage. */
  drivers: ExtendedDriver[];
  /** Vrai s'il existe au moins un conducteur de cette catégorie (avant filtre de recherche), pour l'état vide. */
  hasAnyDriver: boolean;
  viewMode: 'grid' | 'list';
  showAddForm: boolean;
  /** Vrai si un ajout est en cours sur N'IMPORTE quelle catégorie (masque l'état vide, comme avant l'extraction). */
  isAddingAnywhere: boolean;
  /** Le <DriverForm /> à afficher pour l'ajout, et réutilisé comme editForm des cartes. */
  formSlot: ReactNode;
  emptyState: EmptyStateConfig;
  onAdd: () => void;
  isEditingDriver: (driver: ExtendedDriver, driverType: DriverContractType) => boolean;
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
 * Contenu d'un onglet de catégorie de conducteurs (CDI/CDD/Intérim/Joker/Autre).
 * Remplace les 5 blocs quasi identiques auparavant dupliqués dans
 * src/pages/Drivers.tsx — comportement identique pour chaque catégorie.
 */
export function DriverCategoryTab({
  driverType,
  drivers,
  hasAnyDriver,
  viewMode,
  showAddForm,
  isAddingAnywhere,
  formSlot,
  emptyState,
  onAdd,
  isEditingDriver,
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
}: DriverCategoryTabProps) {
  const EmptyIcon = emptyState.icon;

  return (
    <>
      {showAddForm && formSlot}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {drivers.map((driver, index) => {
            const driverInfo = getDriverInfo(driver.id);
            const isOwn = driverInfo ? isOwnData(driverInfo.userId) : true;
            return (
              <DriverCard
                key={driver.id}
                driver={driver}
                index={index}
                driverType={driverType}
                isEditing={isEditingDriver(driver, driverType)}
                editForm={formSlot}
                isSelected={selectedDriverIds.includes(driver.id)}
                isChecked={checkedDriverIds.has(driver.id)}
                onToggleCheck={onToggleCheck}
                onEdit={onEdit}
                onDelete={onDelete}
                formatCurrency={formatCurrency}
                calculateEmployerCost={calculateEmployerCost}
                isCompanyMember={isCompanyMember}
                driverInfo={driverInfo}
                isOwn={isOwn}
              />
            );
          })}
        </div>
      ) : (
        drivers.length > 0 && (
          <DriverTable
            drivers={drivers}
            driverType={driverType}
            selectedDriverIds={selectedDriverIds}
            checkedDriverIds={checkedDriverIds}
            onToggleCheck={onToggleCheck}
            onToggleSelectAll={onToggleSelectAll}
            onEdit={onEdit}
            onDelete={onDelete}
            formatCurrency={formatCurrency}
            calculateEmployerCost={calculateEmployerCost}
            isCompanyMember={isCompanyMember}
            getDriverInfo={getDriverInfo}
            isOwnData={isOwnData}
          />
        )
      )}

      {!hasAnyDriver && !isAddingAnywhere && (
        <div className="glass-card p-12 text-center">
          <EmptyIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">{emptyState.title}</h3>
          <p className="text-muted-foreground mb-4">{emptyState.description}</p>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 mr-2" />
            {emptyState.ctaLabel}
          </Button>
        </div>
      )}
    </>
  );
}
