# Forfait unique "OptiFlow" (fusion Start / Pro / Enterprise)

## Décisions proposées
- **Nom affiché** : "OptiFlow". **Valeur interne** (`plan_type`) : `optiflow`.
- **Contenu** : toutes les fonctionnalités Enterprise, limites illimitées (conducteurs, clients, véhicules, charges, tournées). Les surcharges admin par licence (`max_*`, `license_features`) restent possibles.
- **Prix** : 79 € HT/mois, 790 € HT/an — uniquement dans Stripe et `pricing_config`, jamais sur une page publique ("Sur devis" conservé).
- **Add-ons** : à confirmer (voir question en fin de plan). Par défaut, ceux qui débloquent une fonctionnalité (déjà incluse désormais) sont retirés ; ceux qui ajoutent de la capacité (ex. utilisateurs en plus) sont conservés.

## Étapes
1. **Stripe** : le compte Live est déjà relié (clé en place). Créer le produit "OptiFlow" avec un prix mensuel 7900 EUR-cents (`recurring=month`) et un prix annuel 79000 (`recurring=year`). Archiver les 6 anciens prix de forfait (sans client actif, aucun risque).
2. **Base de données (migration)**
   - `UPDATE licenses SET plan_type='optiflow'` sur toutes les lignes.
   - Supprimer `licenses_plan_type_check`, recréer `CHECK (plan_type = 'optiflow')`, `DEFAULT 'optiflow'`.
   - `pricing_config` : `stripe_prices` = `{ optiflow_monthly, optiflow_annual }` ; `plans` réduit à une seule entrée ; `discounts` (remises/planchers) adaptés à cette entrée.
   - `license_features` : passer les lignes existantes à tout-inclus (via contexte admin).
3. **Frontend — source unique**
   - `src/hooks/useLicense.ts` : `PlanType = 'optiflow'`, `PLAN_FEATURES` = une seule entrée tout-inclus ; normaliser les anciennes valeurs lues depuis le cache local (`start|pro|enterprise` → `optiflow`).
   - `src/types/features.ts` : `PLAN_DEFAULTS` à une seule entrée.
   - `src/hooks/usePlanLimits.ts` : une seule entrée illimitée ; `isStart/isPro/isEnterprise` retirés (les appelants mis à jour).
   - `src/config/pricingPlans.ts` : une seule carte "OptiFlow", toutes fonctionnalités `included: true`, libellés "Sur devis" / "Nous contacter" inchangés.
   - `PricingSection.tsx`, `Activation.tsx`, `Presentation.tsx`, `PricingExport.tsx` : affichage d'une seule carte.
   - `FeatureGate.tsx`, `AddonMarketplace.tsx`, `TopBar`/`Sidebar`/`MobileNav`, `Settings`/`LicenseSyncSettings` : retrait des badges "Pro/Enterprise requis" et des messages de montée en gamme.
   - `src/pages/Admin.tsx`, `CreateCompanyDialog.tsx`, `FeatureEditor.tsx`, `PricingConfigManager.tsx` : sélecteur de forfait supprimé ; il reste activer/désactiver la licence, les limites et surcharges.
   - `src/types/team.ts` : constantes tarifaires internes réduites au forfait unique.
4. **Edge functions**
   - `validate-license/shared.ts` : `PLAN_DEFAULTS` unique ; `admin.ts` : action `update-plan` retirée, création de licence force `optiflow` ; `validate.ts`/`check.ts` : tout ancien `plan_type` est traité comme `optiflow`.
   - `create-checkout` : n'accepte que `planKey ∈ {optiflow_monthly, optiflow_annual}`, métadonnée `plan_type=optiflow`.
   - `self-register` : écrit `plan_type='optiflow'`, ignore tout paramètre de forfait.
   - `addon-checkout` : retire les add-ons devenus inclus, garde les add-ons de capacité.
5. **Tests**
   - Mettre à jour `useLicense.test.ts` (tests par forfait → un test "forfait unique donne accès à toutes les fonctionnalités" et un test "ancienne valeur `pro` en cache normalisée en `optiflow`").
   - Ajouter un test : `PLAN_LIMITS.optiflow` illimité, `PUBLIC_PLANS` contient exactement 1 forfait, toutes fonctionnalités incluses.
   - Les deux tests "aucun prix public" doivent rester verts sans modification.
6. **Validation** : `tsgo` propre, `vitest --run` vert, build de prod OK, mise à jour des mémoires projet (Pricing Tiers, Enterprise Conversion, Activation Layout) qui décrivent encore 3 forfaits.

## Question à trancher
- Add-ons : garder seulement les add-ons de capacité (utilisateurs supplémentaires, etc.) et supprimer ceux qui sont maintenant inclus — ça vous va ? Et l'argument commercial "87 % choisissent Enterprise" est retiré.
