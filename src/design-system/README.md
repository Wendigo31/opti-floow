# Design System - Guide d'utilisation

Ce dossier contient le système de design réutilisable pour vos projets.

## 📁 Structure des fichiers

```
src/design-system/
├── tokens.ts          # Tous les tokens de design (spacing, shadows, animations, etc.)
├── README.md          # Ce fichier
└── css-template.css   # Template CSS à copier dans index.css
```

## 🚀 Comment utiliser dans un nouveau projet

### 1. Copier les fichiers

Copiez le dossier `design-system` dans votre nouveau projet sous `src/`.

### 2. Configurer Tailwind

Mettez à jour votre `tailwind.config.ts` :

```typescript
import type { Config } from "tailwindcss";
import { tailwindExtend } from "./src/design-system/tokens";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: tailwindExtend.container,
    extend: {
      ...tailwindExtend,
      // Ajoutez vos couleurs personnalisées ici
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### 3. Copier le CSS

Copiez le contenu de `css-template.css` dans votre `index.css` et personnalisez les couleurs dans les variables CSS.

## 📐 Tokens disponibles

### Spacing
Système d'espacement basé sur 4px (0.25rem).

```typescript
import { spacing } from '@/design-system/tokens';
// spacing[4] = '1rem' (16px)
```

### Border Radius
```typescript
import { borderRadius } from '@/design-system/tokens';
// borderRadius.lg = 'var(--radius)' (12px)
```

### Shadows
```typescript
import { shadows, specialShadows } from '@/design-system/tokens';
// shadows.lg, specialShadows.glow, etc.
```

### Animations
```typescript
import { keyframes, animation, staggerDelays } from '@/design-system/tokens';
// animation['slide-up'] = 'slide-up 0.5s ease-out forwards'
```

### Typography
```typescript
import { fontFamily, fontSize, fontWeight, lineHeight } from '@/design-system/tokens';
```

### Layout
```typescript
import { layout } from '@/design-system/tokens';
// layout.sidebar.collapsed = '64px'
// layout.sidebar.expanded = '256px'
// layout.topbar.height = '56px'
```

### Z-Index
```typescript
import { zIndex } from '@/design-system/tokens';
// zIndex.modal = '500'
// zIndex.tooltip = '700'
```

## 🎨 Classes de composants

Utilisez les classes prédéfinies pour un style cohérent :

```typescript
import { componentClasses } from '@/design-system/tokens';

// Utilisation dans JSX
<div className={componentClasses.glassCard}>
  Contenu
</div>

<button className={componentClasses.btnPrimary}>
  Action
</button>
```

Classes disponibles :
- `glassCard` - Carte avec effet glass morphism
- `solidCard` - Carte solide
- `statCard` - Carte de statistique avec hover
- `navItem` / `navItemActive` - Éléments de navigation
- `inputField` - Champs de formulaire
- `btnPrimary` / `btnSecondary` / `btnGhost` / `btnOutline` - Boutons
- `badge` - Badges
- `metricPositive` / `metricNegative` / `metricNeutral` - Métriques colorées

## 🌈 Personnalisation des couleurs

Les couleurs sont définies via des variables CSS HSL. Modifiez-les dans `index.css` :

```css
:root {
  /* Couleur primaire - changez les valeurs HSL */
  --primary: 220 90% 56%;        /* Bleu */
  --primary-foreground: 0 0% 100%;
  
  /* Couleur secondaire */
  --secondary: 280 60% 55%;      /* Violet */
  --secondary-foreground: 0 0% 100%;
  
  /* Succès */
  --success: 142 76% 36%;        /* Vert */
  
  /* Destructive */
  --destructive: 0 72% 50%;      /* Rouge */
  
  /* etc... */
}
```

## 📱 Breakpoints

```typescript
import { screens } from '@/design-system/tokens';
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1400px
```

## ⏱️ Transitions

```typescript
import { transitionDuration, transitionTimingFunction } from '@/design-system/tokens';
// transitionDuration[200] = '200ms'
// transitionTimingFunction.bounce = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
```

## 🖨️ Styles d'impression

Les styles d'impression sont inclus dans `printStyles`. Ajoutez-les à votre CSS pour un support print optimisé.

---

Pour toute question, consultez les fichiers source dans ce dossier.
