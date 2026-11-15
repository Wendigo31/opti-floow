import { Check, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PLAN_INFO, PLAN_ORDER, includedText, asPlanKey } from '@/lib/planCatalog';

/**
 * Les trois forfaits côte à côte (même présentation dans OptiFlow, OptiFret et OptiXpress) :
 * contenu de chacun, forfait de la société mis en avant. Prix sur devis, comme sur le site.
 */
export function PlansOverview({
  current,
  appName,
  contactUrl,
  compact = false,
}: {
  /** Forfait de la société (absent sur les pages publiques). */
  current?: string | null;
  appName: string;
  contactUrl: string;
  compact?: boolean;
}) {
  const cur = current ? asPlanKey(current) : null;
  return (
    <div className="space-y-3">
      <div className={cn('grid gap-3', compact ? 'md:grid-cols-3' : 'lg:grid-cols-3')}>
        {PLAN_ORDER.map((key, i) => {
          const p = PLAN_INFO[key];
          const isCurrent = cur === key;
          return (
            <div
              key={key}
              className={cn(
                'rounded-xl border p-4 flex flex-col gap-3',
                isCurrent ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold flex items-center gap-1.5">
                  {key === 'enterprise' && <Crown className="w-4 h-4 text-amber-500" />}
                  {p.label}
                </h3>
                {isCurrent && <Badge className="bg-primary/15 text-primary border-primary/30">Votre forfait</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <p className="text-xs font-medium">{includedText(p)}</p>
              <ul className="space-y-1.5 text-sm">
                {i > 0 && (
                  <li className="text-xs text-muted-foreground">Tout le forfait {PLAN_INFO[PLAN_ORDER[i - 1]].label}, plus :</li>
                )}
                {p.adds.map((a) => (
                  <li key={a} className="flex gap-2">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-auto text-sm font-semibold">Sur devis</p>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Véhicules et accès au-delà de ceux inclus : facturés à l'unité, sans blocage dans {appName}.
          Abonnement prélevé chaque mois.
        </span>
        <Button asChild size="sm" variant={cur ? 'outline' : 'default'}>
          <a href={contactUrl} target="_blank" rel="noopener noreferrer">
            {cur ? 'Changer de forfait' : 'Demander un devis'}
          </a>
        </Button>
      </div>
    </div>
  );
}
