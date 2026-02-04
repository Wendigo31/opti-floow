
# Plan de Renforcement de la Sécurité Backend

## Résumé de l'Analyse

Après un audit complet, j'ai identifié les vulnérabilités suivantes :

| Problème | Niveau | Impact |
|----------|--------|--------|
| Fonctions admin RPC accessibles à tous (PUBLIC) | ÉLEVÉ | Bypass RLS si token compromis |
| Edge functions API sans authentification | MOYEN | Consommation quota API |
| INSERT policies sans auth.uid() | MOYEN | Insertion potentielle non autorisée |
| Leaked Password Protection désactivé | FAIBLE | Configuration Supabase |

---

## Phase 1 : Sécurisation des Fonctions RPC Admin

### Problème Actuel
Les fonctions `admin_add_company_user`, `admin_remove_company_user`, `admin_update_company_user_role`, et `admin_toggle_company_user_active` sont exécutables par **tous les utilisateurs** (PUBLIC), ce qui permet un bypass direct des edge functions si un token JWT est compromis.

### Solution
Révoquer l'accès PUBLIC et ajouter une vérification de session admin directement dans les fonctions.

```sql
-- 1. Révoquer les permissions PUBLIC sur les fonctions admin
REVOKE ALL ON FUNCTION public.admin_add_company_user FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_remove_company_user FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_company_user_role FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_toggle_company_user_active FROM PUBLIC;

-- 2. Accorder uniquement au service_role (edge functions)
GRANT EXECUTE ON FUNCTION public.admin_add_company_user TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_company_user TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_company_user_role TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_company_user_active TO service_role;
```

### Impact sur les fonctionnalités
**Aucun** - Ces fonctions sont appelées uniquement via l'edge function `validate-license` qui utilise le `service_role_key`.

---

## Phase 2 : Correction des Policies INSERT "WIDE OPEN"

### Problème
Plusieurs policies INSERT utilisent `with_check` sans vérifier `auth.uid()`, ce qui permet potentiellement des insertions non authentifiées.

### Tables concernées
- `access_requests`
- `charge_presets`
- `company_config`
- `company_sync_events`
- `company_users`
- `exploitation_metric_settings`
- `user_charges`
- `user_drivers`

### Solution
Remplacer les policies INSERT par des versions avec vérification explicite de l'authentification :

```sql
-- Exemple pour charge_presets
DROP POLICY IF EXISTS "Company members can create charge presets" ON public.charge_presets;

CREATE POLICY "Company members can create charge presets"
ON public.charge_presets
FOR INSERT
TO authenticated  -- Restreindre aux utilisateurs authentifiés uniquement
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND created_by = auth.uid() 
  AND (
    license_id IS NULL 
    OR license_id = public.get_user_license_id(auth.uid())
  )
);
```

La même logique sera appliquée à toutes les tables listées.

### Impact sur les fonctionnalités
**Aucun** - Ces opérations nécessitent déjà une session utilisateur authentifiée côté frontend.

---

## Phase 3 : Authentification des Edge Functions API

### Problème
Les edge functions `google-maps-key`, `tomtom-route`, `tomtom-search`, `tomtom-tolls`, et `truck-restrictions` n'ont pas de vérification d'authentification, permettant à quiconque de consommer les quotas API.

### Solution
Ajouter une vérification de token Supabase à chaque edge function :

```typescript
// Ajout en haut de chaque edge function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dans le handler, avant d'exécuter la logique :
const authHeader = req.headers.get('authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return new Response(
    JSON.stringify({ error: 'Authentication required' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const { data: { user }, error: authError } = await supabase.auth.getUser(
  authHeader.replace('Bearer ', '')
);

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Invalid or expired token' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Continuer avec la logique existante...
```

### Fonctions à modifier
1. `google-maps-key/index.ts`
2. `tomtom-route/index.ts`
3. `tomtom-search/index.ts`
4. `tomtom-tolls/index.ts`
5. `truck-restrictions/index.ts`

