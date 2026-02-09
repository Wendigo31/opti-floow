

## Suppression de l'onglet Add-ons du panneau de detail utilisateur

### Contexte
L'onglet "Add-ons" dans le detail utilisateur est un vestige de l'ancien systeme de tarification qui a ete supprime. Le code reference des constantes supprimees (`ADD_ONS`), force `addonInfo = null`, et affiche systematiquement "Non disponible" ou des donnees vides. Cet onglet n'a plus de raison d'etre.

### Changements prevus

**Fichier : `src/components/admin/UserDetailDialog.tsx`**

1. Supprimer tout le state lie aux add-ons (`addons`, `addonsLoading`, `addonsEditMode`, `selectedAddons`, `addonsSaving`)
2. Supprimer les fonctions `fetchAddons`, `saveAddons`, `toggleAddonSelection`, `cancelEditAddons`
3. Supprimer l'appel a `fetchAddons()` dans le `useEffect`
4. Supprimer l'onglet "Add-ons" du `TabsList` (passer de 8 a 7 colonnes : `grid-cols-7`)
5. Supprimer le `TabsContent value="addons"` entier
6. Supprimer les imports devenus inutiles (`Package`, `Sparkles`, `Pencil`, `DollarSign`, `Calendar` si non utilises ailleurs, et le type `LicenseAddon`)

### Resultat
L'interface admin sera plus propre, sans onglet inutile affichant "Non disponible".

