/**
 * Tutoriel adapté au forfait (même fichier dans OptiFlow, OptiFret et OptiXpress) :
 * - chaque ligne d'un espace peut citer les onglets qu'elle présente ; elle n'apparaît que si
 *   l'un d'eux est ouvert pour l'utilisateur (forfait, rôle, accès réglés par la Direction) ;
 * - une étape « Votre forfait » dit ce qui est inclus et ce qu'apporte le forfait suivant.
 */
import { PLAN_INFO, asPlanKey, includedText, nextPlan } from '@/lib/planCatalog';

/** Texte seul (toujours affiché) ou [texte, onglet, onglet…] (affiché si l'un est ouvert). */
export type TutorialDetail = string | [string, ...string[]];

export function visibleDetails(details: TutorialDetail[] | undefined, openPaths: Set<string>): string[] {
  return (details ?? [])
    .filter((d) => typeof d === 'string' || d.slice(1).some((p) => openPaths.has(p)))
    .map((d) => (typeof d === 'string' ? d : d[0]));
}

export function planTutorialStep(plan: string | null | undefined, appName: string, settingsHint: string) {
  const p = PLAN_INFO[asPlanKey(plan)];
  const next = nextPlan(p.key);
  return {
    title: `Votre forfait : ${p.label}`,
    description: `${p.description}. Ce tutoriel ne vous présente que ce qui est ouvert pour vous.`,
    details: [
      `${includedText(p)} ; au-delà, facturés à l'unité, sans blocage`,
      next
        ? `Avec le forfait ${next.label} : ${next.adds.join(', ').replace(/^./, (c) => c.toLowerCase())}`
        : `Vous avez toutes les fonctionnalités d'${appName}`,
      `Options et changement de forfait : ${settingsHint}`,
    ],
  };
}
