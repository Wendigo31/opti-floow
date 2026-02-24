import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Calculator, Navigation, Route, UserCircle, Truck, Users, 
  BarChart3, TrendingUp, CalendarDays, Settings, ChevronRight, 
  ChevronLeft, Sparkles, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TUTORIAL_STEPS = [
  {
    icon: Sparkles,
    title: 'Bienvenue sur OptiFlow',
    description: 'Votre solution complète de gestion et d\'optimisation pour le transport routier. Découvrez les principaux modules en quelques étapes.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Calculator,
    title: 'Calculateur de rentabilité',
    description: 'Calculez instantanément le coût réel de vos trajets : carburant, péages, usure du véhicule, coût chauffeur, charges de structure. Fixez vos prix en toute connaissance de cause.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Navigation,
    title: 'Itinéraire',
    description: 'Planifiez vos itinéraires avec prise en charge des restrictions poids lourds, ponts bas, zones interdites. Comparez autoroute et nationale pour optimiser vos coûts.',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  {
    icon: Route,
    title: 'Tournées',
    description: 'Enregistrez et gérez vos tournées récurrentes. Associez véhicules, chauffeurs et clients pour retrouver rapidement vos trajets habituels.',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    icon: CalendarDays,
    title: 'Planning',
    description: 'Visualisez et organisez la planification de votre flotte sur la semaine. Assignez chauffeurs et véhicules, gérez les relais et suivez les affectations.',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
  },
  {
    icon: UserCircle,
    title: 'Clients',
    description: 'Centralisez vos fiches clients avec adresses, contacts et historique. Identifiez les clients toxiques et analysez la rentabilité par client.',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  {
    icon: Truck,
    title: 'Véhicules & Conducteurs',
    description: 'Gérez votre parc de véhicules et vos conducteurs. Suivez les coûts, la consommation et les affectations pour chaque élément de votre flotte.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: BarChart3,
    title: 'Analyse & Prévisionnel',
    description: 'Tableaux de bord avec statistiques détaillées, graphiques d\'évolution des coûts et prévisions financières pour anticiper votre rentabilité.',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    icon: Settings,
    title: 'Paramètres & Équipe',
    description: 'Configurez votre entreprise, gérez les membres de votre équipe, leurs rôles et permissions. Personnalisez l\'application selon vos besoins.',
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
  },
  {
    icon: CheckCircle2,
    title: 'Vous êtes prêt !',
    description: 'Vous connaissez maintenant les bases d\'OptiFlow. N\'hésitez pas à explorer chaque module. Vous pouvez relancer ce tutoriel depuis les paramètres à tout moment.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
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
          <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center mb-6', current.bgColor)}>
            <Icon className={cn('w-10 h-10', current.color)} />
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
