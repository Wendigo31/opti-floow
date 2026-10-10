import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Boxes, MapPinned, Warehouse, Users, Gavel, Building2, TrendingUp,
  ChevronRight, ChevronLeft, Sparkles, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_ACCENT } from '@/config/categoryAccent';

// Dégradé de bienvenue/fin, distinct des 7 couleurs de catégorie : reprend le
// couple primary → secondary de la marque (s'adapte au mode clair/sombre),
// comme le trait sous "Choisissez votre espace" sur l'accueil.
const BRAND_ACCENT = { from: 'hsl(var(--primary))', to: 'hsl(var(--secondary))' };
const DONE_ACCENT = { from: 'hsl(152 65% 42%)', to: 'hsl(152 65% 30%)' };

// Un pas par espace de l'accueil, dans le même ordre que NAV_CATEGORIES
// (src/config/appNavigation.ts) — le tutoriel suit exactement ce que l'utilisateur
// verra en arrivant sur l'accueil, plutôt qu'une liste de fonctionnalités qui ne
// correspond plus à la navigation par espaces.
const TUTORIAL_STEPS = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur OptiFlow',
    description: "Votre solution complète de gestion et d'optimisation pour le transport routier. Depuis l'accueil, chaque icône ouvre un espace ; une fois dedans, la barre à gauche donne accès à ses pages.",
    accent: BRAND_ACCENT,
  },
  {
    icon: Boxes,
    title: 'Exploitation',
    description: 'Le quotidien : planning, tournées, création de ligne, itinéraire et calculateur, avec vos clients, véhicules et conducteurs toujours à portée de main.',
    accent: CATEGORY_ACCENT.exploitation,
  },
  {
    icon: MapPinned,
    title: 'Géoloc',
    description: 'Calculez et optimisez vos itinéraires par IA, avec prise en charge des restrictions poids lourds, ponts bas et zones interdites.',
    accent: CATEGORY_ACCENT.geoloc,
  },
  {
    icon: Warehouse,
    title: 'Gestion de parc',
    description: 'Votre flotte de véhicules : suivi, rapports détaillés, conducteurs qui les utilisent et installation de l\'application.',
    accent: CATEGORY_ACCENT.parc,
  },
  {
    icon: Users,
    title: 'RH',
    description: 'Vos équipes : conducteurs, membres, planning et gestion des accès individuels de chacun.',
    accent: CATEGORY_ACCENT.rh,
  },
  {
    icon: Gavel,
    title: "Appels d'offres",
    description: 'Gagnez de nouveaux contrats : montez un devis, retrouvez le client, calculez le prix et comparez avec vos tournées passées.',
    accent: CATEGORY_ACCENT['appels-offres'],
  },
  {
    icon: Building2,
    title: 'Comptabilité',
    description: 'Enregistrez vos charges fixes, calculez et historisez vos coûts, et suivez vos prévisions financières.',
    accent: CATEGORY_ACCENT.comptabilite,
  },
  {
    icon: TrendingUp,
    title: 'Gestion de rentabilité',
    description: 'La vue de synthèse : analysez votre marge, vos prévisions, et toutes les données qui les alimentent, en un seul endroit.',
    accent: CATEGORY_ACCENT.rentabilite,
  },
  {
    icon: CheckCircle2,
    title: 'Vous êtes prêt !',
    description: "Vous connaissez maintenant les 7 espaces d'OptiFlow. N'hésitez pas à tous les explorer. Vous pouvez relancer ce tutoriel depuis les paramètres à tout moment.",
    accent: DONE_ACCENT,
  },
];

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;
  const Icon = current.icon;

  const handleNext = () => {
    if (isLast) {
      onOpenChange(false);
      setStep(0);
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStep(s => s - 1);
  };

  const handleSkip = () => {
    onOpenChange(false);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkip(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0 border-0">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${current.accent.from}, ${current.accent.to})` }}
          >
            <Icon className="w-10 h-10" strokeWidth={2} />
          </div>

          {/* Step indicator */}
          <p className="text-xs text-muted-foreground mb-2">
            {step + 1} / {TUTORIAL_STEPS.length}
          </p>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-3">{current.title}</h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
            {current.description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {TUTORIAL_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === step ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-6 flex items-center justify-between">
          {isFirst ? (
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
              Passer
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handlePrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
          )}

          <Button onClick={handleNext} size="sm">
            {isLast ? (
              'Commencer'
            ) : (
              <>
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
