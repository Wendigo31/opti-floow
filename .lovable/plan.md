

# Prompt complet pour OptiPlan avec le design UI d'OptiFlow

Voici le prompt prêt à coller dans un nouveau projet Lovable. Il inclut le design system complet (CSS variables, composants, layout), le branding OptiPlan, et la connexion au backend partagé.

---

**Prompt à coller :**

````
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

## DESIGN SYSTEM COMPLET (identique à OptiFlow, rebranded OptiPlan)

### Couleurs CSS Variables (copier exactement dans index.css)

Le design utilise un thème Teal (#0EA5A8) + Orange (#F97316) avec sidebar dark navy. Applique ces CSS variables exactes :

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 180 15% 98%;
    --foreground: 210 45% 20%;
    --card: 0 0% 100%;
    --card-foreground: 210 45% 20%;
    --popover: 0 0% 100%;
    --popover-foreground: 210 45% 20%;
    --primary: 175 85% 35%;
    --primary-foreground: 0 0% 100%;
    --secondary: 24 95% 53%;
    --secondary-foreground: 0 0% 100%;
    --muted: 180 10% 90%;
    --muted-foreground: 210 20% 45%;
    --accent: 175 40% 94%;
    --accent-foreground: 175 85% 30%;
    --destructive: 0 72% 50%;
    --destructive-foreground: 0 85% 97%;
    --success: 158 70% 40%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 210 45% 15%;
    --border: 180 15% 88%;
    --input: 180 15% 88%;
    --ring: 175 85% 35%;
    --radius: 0.75rem;
    --sidebar-background: 210 45% 12%;
    --sidebar-foreground: 180 15% 95%;
    --sidebar-primary: 175 85% 45%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 175 40% 20%;
    --sidebar-accent-foreground: 175 60% 70%;
    --sidebar-border: 210 30% 20%;
    --sidebar-ring: 175 85% 45%;
    --gradient-primary: linear-gradient(135deg, hsl(175 85% 35%) 0%, hsl(24 95% 53%) 100%);
    --gradient-success: linear-gradient(135deg, hsl(158 70% 40%) 0%, hsl(142 76% 50%) 100%);
    --gradient-card: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(180 15% 97%) 100%);
    --gradient-glass: linear-gradient(135deg, hsla(175 85% 95% / 0.5) 0%, hsla(24 95% 95% / 0.3) 100%);
    --shadow-glow: 0 0 40px hsla(175 85% 35% / 0.25);
    --shadow-card: 0 4px 24px hsla(210 45% 20% / 0.08);
    --shadow-elevated: 0 8px 32px hsla(210 45% 20% / 0.12);
    --chart-1: 175 85% 40%;
    --chart-2: 24 95% 53%;
    --chart-3: 200 80% 50%;
    --chart-4: 158 70% 45%;
    --chart-5: 210 45% 50%;
  }

  .dark {
    --background: 210 45% 8%;
    --foreground: 180 15% 98%;
    --card: 210 40% 12%;
    --card-foreground: 180 15% 98%;
    --popover: 210 40% 14%;
    --popover-foreground: 180 15% 98%;
    --primary: 175 80% 45%;
    --primary-foreground: 210 45% 8%;
    --secondary: 24 95% 58%;
    --secondary-foreground: 0 0% 100%;
    --muted: 210 30% 22%;
    --muted-foreground: 180 10% 70%;
    --accent: 175 40% 18%;
    --accent-foreground: 175 60% 70%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 85% 97%;
    --success: 158 70% 50%;
    --success-foreground: 210 40% 98%;
    --warning: 38 92% 55%;
    --warning-foreground: 210 45% 8%;
    --border: 210 30% 22%;
    --input: 210 30% 22%;
    --ring: 175 80% 45%;
    --sidebar-background: 210 45% 6%;
    --sidebar-foreground: 180 15% 98%;
    --sidebar-primary: 175 80% 50%;
    --sidebar-primary-foreground: 210 45% 8%;
    --sidebar-accent: 175 40% 18%;
    --sidebar-accent-foreground: 175 60% 70%;
    --sidebar-border: 210 30% 18%;
    --sidebar-ring: 175 80% 50%;
    --gradient-primary: linear-gradient(135deg, hsl(175 80% 45%) 0%, hsl(24 95% 58%) 100%);
    --gradient-success: linear-gradient(135deg, hsl(158 70% 50%) 0%, hsl(142 76% 55%) 100%);
    --gradient-card: linear-gradient(180deg, hsl(210 40% 12%) 0%, hsl(210 45% 8%) 100%);
    --gradient-glass: linear-gradient(135deg, hsla(175 80% 25% / 0.3) 0%, hsla(24 95% 25% / 0.2) 100%);
    --shadow-glow: 0 0 40px hsla(175 80% 45% / 0.25);
    --shadow-card: 0 4px 24px hsla(0 0% 0% / 0.4);
    --shadow-elevated: 0 8px 32px hsla(0 0% 0% / 0.5);
    --chart-1: 175 80% 50%;
    --chart-2: 24 95% 60%;
    --chart-3: 200 80% 55%;
    --chart-4: 158 70% 55%;
    --chart-5: 210 45% 55%;
  }
}
```

### Composants CSS personnalisés (à inclure dans index.css)

```css
@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground font-sans antialiased; font-family: 'Inter', sans-serif; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { @apply bg-muted/30 rounded-full; }
  ::-webkit-scrollbar-thumb { @apply bg-muted-foreground/30 rounded-full hover:bg-muted-foreground/50 transition-colors; }
}

