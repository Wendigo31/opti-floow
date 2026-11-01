import { useState } from 'react';
import { Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { priceFromRateCard, type RateCard, type RateLine, type RateQuery } from '@/lib/rateCard';

const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * Prix proposé par la grille tarifaire du client, avec ses frais annexes à
 * cocher, et un bouton pour l'appliquer au devis / à la prestation / à la facture.
 * Fichier partagé (bridge/shared/pricing).
 */
export function RateCardSuggestion({
  card,
  query,
  onApply,
  applyLabel = 'Appliquer',
}: {
  card: RateCard;
  query: RateQuery;
  onApply: (amount: number, lines: RateLine[]) => void;
  applyLabel?: string;
}) {
  const [extras, setExtras] = useState<string[]>([]);
  const result = priceFromRateCard(card, { ...query, extras });
  return (
    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium">
          <Tags className="h-4 w-4 text-primary" />
          Grille tarifaire du client
        </span>
        {result.ok ? (
          <span className="flex items-center gap-2">
            <span className="font-semibold">{eur(result.amount)} HT</span>
            <Button type="button" size="sm" onClick={() => onApply(result.amount, result.lines)}>{applyLabel}</Button>
          </span>
        ) : (
          <span className="text-muted-foreground">{result.reason}</span>
        )}
      </div>
      {result.ok && result.lines.length > 0 && (
        <p className="text-xs text-muted-foreground">{result.lines.map((l) => `${l.label} : ${l.quantity !== 1 ? `${l.quantity} × ${eur(l.unitPrice)} = ` : ''}${eur(l.total)}`).join(' · ')}</p>
      )}
      {!!card.extras?.length && (
        <div className="flex flex-wrap gap-3">
          {card.extras.map((x) => (
            <label key={x.label} className="flex items-center gap-1.5 text-xs">
              <Checkbox
                checked={extras.includes(x.label)}
                onCheckedChange={(v) => setExtras(v ? [...extras, x.label] : extras.filter((e) => e !== x.label))}
                aria-label={`Ajouter ${x.label}`}
              />
              {x.label} (+{eur(x.price)})
            </label>
          ))}
        </div>
      )}
      {card.fuelIndexed !== false && result.ok && <p className="text-xs text-muted-foreground">Indexation gazole en plus, selon vos réglages.</p>}
    </div>
  );
}
