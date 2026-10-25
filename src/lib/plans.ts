/**
 * Les trois forfaits, identiques dans OptiFlow, OptiFret et OptiXpress.
 * Le contenu de chaque forfait (fonctionnalités, onglets) est appliqué par la base :
 * une fonctionnalité hors forfait reste désactivée.
 */
export type PlanKey = 'start' | 'pro' | 'enterprise';

export const PLAN_LABELS: Record<PlanKey, string> = {
  start: 'Essentiel',
  pro: 'Pro',
  enterprise: 'Entreprise',
};

export const planLabel = (key: string | null | undefined): string =>
  key && key in PLAN_LABELS ? PLAN_LABELS[key as PlanKey] : 'Entreprise';

/** Forfait suivant, pour le message « disponible à partir du forfait … ». */
export const nextPlanLabel = (key: string | null | undefined): string =>
  key === 'start' ? 'Pro' : 'Entreprise';

export const lockedByPlanText = (key: string | null | undefined): string =>
  `Cette fonctionnalité n'est pas incluse dans votre forfait ${planLabel(key)}. ` +
  `Elle est disponible avec le forfait ${nextPlanLabel(key)} : votre Direction peut demander le changement de forfait à OptiGroup.`;
