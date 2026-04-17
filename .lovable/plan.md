

## Plan : Résolution des problèmes de sécurité

### Contexte
4 findings sont signalés. Mon analyse montre que certains nécessitent une vraie correction, et d'autres peuvent être ignorés/expliqués car déjà mitigés.

---

### Finding 1 : `clients` — Données sensibles accessibles à tous les membres (ERROR)
**Vrai risque** : tout employé authentifié peut lire emails/téléphones/SIRET de tous les clients. Un employé mécontent peut exporter la base.

**Correction** : Restreindre la lecture des champs sensibles (email, téléphone, SIRET) aux rôles `direction` et `exploitation` uniquement. Les rôles `membre`/autres ne verront que nom + ville.

**Implémentation** :
- Créer une fonction RPC `get_clients_safe()` SECURITY DEFINER qui masque (`NULL`) les colonnes `email`, `phone`, `siret`, `address` si l'utilisateur n'est pas direction/exploitation.
- Refactor `useClients.ts` pour appeler cette RPC au lieu de `select('*')` direct.
- Conserver la policy RLS existante (license_id) pour les autres opérations (insert/update/delete restent contrôlés par le rôle côté UI).

---

### Finding 2 : `licenses` — Exposition données de facturation (ERROR)
**Analyse** : la policy actuelle est déjà stricte :
```sql
USING (id = get_user_license_id(auth.uid()) OR email = auth.email())
```
Un utilisateur ne voit QUE sa propre licence. Le finding est un **faux positif**.

**Action** : Marquer comme `ignore` avec justification documentée (RLS déjà correcte, isolation par `get_user_license_id`).

---

### Finding 3 : `license_addons` — Pricing visible (WARN)
**Analyse** : la policy limite déjà la lecture aux addons de la licence de l'utilisateur. Le pricing est volontairement transparent (page Marketplace publique sur le site marketing).

**Action** : Marquer comme `ignore` avec justification (transparence tarifaire assumée, RLS limite à la licence de l'utilisateur).

---

### Finding 4 : Edge functions API key sans authentification (INFO)
**Vrai risque modéré** : `google-maps-key` retourne la clé Google Maps à n'importe qui. Risque de consommation de quota.

**Correction** : Ajouter une vérification JWT sur `google-maps-key` (la clé est protégée par referrer Google Cloud, mais on ajoute une couche). Garder les autres fonctions (`google-directions`, `tomtom-route` etc.) telles quelles : elles sont déjà appelées avec auth dans la plupart des cas, et sont de simples proxies sans exposition de clé.

**Implémentation** :
- Modifier `google-maps-key/index.ts` : vérifier le header `Authorization` Bearer + `supabase.auth.getClaims()`.
- Retirer `verify_jwt = false` de `supabase/config.toml` pour `google-maps-key`.
- Vérifier que les appelants frontend (MapPreview, etc.) envoient bien le token (c'est le comportement par défaut de `supabase.functions.invoke`).

---

### Récapitulatif des changements

| Fichier | Action |
|---|---|
| **Migration SQL** | Créer fonction `get_clients_safe()` qui masque email/phone/siret/address pour rôles non-direction/exploitation |
| `src/hooks/useClients.ts` | Remplacer `.from('clients').select('*')` par `.rpc('get_clients_safe')` pour la lecture |
| `supabase/functions/google-maps-key/index.ts` | Ajouter vérification JWT |
| `supabase/config.toml` | Retirer `verify_jwt = false` pour `google-maps-key` |
| Findings sécurité | Marquer findings 2 et 3 comme `ignore` avec justifications |

### Section technique
- La RPC `get_clients_safe` retournera la même structure que la table `clients` mais avec des champs `NULL` pour les non-autorisés. Cela évite de casser les types TypeScript existants.
- Pour les opérations write (créer/modifier client), on garde l'accès direct table — la restriction de rôle se fait côté UI (déjà en place via `useRolePermissions`).
- `google-maps-key` requiert auth → tous les composants Map ne fonctionneront que pour utilisateurs connectés (déjà le cas en pratique, l'app entière est derrière auth).

