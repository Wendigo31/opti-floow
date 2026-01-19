/**
 * Design System Tokens - Configuration réutilisable
 * 
 * Ce fichier contient tous les tokens de design génériques
 * qui peuvent être importés dans n'importe quel projet.
 * 
 * Usage:
 * 1. Copier ce fichier dans votre nouveau projet
 * 2. Copier les CSS correspondants dans votre index.css
 * 3. Mettre à jour tailwind.config.ts avec les extensions
 */

// ============================================
// SPACING SYSTEM
// Base unit: 0.25rem (4px)
// ============================================
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================
// BORDER RADIUS
// ============================================
export const borderRadius = {
  none: '0',
  sm: 'calc(var(--radius) - 4px)',   // ~8px
  md: 'calc(var(--radius) - 2px)',   // ~10px
  DEFAULT: 'var(--radius)',           // 12px (0.75rem)
  lg: 'var(--radius)',                // 12px
  xl: 'calc(var(--radius) + 4px)',   // ~16px
  '2xl': 'calc(var(--radius) + 8px)', // ~20px
  '3xl': 'calc(var(--radius) + 12px)', // ~24px
  full: '9999px',
} as const;

// CSS Variable à ajouter dans :root
export const radiusCSSVar = '--radius: 0.75rem;'; // 12px

// ============================================
// SHADOWS
// ============================================
export const shadows = {
  '2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
  xs: '0 1px 3px 0px hsl(0 0% 0% / 0.05)',
  sm: '0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)',
  DEFAULT: '0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)',
  md: '0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 2px 4px -1px hsl(0 0% 0% / 0.1)',
  lg: '0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 4px 6px -1px hsl(0 0% 0% / 0.1)',
  xl: '0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 8px 10px -1px hsl(0 0% 0% / 0.1)',
  '2xl': '0 1px 3px 0px hsl(0 0% 0% / 0.25)',
  inner: 'inset 0 2px 4px 0 hsl(0 0% 0% / 0.05)',
  none: 'none',
} as const;

// Shadows spéciales (à personnaliser avec vos couleurs primaires)
export const specialShadows = {
  glow: '0 0 40px hsla(var(--primary) / 0.2)',
  card: '0 4px 24px hsla(var(--foreground) / 0.08)',
  elevated: '0 8px 32px hsla(var(--foreground) / 0.12)',
  // Versions dark mode
  cardDark: '0 4px 24px hsla(0 0% 0% / 0.4)',
  elevatedDark: '0 8px 32px hsla(0 0% 0% / 0.5)',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================
export const fontFamily = {
  sans: [
    'Inter',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'sans-serif',
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji',
  ],
  serif: [
    'Georgia',
    'Cambria',
    'Times New Roman',
    'Times',
    'serif',
  ],
  mono: [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ],
} as const;

export const fontSize = {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  '5xl': ['3rem', { lineHeight: '1' }],
  '6xl': ['3.75rem', { lineHeight: '1' }],
  '7xl': ['4.5rem', { lineHeight: '1' }],
  '8xl': ['6rem', { lineHeight: '1' }],
  '9xl': ['8rem', { lineHeight: '1' }],
} as const;

export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;

export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
} as const;

