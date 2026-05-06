## Objectif

Produire un **document interne confidentiel** (`.docx`) contenant la grille tarifaire complète des 3 forfaits OptiFlow, avec seuils de négociation, remises autorisées, add-ons et règles commerciales. Ce document **n'est pas exposé dans l'app** — il sert uniquement à l'équipe commerciale/direction.

## Livrable

Un fichier : `/mnt/documents/OptiFlow-Grille-Tarifaire-Interne-CONFIDENTIEL.docx`

## Structure du document

1. **Page de garde** — Mention "CONFIDENTIEL — Usage interne uniquement", date, version
2. **Synthèse exécutive** — Positionnement des 3 forfaits, cible, ARPU visé
3. **Grille tarifaire détaillée** (tableau)
   - Forfait | Prix mensuel public | Prix engagement annuel (-25%) | Prix plancher négociable | Coût infra estimé | Marge brute cible
   - Start : 79 € / 59 € / 49 € plancher
   - Pro : 199 € / 149 € / 129 € plancher
   - Enterprise : 499 € / 374 € / 299 € plancher (au-delà sur devis)
4. **Add-ons facturables** (tableau)
   - +10 ressources (drivers/véhicules) : 19 €/mois
   - IA étendue (analyses illimitées) : 39 €/mois
   - Module multi-agences : 49 €/mois
   - Utilisateur supplémentaire (Pro) : 15 €/mois
   - Support prioritaire dédié : 79 €/mois
5. **Règles de remise autorisées par profil commercial**
   - Commercial junior : jusqu'à -10 %
   - Senior : jusqu'à -20 %
   - Direction : jusqu'à -40 % (cas stratégiques)
   - Plancher absolu : ne jamais descendre sous le coût infra x2
6. **Règles d'engagement**
   - Mensuel : prix plein
   - Annuel : -25 % (paiement upfront ou mensualisé)
   - Pluriannuel (24 mois) : -35 %
7. **Seuils de bascule entre forfaits** (quand proposer l'upsell)
   - Start → Pro : >5 véhicules OU besoin planning OU besoin IA
   - Pro → Enterprise : >15 véhicules OU >3 utilisateurs OU besoin multi-agences
8. **Argumentaire commercial par forfait** — Bénéfices clés, objections fréquentes, réponses types
9. **Coûts d'acquisition et seuil de rentabilité**
   - CAC estimé : 150-300 €
   - Payback period cible : 3 mois (Pro), 6 mois (Enterprise)
   - Seuil de rentabilité global : ~15-20 clients Pro
10. **Politique de churn et rétention** — Conditions de résiliation, remises de rétention autorisées

## Détails techniques

- Génération via `docx-js` (script Node copié dans `/tmp/`)
- Format A4 portrait, marges 1 inch
- Tableaux avec `WidthType.DXA`, bordures grises, en-têtes shading bleu clair
- Police Arial 11pt, titres bleu nuit OptiFlow
- Footer : "CONFIDENTIEL — Ne pas diffuser hors équipe direction/commerciale"
- Validation post-génération + conversion 1 page en image pour QA visuel

## Hors-scope

- Aucune modification du code de l'app
- Aucune modification des composants publics (`PricingSection`, `pricingPlans.ts`)
- Pas de nouvelle page interne dans l'app (le doc reste un fichier téléchargeable)
