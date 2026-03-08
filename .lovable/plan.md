

# Plan : Onboarding automatisé avec Stripe + Création de société self-service

## Contexte actuel

La création de société passe exclusivement par le panneau admin (`CreateCompanyDialog`) qui nécessite un `adminToken` JWT. L'Edge Function `validate-license` action `create-license` vérifie systématiquement l'autorisation admin via `verifyAdminAuth`.

Il n'existe aucun flux self-service : l'utilisateur ne peut pas s'inscrire seul.

## Ce qu'on va construire

Un parcours en 4 étapes accessible depuis la page d'activation :

```text
[Bouton "Prendre un abonnement"]
        │
        ▼
  Étape 1 : Choix du forfait + Paiement Stripe
        │
        ▼
  Étape 2 : Formulaire SIREN (identification société)
        │
        ▼
  Étape 3 : Formulaire utilisateur (nom, prénom, email)
        │
        ▼
  Étape 4 : Écran de confirmation avec identifiant généré
        → Bouton "Se connecter" qui pré-remplit le login
```

## Détails techniques

### 1. Activation de Stripe
- Utiliser l'intégration Stripe native de Lovable pour créer les 3 produits (Start, Pro, Enterprise) avec paiement récurrent mensuel.
- Après paiement réussi, redirection vers la page d'onboarding avec `session_id` en paramètre.

### 2. Nouvelle Edge Function `self-register`
- Reçoit : `stripe_session_id`, `siren`, `firstName`, `lastName`, `email`
- Vérifie le paiement Stripe via l'API (session complétée)
- Appelle l'API SIRENE (réutilise la logique de `sirene-lookup`)
- Génère un `company_identifier` automatique basé sur le nom société (ex: `TRANSPORT-MARTIN-7X2K`) — nom nettoyé + 4 chars aléatoires
- Crée la licence dans `licenses` (sans admin token, autorisation par Stripe session valide)
- Crée l'entrée `company_users` avec rôle `direction`
- Crée les features par défaut selon le plan
- Retourne : `company_identifier`, `license_id`

### 3. Composant `OnboardingFlow.tsx`
- Dialog multi-étapes (stepper visuel) avec le design OptiFlow (glass-card, gradient)
- **Étape 1** : Choix forfait (3 cartes Start/Pro/Enterprise) → Bouton "Payer" → Stripe Checkout
- **Étape 2** : Champ SIREN + bouton Rechercher (réutilise `useSireneLookup`) → Affichage infos société vérifiées
- **Étape 3** : Champs Prénom, Nom, Email professionnel
- **Étape 4** : Confirmation avec identifiant société affiché en gros + bouton copier + bouton "Se connecter maintenant"

### 4. Modification de `Activation.tsx`
- Ajout d'un bouton "Prendre un abonnement" sous le formulaire de connexion existant
- Ce bouton ouvre le `OnboardingFlow`

### 5. Modification de `validate-license/index.ts`
- Ajout d'une nouvelle action `self-register` qui ne nécessite PAS d'admin token
- Sécurité assurée par la validation du `stripe_session_id` côté Stripe API
- Génération automatique du `company_identifier`

### 6. Sécurité
- Le paiement Stripe valide est la seule condition d'autorisation (pas d'admin token)
- Rate limiting sur l'action `self-register`
- Vérification que la session Stripe n'a pas déjà été utilisée (anti-replay)
- Le SIREN n'est pas obligatoire (auto-entrepreneur sans SIREN possible)

## Fichiers impactés

| Fichier | Action |
|---------|--------|
| `src/pages/Activation.tsx` | Ajout bouton + import OnboardingFlow |
| `src/components/onboarding/OnboardingFlow.tsx` | **Nouveau** — Dialog multi-étapes |
| `supabase/functions/validate-license/index.ts` | Ajout action `self-register` |
| `supabase/functions/self-register/index.ts` | **Nouveau** (alternative si on sépare) |

## Prérequis
- **Stripe doit être activé** via l'intégration Lovable avant de commencer l'implémentation
- Création des produits/prix Stripe pour les 3 forfaits

