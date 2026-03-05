

# Séparation OptiFlow en deux apps avec base partagée

## Analyse

L'idée est solide : séparer l'app actuelle en deux produits distincts partageant la même base de données. C'est exactement ce que font des suites comme la suite Google (Docs, Sheets, Drive = mêmes données, apps différentes).

### Répartition proposée

**App 1 — OptiFlow (Rentabilité)**
- Calculateur de coûts
- Itinéraires PL
- Tournées sauvegardées
- Dashboard financier + Forecast
- Devis / Quotes
- Clients (lecture seule ou partagé)
- Paramètres société

**App 2 — OptiPlan (Opérationnel)**
- Planning hebdomadaire (grille)
- Répertoire conducteurs (CDI/CDD/Intérim)
- Comptabilité des heures
- Gestion véhicules + remorques
- Clients (partagé)
- Ordres de mission

### Architecture technique

```text
┌─────────────┐     ┌─────────────┐
│  OptiFlow   │     │  OptiPlan   │
│  (Projet 1) │     │  (Projet 2) │
│  Lovable    │     │  Lovable    │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │  même clé anon    │
       │  même project_id  │
       └────────┬──────────┘
                │
        ┌───────▼───────┐
        │  Lovable Cloud │
        │  (Supabase)    │
        │  Tables partagées │
        │  RLS par license_id │
        └───────────────┘
```

### Comment le faire

1. **Créer un nouveau projet Lovable** (OptiPlan)
2. **Connecter le même backend Cloud** en configurant manuellement le client Supabase avec l'URL et la clé anon du projet actuel
3. **Copier les composants nécessaires** : planning, conducteurs, véhicules, layout, auth
4. **Les deux apps partagent** :
   - Les mêmes tables (user_drivers, user_vehicles, planning_entries, etc.)
   - Le même système d'auth (même utilisateur connecté aux deux)
   - Le même realtime (modifications instantanées dans les deux apps)
5. **Chaque app a son propre routing** simplifié (moitié moins de pages)

### Avantages
- Interface plus légère et ciblée par rôle
- L'exploitant n'ouvre qu'OptiPlan, le dirigeant OptiFlow (ou les deux)
- Performance améliorée (bundle JS divisé par ~2)
- Maintenabilité : chaque app évolue indépendamment
- Offre commerciale possible en bundle ou séparé

### Limites à anticiper
- **Auth partagée** : l'utilisateur devra se connecter séparément sur chaque app (même identifiants, mais deux sessions)
- **Clients partagés** : les deux apps lisent/écrivent la même table clients — pas de conflit car RLS par license_id
- **Edge Functions** : déjà déployées sur le backend actuel, accessibles par les deux apps
- **Maintenance double** : les composants UI communs (layout, auth, sidebar) devront être dupliqués initialement

### Étapes de mise en oeuvre

1. Créer le projet Lovable "OptiPlan"
2. Configurer la connexion au même backend (URL + clé anon)
3. Migrer les pages : Planning, Conducteurs, Véhicules, Remorques
4. Migrer les hooks associés : usePlanning, useCloudDrivers, useCloudVehicles, useCloudTrailers
5. Adapter le layout/sidebar pour OptiPlan (navigation réduite)
6. Retirer les pages migrées d'OptiFlow pour l'alléger
7. Tester la synchronisation temps réel entre les deux apps

Veux-tu que je crée le projet OptiPlan et commence la migration ?

