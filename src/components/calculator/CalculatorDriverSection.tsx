import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useApp } from '@/context/AppContext';
import { useCloudDrivers } from '@/hooks/useCloudDrivers';
import { useExploitationMetrics } from '@/hooks/useExploitationMetrics';
import type { useCalculations } from '@/hooks/useCalculations';

interface CalculatorDriverSectionProps {
  formatCurrency: (value: number) => string;
  costs: ReturnType<typeof useCalculations>;
}

/**
 * Sélection des conducteurs (ajout, liste compacte avec coût employeur,
 * total journalier) de la page Calculateur. Extraite de
 * src/pages/Calculator.tsx pour alléger ce fichier — comportement
 * identique, y compris le masquage du coût par rôle.
 */
export function CalculatorDriverSection({ formatCurrency, costs }: CalculatorDriverSectionProps) {
  const { selectedDriverIds, setSelectedDriverIds } = useApp();
  const { cdiDrivers, cddDrivers, interimDrivers, autreDrivers, jokerDrivers } = useCloudDrivers();
  const drivers = [...cdiDrivers, ...cddDrivers, ...interimDrivers, ...autreDrivers, ...jokerDrivers];
  const { canExploitationView, isDirection } = useExploitationMetrics();

  const selectedDrivers = drivers.filter(d => selectedDriverIds.includes(d.id));

  const toggleDriver = (driverId: string) => {
    if (selectedDriverIds.includes(driverId)) {
      setSelectedDriverIds(selectedDriverIds.filter(id => id !== driverId));
    } else {
      setSelectedDriverIds([...selectedDriverIds, driverId]);
    }
  };

  return (
    <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">Conducteurs</h2>
          <p className="text-xs text-muted-foreground">{selectedDriverIds.length} sélectionné(s)</p>
        </div>
        {selectedDriverIds.length > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedDriverIds([])}>
            Tout retirer
          </Button>
        )}
      </div>

      {drivers.length === 0 ? (
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Aucun conducteur configuré.</p>
          <Link to="/drivers" className="text-xs text-primary hover:underline mt-1 inline-block">Ajouter un conducteur</Link>
        </div>
      ) : (
        <>
          {/* Dropdown to add drivers */}
          <SearchableSelect
            value=""
            onValueChange={(id) => {
              if (id && !selectedDriverIds.includes(id)) {
                setSelectedDriverIds([...selectedDriverIds, id]);
              }
            }}
            options={drivers
              .filter(d => !selectedDriverIds.includes(d.id))
              .map(d => ({
                value: d.id,
                label: d.name,
                sublabel: d.contractType?.toUpperCase() || 'CDI',
              }))}
            placeholder="+ Ajouter un conducteur..."
            emptyLabel="Aucun"
            searchPlaceholder="Rechercher un conducteur..."
            allowClear={false}
          />

          {/* Selected drivers compact list with employer cost */}
          {selectedDrivers.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {selectedDrivers.map(driver => {
                const isInterim = driver.contractType === 'interim';
                const isAutre = driver.contractType === 'autre';

                let monthlyEmployerCost = 0;
                let totalDaily = 0;

                if (isAutre) {
                  // No cost
                } else if (isInterim) {
                  const interimRate = driver.interimHourlyRate || driver.hourlyRate || 0;
                  const coefficient = driver.interimCoefficient || 1.85;
                  const hoursPerDay = driver.hoursPerDay || 7;
                  totalDaily = interimRate * coefficient * hoursPerDay + (driver.mealAllowance || 0);
                  monthlyEmployerCost = totalDaily * driver.workingDaysPerMonth;
                } else {
                  monthlyEmployerCost = driver.baseSalary * (1 + driver.patronalCharges / 100);
                  const dailyRate = monthlyEmployerCost / driver.workingDaysPerMonth;
                  const dailyBonuses = ((driver.nightBonus || 0) + (driver.sundayBonus || 0) + (driver.seniorityBonus || 0)) / driver.workingDaysPerMonth;
                  const dailyAllowances = (driver.mealAllowance || 0) + (driver.overnightAllowance || 0);
                  totalDaily = dailyRate + dailyBonuses + dailyAllowances;
                }

                return (
                  <div key={driver.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{driver.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                          {driver.contractType?.toUpperCase() || 'CDI'}
                        </span>
                      </div>
                      {(isDirection || canExploitationView('can_view_driver_cost')) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{formatCurrency(monthlyEmployerCost)}/mois chargé</span>
                          <span className="text-primary font-medium">{formatCurrency(totalDaily)}/jour</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleDriver(driver.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Retirer"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                );
              })}
              {/* Total driver cost summary */}
              {selectedDrivers.length > 1 && (isDirection || canExploitationView('can_view_driver_cost')) && (
                <div className="flex justify-between items-center pt-1.5 border-t border-border/30 text-xs">
                  <span className="text-muted-foreground">Total conducteurs/jour</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(costs.driverCost + costs.driverBonuses + costs.driverAllowances)}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
