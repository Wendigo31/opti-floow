

# Prompt complet pour créer OptiPlan sur Lovable

Voici le prompt à copier-coller dans un nouveau projet Lovable. Il contient tout le nécessaire : connexion au backend partagé, système d'auth identique à OptiFlow, et les 3 modules opérationnels.

---

**Prompt à coller :**

```
Crée une application React + TypeScript + Tailwind CSS appelée "OptiPlan" — un outil de gestion opérationnelle transport.

## CONNEXION AU BACKEND EXISTANT

Cette app PARTAGE la base de données d'un projet existant (OptiFlow). Ne crée PAS de nouveau backend Cloud.

Configure manuellement le client Supabase dans src/integrations/supabase/client.ts :

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zlesqkxvydmljcctnrez.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZXNxa3h2eWRtbGpjY3RucmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MTc5MDUsImV4cCI6MjA4NDM5MzkwNX0.7p2e3mYps2f7j-vXsKRALxJs74PxOiOtphG6bZxP3DI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

## AUTHENTIFICATION (identique à OptiFlow)

L'authentification utilise le même système que OptiFlow. L'utilisateur se connecte avec :
- **Identifiant société** (= code licence, case-insensitive) 
- **Email professionnel**

Le flow d'activation :
1. L'utilisateur entre son identifiant société et email
2. On appelle l'edge function `validate-license` avec POST sur `${SUPABASE_URL}/functions/v1/validate-license` body: `{ code, email }`
3. La fonction retourne `{ success, session, user, license_id, plan_type, company_name, features }`
4. Si success, on fait `supabase.auth.setSession({ access_token, refresh_token })` avec les tokens de la réponse
5. Ensuite on récupère le license_id depuis la table `company_users` : `SELECT license_id, role FROM company_users WHERE user_id = auth.uid() AND is_active = true`

### LicenseContext
Crée un LicenseContext qui expose : `licenseId`, `authUserId`, `userRole` (type: 'direction' | 'exploitation' | 'membre'), `isLoading`, `refreshLicenseId`.

### Page d'activation
Page de login avec champs "Identifiant société" et "Email", logo OptiPlan, design épuré mode clair.

## TABLES EXISTANTES (NE PAS CRÉER — elles existent déjà)

- `licenses` — licences entreprise
- `company_users` — utilisateurs liés à une licence (user_id, license_id, role, email, display_name, is_active)
- `user_drivers` — conducteurs (id, local_id, name, driver_type ['cdi'|'cdd'|'interim'], hourly_rate, base_salary, driver_data JSONB, license_id)
- `user_vehicles` — véhicules (id, local_id, vehicle_data JSONB, license_id)
- `user_trailers` — remorques (id, local_id, trailer_data JSONB, license_id)
- `planning_entries` — entrées planning (id, license_id, user_id, tour_name, mission_order, driver_id, vehicle_id, client_id, day_of_week, week_start_date, entry_data JSONB, sector_manager, status)
- `clients` — répertoire clients partagé (id, name, license_id, user_id, contact_email, contact_phone, address, notes, client_data JSONB)

Toutes ces tables utilisent RLS basé sur license_id. La fonction DB `get_user_license_id(auth.uid())` retourne le license_id de l'utilisateur connecté.

## 3 MODULES À CRÉER

### 1. Planning hebdomadaire (/planning)
- Grille 7 colonnes : Lundi → Dimanche soir
- Lignes groupées par traction (tour_name + mission_order)
- Chaque cellule = un créneau conducteur + véhicule + client
- Navigation semaine par semaine (← →)
- Bouton "Ajouter une traction" (dialog avec tour_name, mission_order, conducteur, véhicule, client)
- Les données viennent de `planning_entries` filtré par license_id et week_start_date
- Temps réel : subscribe à `planning_entries` via Supabase Realtime

### 2. Répertoire conducteurs (/drivers)
- 3 onglets : CDI, CDD, Intérimaires
- Liste avec nom, type, taux horaire (masqué si rôle != 'direction'), agence intérim
- CRUD complet (ajouter, modifier, supprimer)
- Import Excel (fichier .xlsx avec colonnes: Nom, Type, Taux horaire, Salaire base)
- Données depuis `user_drivers` filtré par license_id
- Le rôle 'direction' voit les salaires, les autres non (utiliser la fonction DB `get_drivers_with_salary_check()`)

### 3. Gestion véhicules & remorques (/vehicles)
- Onglets : Véhicules | Remorques
- Fiche véhicule : immatriculation, marque, modèle, année, kilométrage, coût/km, amortissement
- Fiche remorque : immatriculation, type, dimensions, charge utile
- CRUD complet pour les deux
- Données depuis `user_vehicles` et `user_trailers` filtré par license_id

## LAYOUT & NAVIGATION

- Sidebar à gauche avec logo "OptiPlan" et 3 liens : Planning, Conducteurs, Véhicules
- TopBar avec nom utilisateur (depuis company_users.display_name), indicateur de connexion cloud, bouton déconnexion
- Design : fond clair (mode jour), couleur primaire bleue, style professionnel transport
- Responsive mobile avec menu hamburger
- Langue : tout en français

## STYLE & BRANDING

- Nom : "OptiPlan"  
- Sous-titre : "Gestion opérationnelle transport"
- Produit par : OptiGroup
- Couleurs : bleu primaire (#2563eb), fond blanc/gris clair
- Typo : Inter ou system font
- Composants : shadcn/ui (Button, Card, Input, Select, Table, Tabs, Dialog, Badge, etc.)

## IMPORTANT

- NE PAS créer de tables dans la base de données — elles existent déjà
- NE PAS créer d'edge functions — elles sont déjà déployées
- Utiliser UNIQUEMENT les données partagées via license_id
- Le même utilisateur peut être connecté sur OptiFlow ET OptiPlan simultanément
- Les modifications sont visibles en temps réel sur les deux apps
```

---

Ce prompt contient tout ce qu'il faut pour que l'IA de l'autre projet crée OptiPlan avec la connexion au même backend, le même système d'auth, et les 3 modules opérationnels.

