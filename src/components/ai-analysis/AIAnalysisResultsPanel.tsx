import type { ReactNode } from 'react';
import {
  Sparkles,
  TrendingDown,
  Route,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Fuel,
  Moon,
  Loader2,
  RefreshCw,
  Calendar,
  Timer,
  ArrowRightLeft,
  Award,
  Shield,
  Navigation,
  Save,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VisualSchedule } from '@/components/ai/VisualSchedule';
import { AIRouteMap } from '@/components/ai/AIRouteMap';
import type { AIResponse } from '@/types/aiAnalysis';

interface AIAnalysisResultsPanelProps {
  result: AIResponse | null;
  loading: boolean;
  saving: boolean;
  origin: string;
  destination: string;
  getStopsForAPI: () => string[];
  handleSaveAsNewTour: () => void | Promise<void>;
  onCreateQuote?: () => void;
  formatCurrency: (value: number) => string;
  expandedSection: string | null;
  toggleSection: (section: string) => void;
  getStrategyIcon: (type: string, timing: string) => ReactNode;
  getStrategyColor: (isRecommended: boolean) => string;
}

/**
 * Panneau de droite (résultats de l'analyse IA) de la page Analyse IA.
 * Extrait de src/pages/AIAnalysis.tsx pour alléger ce fichier —
 * comportement identique, y compris les sections repliables.
 */