// ============================================
// ANIMATIONS & KEYFRAMES
// ============================================
export const keyframes = {
  'accordion-down': {
    from: { height: '0' },
    to: { height: 'var(--radix-accordion-content-height)' },
  },
  'accordion-up': {
    from: { height: 'var(--radix-accordion-content-height)' },
    to: { height: '0' },
  },
  'fade-in': {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  'fade-out': {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },
  'slide-up': {
    from: { opacity: '0', transform: 'translateY(20px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  'slide-down': {
    from: { opacity: '0', transform: 'translateY(-20px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  'slide-left': {
    from: { opacity: '0', transform: 'translateX(20px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  'slide-right': {
    from: { opacity: '0', transform: 'translateX(-20px)' },
    to: { opacity: '1', transform: 'translateX(0)' },
  },
  'scale-in': {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  'scale-out': {
    from: { opacity: '1', transform: 'scale(1)' },
    to: { opacity: '0', transform: 'scale(0.95)' },
  },
  'spin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  'ping': {
    '75%, 100%': { transform: 'scale(2)', opacity: '0' },
  },
  'pulse': {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },
  'pulse-glow': {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.6' },
  },
  'bounce': {
    '0%, 100%': {
      transform: 'translateY(-25%)',
      animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
    },
    '50%': {
      transform: 'translateY(0)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
    },
  },
  'shimmer': {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  'float': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  'shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
  },
} as const;

export const animation = {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out',
  'fade-in': 'fade-in 0.3s ease-out forwards',
  'fade-out': 'fade-out 0.3s ease-out forwards',
  'slide-up': 'slide-up 0.5s ease-out forwards',
  'slide-down': 'slide-down 0.5s ease-out forwards',
  'slide-left': 'slide-left 0.5s ease-out forwards',
  'slide-right': 'slide-right 0.5s ease-out forwards',
  'scale-in': 'scale-in 0.3s ease-out forwards',
  'scale-out': 'scale-out 0.3s ease-out forwards',
  'spin': 'spin 1s linear infinite',
  'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
  'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  'bounce': 'bounce 1s infinite',
  'shimmer': 'shimmer 2s linear infinite',
  'float': 'float 3s ease-in-out infinite',
  'shake': 'shake 0.5s ease-in-out',
} as const;

// Délais d'animation pour le stagger effect
export const staggerDelays = {
  1: '0.1s',
  2: '0.2s',
  3: '0.3s',
  4: '0.4s',
  5: '0.5s',
  6: '0.6s',
  7: '0.7s',
  8: '0.8s',
} as const;

// ============================================
// TRANSITIONS
// ============================================
export const transitionDuration = {
  75: '75ms',
  100: '100ms',
  150: '150ms',
  200: '200ms',
  300: '300ms',
  500: '500ms',
  700: '700ms',
  1000: '1000ms',
} as const;

export const transitionTimingFunction = {
  DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

// ============================================
// BREAKPOINTS
// ============================================
export const screens = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1400px',
} as const;

// ============================================
// Z-INDEX
// ============================================
export const zIndex = {
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  dropdown: '100',
  sticky: '200',
  fixed: '300',
  overlay: '400',
  modal: '500',
  popover: '600',
  tooltip: '700',
  toast: '800',
  max: '9999',
} as const;

// ============================================
// CONTAINER
// ============================================
export const container = {
  center: true,
  padding: '2rem',
  screens: {
    '2xl': '1400px',
  },
} as const;

// ============================================
// LAYOUT DIMENSIONS
// ============================================
export const layout = {
  sidebar: {
    collapsed: '64px',
    expanded: '256px',
  },
  topbar: {
    height: '56px',
  },
  content: {
    maxWidth: '1400px',
    padding: '1.5rem', // p-6
  },
} as const;

// ============================================
// COMPONENT STYLES (Classes réutilisables)
// ============================================
export const componentClasses = {
  // Card styles
  glassCard: 'bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl',
  solidCard: 'bg-card border border-border rounded-xl',
  
  // Stat card with hover effect
  statCard: 'bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl p-6 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:border-primary/30',
  
  // Navigation item
  navItem: 'flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground transition-all duration-200 hover:bg-accent hover:text-foreground',
  navItemActive: 'bg-primary/10 text-primary border-l-2 border-primary',
  
  // Input field
  inputField: 'bg-muted/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-200',
  
  // Buttons
  btnPrimary: 'bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-primary/25',
  btnSecondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all duration-200',
  btnGhost: 'hover:bg-accent hover:text-accent-foreground transition-colors duration-200',
  btnOutline: 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors duration-200',
  
  // Badges
  badge: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  
  // Metrics
  metricPositive: 'text-success',
  metricNegative: 'text-destructive',
  metricNeutral: 'text-muted-foreground',
} as const;

// ============================================
// SCROLLBAR STYLES
// ============================================
export const scrollbarStyles = `
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: hsl(var(--muted) / 0.3);
    border-radius: 9999px;
  }

  ::-webkit-scrollbar-thumb {
    background: hsl(var(--muted-foreground) / 0.3);
    border-radius: 9999px;
    transition: background 0.2s;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--muted-foreground) / 0.5);
  }
`;

// ============================================
// GRADIENTS (templates - remplacer les couleurs)
// ============================================
export const gradientTemplates = {
  primary: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
  success: 'linear-gradient(135deg, hsl(var(--success)) 0%, hsl(158 64% 52%) 100%)',
  danger: 'linear-gradient(135deg, hsl(var(--destructive)) 0%, hsl(15 86% 57%) 100%)',
  card: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)',
  glass: 'linear-gradient(135deg, hsla(var(--primary) / 0.1) 0%, hsla(var(--secondary) / 0.05) 100%)',
  radial: 'radial-gradient(var(--tw-gradient-stops))',
  conic: 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
} as const;

// ============================================
// EXPORT CONFIGURATION TAILWIND
// ============================================
export const tailwindExtend = {
  spacing,
  borderRadius,
  boxShadow: shadows,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  keyframes,
  animation,
  transitionDuration,
  transitionTimingFunction,
  screens,
  zIndex,
  container,
} as const;

// ============================================
// PRINT STYLES
// ============================================
export const printStyles = `
@media print {
  .no-print,
  .sidebar,
  aside,
  nav,
  button,
  .leaflet-control-zoom,
  .leaflet-control-attribution {
    display: none !important;
  }

  * {
    color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body {
    background: white !important;
    color: #1a1a1a !important;
    font-size: 12pt;
    line-height: 1.4;
    margin: 0;
    padding: 20mm;
  }

  @page {
    size: A4;
    margin: 15mm;
  }

  main {
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
  }

  .glass-card {
    background: white !important;
    border: 1px solid #d1d5db !important;
    box-shadow: none !important;
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 10mm;
    padding: 15px !important;
  }

  h1, h2, h3 {
    color: #1a1a1a !important;
    page-break-after: avoid;
  }

  [class*="animate-"] {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;

export default {
  spacing,
  borderRadius,
  shadows,
  specialShadows,
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  keyframes,
  animation,
  staggerDelays,
  transitionDuration,
  transitionTimingFunction,
  screens,
  zIndex,
  container,
  layout,
  componentClasses,
  scrollbarStyles,
  gradientTemplates,
  tailwindExtend,
  printStyles,
};
