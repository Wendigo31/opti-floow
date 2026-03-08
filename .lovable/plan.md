

## Analyse de la grille tarifaire actuelle

### Problemes identifies

1. **Start a 29,99€ est inutilisable** : 2 vehicules, 2 conducteurs, 2 clients — aucun transporteur ne peut travailler avec ca. Et aucune fonctionnalite cle (itineraire, tournees, planning, IA). L'utilisateur paie 30€/mois pour un calculateur basique.

2. **Pro a 79,99€ sans itineraire ni planning** : ce sont les fonctionnalites coeur d'un outil de transport. Un Pro qui ajoute itineraire (19,99€) + planning (29,99€) = 129,97€/mois, presque le prix Enterprise mais avec des limites a 5.

3. **Les add-ons rendent l'upgrade absurde** : Pro + itineraire + planning + IA + equipe = 164,95€/mois > Enterprise (149,99€) mais avec moins de capacite. L'utilisateur rationnel passe directement Enterprise, rendant Pro et les add-ons inutiles.

4. **Pas de reduction annuelle** : le prix annuel = 12x mensuel, aucun incitatif.

5. **Capacites trop basses** : +5 elements pour 4,99-9,99€/mois recurrent, c'est cher et frustrant.

---

### Nouvelle grille proposee

**Start — 29,99€/mois | 299€/an (17% d'economie)**
- 5 calculs/jour
- Itineraire PL (restrictions, peages)
- 5 tournees sauvegardees
- 5 vehicules, 5 conducteurs, 10 clients
- ~~Planning~~ ~~Analyse IA~~ ~~Equipe~~

**Pro — 79,99€/mois | 799€/an (17% d'economie)**
- 25 calculs/jour
- Itineraire PL complet
- 20 tournees
- Planning conducteurs
- 5 analyses IA/jour
- 15 vehicules, 15 conducteurs, 30 clients
- ~~Equipe~~

**Enterprise — 149,99€/mois | 1 499€/an (17% d'economie)**
- Tout illimite
- Equipe & confidentialite des couts
- Support prioritaire

### Nouveaux add-ons (uniquement Start/Pro)

| Add-on | Prix/mois | Pour qui |
|---|---|---|
| +10 vehicules | 9,99€ | Start & Pro |
| +10 conducteurs | 9,99€ | Start & Pro |
| +10 clients | 4,99€ | Start & Pro |
| +10 tournees | 4,99€ | Start & Pro |
| Analyse IA (3/jour) | 14,99€ | Start uniquement |
| Equipe & confidentialite | 19,99€ | Start & Pro |

### Pourquoi c'est mieux

- **Start est utilisable** : itineraire inclus + assez de capacite pour un petit transporteur
- **Pro est le sweet spot** : planning + IA inclus, la majorite des PME y trouvent leur compte
- **Enterprise reste attractif** : illimite + equipe, pas de bricolage d'add-ons
- **Pas de piege d'add-ons** : impossible de depasser Enterprise en empilant des modules sur Pro
- **Reduction annuelle** : incite a l'engagement long terme

### Fichiers a modifier

1. **`src/components/onboarding/OnboardingFlow.tsx`** — Mettre a jour `PLANS` avec nouvelles features, prix, price IDs annuels
2. **`src/pages/Activation.tsx`** — Mettre a jour la grille comparative
3. **`src/components/settings/AddonMarketplace.tsx`** — Nouveaux add-ons, prix, logique de filtrage (masquer les add-ons deja inclus dans le forfait)
4. **`supabase/functions/validate-license/index.ts`** — Mettre a jour `PLAN_DEFAULTS` avec nouvelles limites
5. **`supabase/functions/self-register/index.ts`** — Mettre a jour `PLAN_FEATURE_DEFAULTS`
6. **`supabase/functions/addon-checkout/index.ts`** — Mettre a jour `ADDON_FEATURES` avec +10 au lieu de +5
7. **Stripe** — Creer nouveaux produits/prix pour les forfaits annuels a prix reduit et les add-ons modifies

