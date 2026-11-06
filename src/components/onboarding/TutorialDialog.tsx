import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { markTutorialSeen } from '@/components/opti-settings/tutorialSeen';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Sparkles, CheckCircle2, FileSpreadsheet, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_ACCENT } from '@/config/categoryAccent';
import { useVisibleNavigation } from '@/hooks/useVisibleNavigation';
import type { NavCategoryId } from '@/config/appNavigation';

/**
 * Tutoriel de premier lancement : un pas par espace de l'accueil, dans l'ordre de
 * NAV_CATEGORIES et seulement les espaces auxquels l'utilisateur a accès, chacun
 * avec ses fonctions principales ; puis l'import Excel et les paramètres.
 * Clé « déjà vu » : voir TUTORIAL_SEEN_KEY (MainLayout).
 */
// v2 (nov. 2026) : tutoriel complété — revu une fois par tous les utilisateurs.
export const TUTORIAL_SEEN_KEY = 'optiflow_tutorial_v2_seen';

const BRAND_ACCENT = { from: 'hsl(var(--primary))', to: 'hsl(var(--secondary))' };
const DONE_ACCENT = { from: 'hsl(152 65% 42%)', to: 'hsl(152 65% 30%)' };

const CATEGORY_TEXT: Record<NavCategoryId, string> = {
  exploitation: 'Le quotidien : vos tournées, vos lignes et vos clients.',
  geoloc: 'Des itinéraires adaptés aux poids lourds.',
  parc: 'Votre flotte et ceux qui la conduisent.',
  rh: 'Vos conducteurs, votre équipe et leurs accès.',
  'appels-offres': 'Gagnez de nouveaux contrats au bon prix.',
  comptabilite: 'Facturer vos donneurs d\'ordre et suivre vos charges.',
  rentabilite: 'Votre marge, en un coup d\'œil.',
};

const CATEGORY_DETAILS: Record<NavCategoryId, string[]> = {
  exploitation: [
    'Planning : vos tournées par jour, conducteur et véhicule',
    'Tournées, création de ligne, itinéraire et calculateur de coût',
    'Clients avec leur grille tarifaire, et palettes échangées (solde par client)',
    "Conducteurs : chacun reçoit un lien vers ses tournées du jour, sans mot de passe",
  ],
  geoloc: [
    'Calcul d\'itinéraire poids lourd : ponts bas, restrictions, zones interdites',
    'Tournées et analyse de vos trajets',
  ],
  parc: [
    'Véhicules : suivi, coûts et rapports détaillés',
    'Conducteurs affectés à chaque véhicule',
    "Installation de l'application sur téléphone et ordinateur",
  ],
  rh: [
    'Conducteurs : fiche, coûts, absences, import depuis Excel',
    'Équipe : invitez vos collaborateurs et choisissez leurs onglets',
    '« Mes accès » : les onglets ouverts pour votre compte',
  ],
  'appels-offres': [
    'Devis par client, avec la grille tarifaire appliquée automatiquement',
    'Lien envoyé au client pour accepter le devis en ligne',
    'Comparaison avec vos tournées passées',
  ],
  comptabilite: [
    'Facture mensuelle par donneur d\'ordre, à partir des tournées réalisées',
    'Factures électroniques Factur-X, avoirs, export comptable (FEC), indexation gazole',
    "Charges fixes, avec import Excel ; votre abonnement OptiGroup y est compté d'office",
    'Prévisionnel de vos revenus et dépenses',
  ],
  rentabilite: [
    'Analyse de la marge par tournée, client et période',
    'Prévisionnel et historique des trajets',
    'Calculée avec toutes vos charges, abonnement compris',
  ],
};

interface Step {
  icon: typeof Sparkles;
  title: string;
  description: string;
  details?: string[];
  accent: { from: string; to: string };
}

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const categories = useVisibleNavigation();
  const [step, setStep] = useState(0);

  const steps: Step[] = [
    {
      icon: Sparkles,
      title: 'Bienvenue sur OptiFlow',
      description: 'Votre logiciel de gestion et de rentabilité pour la traction et la distribution. Voici en quelques étapes tout ce que vous pouvez y faire.',
      details: [
        "Depuis l'accueil, chaque icône ouvre un espace",
        'Dans un espace, la barre à gauche donne accès à ses pages',
        "La maison en haut vous ramène à l'accueil",
      ],
      accent: BRAND_ACCENT,
    },
    ...categories.map((c) => ({
      icon: c.icon,
      title: c.label,
      description: CATEGORY_TEXT[c.id],
      details: CATEGORY_DETAILS[c.id],
      accent: CATEGORY_ACCENT[c.id],
    })),
    {
      icon: FileSpreadsheet,
      title: 'Importez vos données',
      description: 'Pas besoin de tout ressaisir : reprenez vos fichiers Excel existants.',
      details: [
        'Bouton « Importer Excel » sur les pages Conducteurs, Charges fixes, Tournées…',
        "N'importe quel tableau : les colonnes sont reconnues toutes seules",
        'Ou partez du modèle Excel à télécharger, puis importez-le',
      ],
      accent: BRAND_ACCENT,
    },
    {
      icon: Settings,
      title: 'Paramètres et connexion',
      description: 'Les paramètres de votre société sont accessibles depuis la barre à gauche.',
      details: [
        'Fiche société, logo et coordonnées affichés sur vos documents',
        'Pour revenir : opti-group.fr › Se connecter, avec votre adresse e-mail',
      ],
      accent: BRAND_ACCENT,
    },
    {
      icon: CheckCircle2,
      title: 'Vous êtes prêt !',
      description: `Vous connaissez maintenant ${categories.length > 1 ? `vos ${categories.length} espaces` : 'votre espace'}. Vous pouvez relancer ce tutoriel depuis les paramètres à tout moment.`,
      details: ["Une question ? Le bouton Support, sur l'accueil ou en bas de la barre à gauche"],
      accent: DONE_ACCENT,
    },
  ];

  const safeStep = Math.min(step, steps.length - 1);
  const current = steps[safeStep];
  const isLast = safeStep === steps.length - 1;
  const isFirst = safeStep === 0;
  const Icon = current.icon;

  const close = () => {
    // Marqué « vu » à la fermeture : un rechargement pendant le tutoriel le rouvre.
    markTutorialSeen(TUTORIAL_SEEN_KEY);
    onOpenChange(false);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 border-0">
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((safeStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${current.accent.from}, ${current.accent.to})` }}
          >
            <Icon className="w-10 h-10" strokeWidth={2} />
          </div>
          <p className="text-xs text-muted-foreground mb-2">{safeStep + 1} / {steps.length}</p>
          <DialogTitle className="text-xl font-bold text-foreground mb-3">{current.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed max-w-sm">{current.description}</DialogDescription>
          {current.details && current.details.length > 0 && (
            <ul className="mt-5 w-full space-y-2.5 text-left">
              {current.details.map((d) => (
                <li key={d} className="flex items-start gap-2.5 text-sm text-foreground/80">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: current.accent.from }} />
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-center gap-1.5 pb-4">
          {steps.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setStep(i)}
              aria-label={`Étape ${i + 1}`}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === safeStep ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
            />
          ))}
        </div>

        <div className="px-8 pb-6 flex items-center justify-between">
          {isFirst ? (
            <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground">Passer</Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep(safeStep - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Précédent
            </Button>
          )}
          <Button onClick={() => (isLast ? close() : setStep(safeStep + 1))} size="sm">
            {isLast ? 'Commencer' : (<>Suivant<ChevronRight className="w-4 h-4 ml-1" /></>)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