### Côté Frontend
Mettre à jour les hooks utilisant ces edge functions pour inclure le token d'authentification :

```typescript
// Dans useTomTom.ts ou équivalent
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(`${SUPABASE_URL}/functions/v1/tomtom-route`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  },
  body: JSON.stringify({ waypoints, params }),
});
```

### Impact sur les fonctionnalités
**Aucun** - Les utilisateurs doivent déjà être connectés pour utiliser l'application.

---

## Phase 4 : Renforcement des Policies RLS Existantes

### Amélioration des policies company_users

```sql
-- Améliorer la policy INSERT pour empêcher l'auto-élévation de privilèges
DROP POLICY IF EXISTS "Direction and responsable can invite members" ON public.company_users;

CREATE POLICY "Direction and responsable can invite members"
ON public.company_users
FOR INSERT
TO authenticated
WITH CHECK (
  -- Soit l'utilisateur est admin de la licence
  public.is_company_admin(license_id, auth.uid())
  -- Soit c'est le premier utilisateur de la licence (création initiale)
  OR NOT public.license_has_members(license_id)
);

-- Empêcher la création de rôle 'direction' sauf par service_role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Empêcher la création d'un rôle direction par un utilisateur normal
  IF NEW.role = 'direction' AND auth.role() != 'service_role' THEN
    -- Vérifier si c'est le premier utilisateur (création initiale autorisée)
    IF EXISTS (
      SELECT 1 FROM company_users 
      WHERE license_id = NEW.license_id 
      AND role = 'direction'
    ) THEN
      RAISE EXCEPTION 'Seul le service_role peut créer des utilisateurs direction';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_role_escalation
BEFORE INSERT OR UPDATE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();
```

---

## Phase 5 : Audit et Logging Renforcé

### Ajouter un trigger de logging pour les opérations sensibles

```sql
-- Fonction de logging pour les actions sensibles
CREATE OR REPLACE FUNCTION public.log_sensitive_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO admin_audit_log (
    admin_email,
    action,
    target_id,
    details,
    ip_address
  ) VALUES (
    COALESCE(
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      'system'
    ),
    TG_OP || '_' || TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    jsonb_build_object(
      'old', CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
      'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END
    ),
    NULL
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Appliquer sur company_users
CREATE TRIGGER audit_company_users
AFTER INSERT OR UPDATE OR DELETE ON public.company_users
FOR EACH ROW
EXECUTE FUNCTION public.log_sensitive_action();
```

---

## Résumé des Fichiers à Modifier

### Migrations SQL (1 fichier)
- Nouvelle migration avec toutes les corrections RLS et fonctions

### Edge Functions (5 fichiers)
- `supabase/functions/google-maps-key/index.ts`
- `supabase/functions/tomtom-route/index.ts`
- `supabase/functions/tomtom-search/index.ts`
- `supabase/functions/tomtom-tolls/index.ts`
- `supabase/functions/truck-restrictions/index.ts`

### Hooks Frontend (2 fichiers)
- `src/hooks/useTomTom.ts` - Ajouter token auth
- `src/hooks/useAddressAutocomplete.ts` - Si utilise google-maps-key

---

## Checklist de Validation

Après implémentation, tester que :

- [ ] La connexion utilisateur fonctionne toujours
- [ ] L'ajout de membres d'équipe fonctionne (direction uniquement)
- [ ] La modification de rôles fonctionne
- [ ] Le calcul d'itinéraire TomTom fonctionne
- [ ] La carte Google Maps s'affiche
- [ ] Les données se synchronisent entre utilisateurs de la même société
- [ ] Les utilisateurs d'une société A ne voient pas les données de la société B

---

## Priorité d'Implémentation

1. **Critique** : Révoquer les permissions PUBLIC sur les fonctions admin
2. **Haute** : Corriger les policies INSERT sans auth.uid()
3. **Moyenne** : Ajouter l'authentification aux edge functions API
4. **Basse** : Trigger d'audit logging
