import {
  Layers,
  Moon,
  Sun,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MontageResponse } from '@/types/lineMontage';

interface LineMontageResultsProps {
  loading: boolean;
  result: MontageResponse | null;
  expandedScenario: number | null;
  setExpandedScenario: (idx: number | null) => void;
  formatCurrency: (value: number) => string;
}

/**
 * Résultats du montage de ligne (recommandation, scénarios détaillés,
 * avertissements, conseils) — colonne droite. Extrait de
 * src/components/ai/LineMontageTab.tsx pour alléger ce fichier —
 * comportement identique.
 */
export function LineMontageResults({
  loading,
  result,
  expandedScenario,
  setExpandedScenario,
  formatCurrency,
}: LineMontageResultsProps) {
  return (
    <div className="space-y-4">
      {loading && (
        <div className="glass-card p-12 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">L'IA analyse les rotations et le respect RSE…</p>
        </div>
      )}

      {result && (
        <>
          {/* Recommendation */}
          <div className="glass-card p-5 border-l-4 border-l-primary opacity-0 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Recommandation</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{result.recommendation.summary}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground">Coût hebdo</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(result.recommendation.estimatedWeeklyCost)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground">Coût mensuel</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(result.recommendation.estimatedMonthlyCost)}
                </p>
              </div>
            </div>
          </div>

          {/* Scenarios */}
          {result.scenarios?.map((scenario, idx) => (
            <div
              key={idx}
              className={cn(
                'glass-card p-5 opacity-0 animate-slide-up cursor-pointer transition-all',
                scenario.isRecommended && 'border-l-4 border-l-green-500',
              )}
              style={{ animationDelay: `${100 + idx * 50}ms`, animationFillMode: 'forwards' }}
              onClick={() => setExpandedScenario(expandedScenario === idx ? null : idx)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm">{scenario.name}</h4>
                  {scenario.isRecommended && (
                    <Badge variant="default" className="text-xs">Recommandé</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-primary">{formatCurrency(scenario.totalCost)}</span>
                  {expandedScenario === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {scenario.driverCount} conducteur{scenario.driverCount > 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1">{scenario.overnightStays ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />} {scenario.overnightStays ? 'Avec découché' : 'Sans découché'}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {scenario.totalDuration}h</span>
              </div>

              {/* RSE status */}
              <div className="flex items-center gap-1 text-xs">
                {scenario.rseCompliance?.valid ? (
                  <><Shield className="w-3 h-3 text-green-500" /><span className="text-green-600">RSE conforme</span></>
                ) : (
                  <><AlertTriangle className="w-3 h-3 text-amber-500" /><span className="text-amber-600">Attention RSE</span></>
                )}
              </div>

              {expandedScenario === idx && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  {/* Cost breakdown */}
                  <div>
                    <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Détail des coûts</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Carburant</span><span>{formatCurrency(scenario.costBreakdown.fuel)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Péages</span><span>{formatCurrency(scenario.costBreakdown.tolls)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Conducteurs</span><span>{formatCurrency(scenario.costBreakdown.drivers)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Repas</span><span>{formatCurrency(scenario.costBreakdown.meals)}</span></div>
                      {scenario.overnightStays && (
                        <div className="flex justify-between"><span className="text-muted-foreground">Découché</span><span>{formatCurrency(scenario.costBreakdown.overnight)}</span></div>
                      )}
                      <div className="flex justify-between"><span className="text-muted-foreground">Véhicule</span><span>{formatCurrency(scenario.costBreakdown.vehicleCost)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Structure</span><span>{formatCurrency(scenario.costBreakdown.structureCost)}</span></div>
                    </div>
                  </div>

                  {/* Weekly schedule */}
                  {scenario.weeklySchedule?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Planning hebdomadaire</h5>
                      <div className="space-y-2">
                        {scenario.weeklySchedule.map((day, dIdx) => (
                          <div key={dIdx} className="p-2 rounded bg-muted/30">
                            <p className="text-xs font-semibold mb-1">{day.day}</p>
                            {day.segments.map((seg, sIdx) => (
                              <div key={sIdx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono">{seg.startTime}-{seg.endTime}</span>
                                <Badge variant="outline" className="text-[10px]">{seg.driver}</Badge>
                                <span>{seg.activity}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pros / Cons */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h5 className="text-xs font-semibold text-green-600 mb-1">Avantages</h5>
                      {scenario.pros?.map((p, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> {p}
                        </p>
                      ))}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-amber-600 mb-1">Inconvénients</h5>
                      {scenario.cons?.map((c, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" /> {c}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* RSE notes */}
                  {scenario.rseCompliance?.notes?.length > 0 && (
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Notes RSE
                      </h5>
                      {scenario.rseCompliance.notes.map((n, i) => (
                        <p key={i} className="text-xs text-muted-foreground">• {n}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div className="glass-card p-4 border-l-4 border-l-amber-500">
              <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Avertissements
              </h4>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {w}</p>
              ))}
            </div>
          )}

          {/* Tips */}
          {result.tips?.length > 0 && (
            <div className="glass-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1 mb-2">
                <Lightbulb className="w-4 h-4 text-primary" /> Conseils
              </h4>
              {result.tips.map((t, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {t}</p>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !result && (
        <div className="glass-card p-12 flex flex-col items-center gap-4 text-center">
          <Layers className="w-12 h-12 text-muted-foreground/30" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Créez votre montage de ligne</h3>
            <p className="text-sm text-muted-foreground">
              Configurez les paramètres à gauche puis cliquez sur "Générer le montage" pour obtenir
              un plan optimisé avec rotations conducteurs et respect RSE.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              L'IA utilise vos données réelles : véhicules, conducteurs (CDI/CDD/Intérim), charges fixes et variables.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