export function AIAnalysisResultsPanel({
  result,
  loading,
  saving,
  origin,
  destination,
  getStopsForAPI,
  handleSaveAsNewTour,
  onCreateQuote,
  formatCurrency,
  expandedSection,
  toggleSection,
  getStrategyIcon,
  getStrategyColor,
}: AIAnalysisResultsPanelProps) {
  return (
    <div className="space-y-4">
      {!result && !loading && (
        <div className="glass-card p-8 text-center opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-foreground mb-2">Prêt pour l'analyse</h3>
          <p className="text-sm text-muted-foreground mb-4">
            L'IA va analyser les meilleures stratégies: solo vs relais, jour vs nuit, et proposer les points de relais optimaux.
          </p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-2 bg-secondary/50 rounded">
              <ArrowRightLeft className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p>Points de relais</p>
            </div>
            <div className="p-2 bg-secondary/50 rounded">
              <Moon className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p>Horaires optimaux</p>
            </div>
            <div className="p-2 bg-secondary/50 rounded">
              <TrendingDown className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p>Économies max</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="glass-card p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="font-semibold text-foreground mb-2">Analyse en cours...</h3>
          <p className="text-sm text-muted-foreground">
            L'IA calcule les stratégies de relais, les horaires optimaux et les points d'arrêt...
          </p>
        </div>
      )}

      {result && (
        <>
          {/* Save Action Bar */}
          <div className="glass-card p-4 opacity-0 animate-slide-up border-l-4 border-l-success" style={{ animationDelay: '25ms', animationFillMode: 'forwards' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div>
                  <p className="font-medium text-foreground">Analyse terminée</p>
                  <p className="text-xs text-muted-foreground">
                    {result.recommendation.strategy && (
                      <Badge variant="outline" className="mr-2 text-xs">
                        {result.recommendation.strategy}
                      </Badge>
                    )}
                    Économie: {formatCurrency(result.recommendation.savings)} ({result.recommendation.savingsPercent?.toFixed(0) || 0}%)
                  </p>
                </div>
              </div>
              <Button
                onClick={handleSaveAsNewTour}
                disabled={saving}
                variant="gradient"
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </>
                )}
              </Button>
              {onCreateQuote && (
                <Button onClick={onCreateQuote} variant="outline" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Générer un devis
                </Button>
              )}
            </div>
          </div>

          {/* Interactive Map */}
          <div className="opacity-0 animate-slide-up" style={{ animationDelay: '40ms', animationFillMode: 'forwards' }}>
            <AIRouteMap
              origin={origin}
              destination={destination}
              stops={getStopsForAPI()}
              relayPoints={result.relayPlan?.relayPoints || []}
              segments={result.routeDetails?.segments || []}
            />
          </div>

          {/* Visual Schedule Timeline */}
          {result.routeDetails?.segments && result.routeDetails.segments.length > 0 && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '45ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Planning horaire</h3>
              </div>
              <VisualSchedule
                segments={result.routeDetails.segments}
                departureTime={result.routeDetails.departureTime}
                arrivalTime={result.routeDetails.arrivalTime}
              />
            </div>
          )}

          {/* Recommendation */}
          <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
            <button
              onClick={() => toggleSection('recommendation')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-success" />
                <h3 className="font-semibold text-foreground">Recommandation IA</h3>
              </div>
              {expandedSection === 'recommendation' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedSection === 'recommendation' && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted-foreground">{result.recommendation.summary}</p>
                {result.recommendation.comparedTo && (
                  <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
                    Comparé à: {result.recommendation.comparedTo}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Coût optimisé</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(result.recommendation.estimatedCost)}</p>
                  </div>
                  <div className="p-3 bg-success/10 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Économies</p>
                    <p className="text-xl font-bold text-success">
                      {formatCurrency(result.recommendation.savings)}
                    </p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-lg font-semibold">{result.recommendation.estimatedDistance} km</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">Durée</p>
                    <p className="text-lg font-semibold">{result.recommendation.estimatedDuration?.toFixed(1) || 0}h</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Strategies Comparison */}
          {result.strategies && result.strategies.length > 0 && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '75ms', animationFillMode: 'forwards' }}>
              <button
                onClick={() => toggleSection('strategies')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Comparaison des stratégies</h3>
                </div>
                {expandedSection === 'strategies' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === 'strategies' && (
                <div className="mt-4 space-y-3">
                  {result.strategies.map((strategy, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border transition-all",
                        getStrategyColor(strategy.isRecommended)
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon(strategy.type, strategy.timing)}
                          <span className="font-medium">{strategy.name}</span>
                          {strategy.isRecommended && (
                            <Badge className="bg-success text-white text-xs">Recommandé</Badge>
                          )}
                        </div>
                        <span className="font-bold text-primary">{formatCurrency(strategy.totalCost)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-muted-foreground">Durée:</span> {strategy.totalDuration}h
                        </div>
                        <div>
                          <span className="text-muted-foreground">Carburant:</span> {formatCurrency(strategy.breakdown.fuel)}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Conducteurs:</span> {formatCurrency(strategy.breakdown.drivers)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {strategy.pros.slice(0, 2).map((pro, i) => (
                          <span key={i} className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                            + {pro}
                          </span>
                        ))}
                        {strategy.cons.slice(0, 1).map((con, i) => (
                          <span key={i} className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded">
                            - {con}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Relay Plan */}
          {result.relayPlan && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
              <button
                onClick={() => toggleSection('relay')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Plan de relais</h3>
                  {result.relayPlan.isRecommended && (
                    <Badge className="bg-success text-white text-xs">Recommandé</Badge>
                  )}
                </div>
                {expandedSection === 'relay' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === 'relay' && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-muted-foreground">{result.relayPlan.reason}</p>

                  {result.relayPlan.relayPoints.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">Points de relais:</p>
                      {result.relayPlan.relayPoints.map((point, idx) => (
                        <div key={idx} className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-primary" />
                              <span className="font-medium">{point.location}</span>
                            </div>
                            <Badge variant="outline">{point.km} km</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>
                              <span className="text-foreground">{point.driverOut}</span> → <span className="text-foreground">{point.driverIn}</span>
                            </div>
                            <div className="text-right">
                              {point.estimatedTime} • Attente: {point.waitTime}min
                            </div>
                          </div>
                          {point.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{point.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between p-2 bg-success/10 rounded text-sm">
                    <span>Économie vs solo:</span>
                    <span className="font-bold text-success">{formatCurrency(result.relayPlan.savingsVsSolo)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Time Optimization */}
          {result.timeOptimization && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '125ms', animationFillMode: 'forwards' }}>
              <button
                onClick={() => toggleSection('time')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Optimisation du temps</h3>
                </div>
                {expandedSection === 'time' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === 'time' && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">Standard</p>
                      <p className="font-semibold">{result.timeOptimization.standardDuration}h</p>
                    </div>
                    <div className="p-2 bg-success/10 rounded">
                      <p className="text-xs text-muted-foreground">Optimisé</p>
                      <p className="font-semibold text-success">{result.timeOptimization.optimizedDuration}h</p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded">
                      <p className="text-xs text-muted-foreground">Gagné</p>
                      <p className="font-semibold text-primary">-{result.timeOptimization.timeSaved}h</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.timeOptimization.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Cost Breakdown */}
          {result.costBreakdown && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
              <button
                onClick={() => toggleSection('costs')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-warning" />
                  <h3 className="font-semibold text-foreground">Détail des coûts</h3>
                </div>
                {expandedSection === 'costs' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === 'costs' && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Carburant</span>
                    <span>{formatCurrency(result.costBreakdown.fuel)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Péages</span>
                    <span>{formatCurrency(result.costBreakdown.tolls)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Conducteurs</span>
                    <span>{formatCurrency(result.costBreakdown.drivers)}</span>
                  </div>
                  {result.costBreakdown.driverBonuses !== undefined && result.costBreakdown.driverBonuses > 0 && (
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Primes (nuit/dimanche)</span>
                      <span>{formatCurrency(result.costBreakdown.driverBonuses)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Repas</span>
                    <span>{formatCurrency(result.costBreakdown.meals)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/30">
                    <span className="text-muted-foreground">Nuitées</span>
                    <span>{formatCurrency(result.costBreakdown.overnight)}</span>
                  </div>
                  {result.costBreakdown.vehicleCost !== undefined && (
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Véhicule</span>
                      <span>{formatCurrency(result.costBreakdown.vehicleCost)}</span>
                    </div>
                  )}
                  {result.costBreakdown.structureCost !== undefined && (
                    <div className="flex justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Structure</span>
                      <span>{formatCurrency(result.costBreakdown.structureCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(result.costBreakdown.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Route Details */}
          {result.routeDetails && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '175ms', animationFillMode: 'forwards' }}>
              <button
                onClick={() => toggleSection('route')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Route className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Détail du parcours</h3>
                </div>
                {expandedSection === 'route' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === 'route' && (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Départ recommandé</span>
                    <span className="font-medium">{result.routeDetails.departureTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Arrivée estimée</span>
                    <span className="font-medium">{result.routeDetails.arrivalTime}</span>
                  </div>
                  <div className="space-y-2 mt-3">
                    {result.routeDetails.segments.map((seg, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-2 rounded text-xs",
                          seg.type === 'relay' ? 'bg-primary/20 border border-primary/30' :
                          seg.type === 'rest' ? 'bg-warning/20 border border-warning/30' :
                          'bg-secondary/50'
                        )}
                      >
                        <div className="flex justify-between">
                          <span className="font-medium">{seg.from} → {seg.to}</span>
                          <span>{seg.distance}km • {seg.duration}h</span>
                        </div>
                        <div className="flex justify-between mt-1 text-muted-foreground">
                          {seg.driver && <span>Conducteur: {seg.driver}</span>}
                          {seg.startTime && seg.endTime && (
                            <span>{seg.startTime} - {seg.endTime}</span>
                          )}
                        </div>
                        {seg.notes && <p className="text-muted-foreground mt-1">{seg.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Optimizations */}
          {result.optimizations && result.optimizations.length > 0 && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <button
                onClick={() => toggleSection('optimizations')}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-success" />
                  <h3 className="font-semibold text-foreground">Optimisations appliquées</h3>
                </div>
                {expandedSection === 'optimizations' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSection === 'optimizations' && (
                <div className="mt-4 space-y-2">
                  {result.optimizations.map((opt, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-success/10 rounded">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm">{opt.description}</p>
                          {opt.impact && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                opt.impact === 'high' ? 'border-success text-success' :
                                opt.impact === 'medium' ? 'border-warning text-warning' :
                                'border-muted-foreground'
                              )}
                            >
                              {opt.impact}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-success">Économie: {formatCurrency(opt.savings)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Regulatory Notes */}
          {result.regulatoryNotes && result.regulatoryNotes.length > 0 && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '225ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Notes réglementaires (RSE)</h3>
              </div>
              <div className="space-y-2">
                {result.regulatoryNotes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-primary/10 rounded text-sm">
                    <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips & Warnings */}
          {(result.tips?.length || result.warnings?.length) && (
            <div className="glass-card p-5 opacity-0 animate-slide-up" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
              {result.warnings && result.warnings.length > 0 && (
                <div className="mb-4">
                  {result.warnings.map((warning, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-warning/10 rounded mb-2">
                      <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                      <p className="text-sm">{warning}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.tips && result.tips.length > 0 && (
                <div>
                  {result.tips.map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-primary/10 rounded mb-2">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5" />
                      <p className="text-sm">{tip}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