@layer components {
  .glass-card {
    @apply bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl;
    box-shadow: var(--shadow-card);
  }
  .glow-primary { box-shadow: var(--shadow-glow); }
  .gradient-text { @apply bg-clip-text text-transparent; background-image: var(--gradient-primary); }
  .stat-card { @apply glass-card p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-primary/30; }
  .stat-card::before { content: ''; @apply absolute inset-0 opacity-0 transition-opacity duration-300; background: var(--gradient-glass); }
  .stat-card:hover::before { @apply opacity-100; }
  .nav-item { @apply flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-sidebar-accent hover:text-foreground; }
  .nav-item.active { @apply bg-primary/10 text-primary border-l-2 border-primary; }
  .input-field { @apply bg-muted/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200; }
  .btn-primary { @apply text-white transition-all duration-300 shadow-lg; background: var(--gradient-primary); }
  .btn-primary:hover { @apply shadow-xl scale-[1.02]; filter: brightness(1.1); }
  .btn-gradient { @apply text-white font-semibold transition-all duration-300 shadow-lg relative overflow-hidden; background: var(--gradient-primary); }
  .btn-gradient:hover { @apply shadow-xl; transform: translateY(-2px) scale(1.02); filter: brightness(1.1); }
}

@layer utilities {
  .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
  .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
  .animate-scale-in { animation: scaleIn 0.3s ease-out forwards; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
}
```

### Tailwind Config

Le tailwind.config.ts doit utiliser les mêmes extensions de couleurs basées sur les CSS variables :
- Utilise `hsl(var(--xxx))` pour toutes les couleurs (primary, secondary, destructive, success, warning, muted, accent, card, popover, sidebar)
- borderRadius: lg = `var(--radius)`, md = `calc(var(--radius) - 2px)`, sm = `calc(var(--radius) - 4px)`
- Font: Inter comme font-sans par défaut
- Plugin: tailwindcss-animate
- darkMode: ["class"]

## LAYOUT (identique à OptiFlow)

### MainLayout
- LoadingScreen en overlay au démarrage (2.5s) avec logo OptiPlan, barre de progression gradient, texte "Gestion opérationnelle transport"
- Sidebar fixe à gauche (w-64, collapsible à w-20) avec fond dark navy (`bg-sidebar`)
- TopBar fixe en haut (h-14) avec backdrop blur, qui s'adapte à la largeur sidebar
- Contenu principal avec `pt-14` et marge gauche dynamique (`ml-20` ou `ml-64`)
- Support dark mode (toggle cycle: auto → clair → sombre → auto)
- Responsive : sidebar cachée sur mobile, remplacée par Sheet/drawer hamburger menu

### Sidebar
- Logo OptiPlan en haut avec bordure inférieure
- Navigation groupée par sections avec labels en majuscules (10px, tracking wider, 50% opacity)
- Items nav : icône + label, style actif avec `bg-primary/10 text-primary border-l-2 border-primary`
- Bouton collapse en bas avec chevron
- Lien croisé vers OptiFlow (https://opti-floow.lovable.app) en bas de la sidebar, avec icône et style accent
- 3 sections : Planning (CalendarDays), Conducteurs (Users), Véhicules (Truck)

### TopBar
- Gauche : hamburger mobile + heure (HH:mm dans badge muted) + nom utilisateur + nom société
- Droite : toggle thème (bouton rond outline) + badge rôle (direction/exploitation/membre avec couleurs) + déconnexion (LogOut icon, confirmation dialog)
- Indicateur hors-ligne avec WifiOff pulsant

## AUTHENTIFICATION (identique à OptiFlow)

L'authentification utilise le même système que OptiFlow :
- **Identifiant société** (= code licence, case-insensitive)
- **Email professionnel**

Flow :
1. POST `${SUPABASE_URL}/functions/v1/validate-license` avec `{ code, email }`
2. Réponse : `{ success, session, user, license_id, plan_type, company_name, features }`
3. `supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token })`
4. Récupérer license_id : `SELECT license_id, role FROM company_users WHERE user_id = auth.uid() AND is_active = true`

### LicenseContext
Expose : `licenseId`, `authUserId`, `userRole` ('direction' | 'exploitation' | 'membre'), `companyName`, `planType`, `isLoading`, `isOffline`, `clearLicense`, `refreshLicenseId`.

### Page d'activation
- Centrée, fond avec blobs animés (comme le loading screen)
- Logo OptiPlan (texte gradient), sous-titre "Gestion opérationnelle transport"
- Champs : "Identifiant société" et "Email professionnel"
- Bouton gradient teal→orange "Se connecter"
- Gestion erreurs avec toast sonner

## TABLES EXISTANTES (NE PAS CRÉER)

- `licenses` — licences entreprise
- `company_users` — utilisateurs (user_id, license_id, role, email, display_name, is_active)
- `user_drivers` — conducteurs (id, local_id, name, driver_type ['cdi'|'cdd'|'interim'], hourly_rate, base_salary, driver_data JSONB, license_id)
- `user_vehicles` — véhicules (id, local_id, vehicle_data JSONB, license_id)
- `user_trailers` — remorques (id, local_id, trailer_data JSONB, license_id)
- `planning_entries` — entrées planning (id, license_id, user_id, tour_name, mission_order, driver_id, vehicle_id, client_id, day_of_week, week_start_date, entry_data JSONB, sector_manager, status)
- `clients` — clients (id, name, license_id, user_id, contact_email, contact_phone, address, notes, client_data JSONB)

RLS basé sur `get_user_license_id(auth.uid())`.

## 3 MODULES

### 1. Planning (/planning)
- Grille 7 colonnes (Lundi → Dimanche soir) dans des `glass-card`
- Lignes groupées par traction (tour_name + mission_order)
- Cellule = conducteur + véhicule + client
- Navigation semaine ← → avec date affichée
- Bouton "Ajouter une traction" (Dialog shadcn)
- Données : `planning_entries` filtré par license_id + week_start_date
- Realtime : subscribe via Supabase channel

### 2. Conducteurs (/drivers)
- Tabs shadcn : CDI | CDD | Intérimaires
- Table avec colonnes : nom, type, taux horaire (masqué si rôle != 'direction'), agence
- CRUD (Dialog pour ajout/modif, AlertDialog pour suppression)
- Import Excel (.xlsx)
- Données : `user_drivers` filtré par license_id

### 3. Véhicules & Remorques (/vehicles)
- Tabs : Véhicules | Remorques
- Cards ou Table avec infos (immat, marque, modèle, km, coût/km)
- CRUD complet
- Données : `user_vehicles` et `user_trailers` filtré par license_id

## BRANDING

- Nom : "OptiPlan"
- Sous-titre : "Gestion opérationnelle transport"
- Produit par : OptiGroup
- Logo : texte "OptiPlan" en gradient-text (teal→orange), pas d'image logo nécessaire
- Composants : shadcn/ui (Button, Card, Input, Select, Table, Tabs, Dialog, Badge, AlertDialog, Sheet, Tooltip, etc.)
- Toasts : sonner
- Icônes : lucide-react
- Langue : tout en français

## IMPORTANT

- NE PAS créer de tables — elles existent déjà
- NE PAS créer d'edge functions — elles sont déjà déployées
- Le même utilisateur peut être connecté sur OptiFlow ET OptiPlan simultanément
- Les modifications sont visibles en temps réel sur les deux apps
````

