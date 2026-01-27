import { useState } from 'react';
import { TrendingUp, TrendingDown, Sparkles, AlertTriangle, CheckCircle, Info, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCostPrediction, type MonthPrediction, type CostPredictionResult } from '@/hooks/useCostPrediction';
import { cn } from '@/lib/utils';

interface CostPredictionPanelProps {
  currentFuelPrice: number;
  currentTollCost: number;
  distanceKm: number;
  fuelConsumption: number;
}

export function CostPredictionPanel({
  currentFuelPrice,
  currentTollCost,
  distanceKm,
  fuelConsumption,
}: CostPredictionPanelProps) {
  const { loading, prediction, fetchPrediction, clearPrediction } = useCostPrediction();
  const [months] = useState(6);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'bg-success/20 text-success';
      case 'medium':
        return 'bg-warning/20 text-warning';
      case 'low':
        return 'bg-destructive/20 text-destructive';
    }
  };

  const getConfidenceLabel = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return 'Haute';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Faible';
    }
  };

  const handleGenerate = () => {
    fetchPrediction({
      currentFuelPrice,
      currentTollCost,
      distanceKm,
      fuelConsumption,
      months,
    });
  };

  if (!prediction) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Prédiction IA des coûts
          </CardTitle>
          <CardDescription>
            Estimez l'évolution des prix du carburant et des péages sur les prochains mois
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-center mb-4 max-w-md">
            Notre IA analyse les tendances du marché pour vous aider à anticiper les variations de coûts
          </p>
          <Button onClick={handleGenerate} disabled={loading || distanceKm <= 0} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Générer les prédictions
          </Button>
          {distanceKm <= 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Entrez une distance pour activer les prédictions
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Prédiction IA des coûts
            </CardTitle>
            <CardDescription>
              Projection sur {months} mois basée sur les tendances actuelles
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearPrediction}>
              Fermer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Variation carburant moy.</p>
            <p className={cn(
              "text-lg font-bold",
              prediction.summary.averageFuelChange >= 0 ? "text-destructive" : "text-success"
            )}>
              {formatPercent(prediction.summary.averageFuelChange)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Variation péages moy.</p>
            <p className={cn(
              "text-lg font-bold",
              prediction.summary.averageTollChange >= 0 ? "text-destructive" : "text-success"
            )}>
              {formatPercent(prediction.summary.averageTollChange)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10">
            <p className="text-xs text-muted-foreground">Scénario pessimiste</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(prediction.summary.worstCaseScenario)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-success/10">
            <p className="text-xs text-muted-foreground">Scénario optimiste</p>
            <p className="text-lg font-bold text-success">
              {formatCurrency(prediction.summary.bestCaseScenario)}
            </p>
          </div>
        </div>

        {/* Monthly Predictions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Prévisions mensuelles</h4>
          <div className="space-y-2">
            {prediction.predictions.map((pred) => (
              <div
                key={pred.month}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium w-20">{pred.monthName}</span>
                  <Badge variant="outline" className={getConfidenceColor(pred.confidence)}>
                    {getConfidenceLabel(pred.confidence)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Carburant:</span>
                        <span className="font-medium">{pred.fuelPrice.toFixed(3)} €/L</span>
                        <span className={cn(
                          "text-xs",
                          pred.fuelPriceChange >= 0 ? "text-destructive" : "text-success"
                        )}>
                          ({formatPercent(pred.fuelPriceChange)})
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-medium">Facteurs:</p>
                        <ul className="text-xs list-disc pl-4">
                          {pred.factors.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Coût trajet:</span>
                    <span className="font-bold">{formatCurrency(pred.estimatedTripCost)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">Recommandation IA</p>
              <p className="text-sm text-muted-foreground">{prediction.summary.recommendation}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
