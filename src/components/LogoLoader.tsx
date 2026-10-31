import { useId } from 'react';

/**
 * Animation de chargement aux couleurs du logo de l'application.
 * L'anneau ouvert se trace puis s'efface, le symbole s'anime au centre :
 *  - OptiFret : le colis flotte, la flèche se trace ;
 *  - OptiFlow : les trois chevrons s'allument l'un après l'autre ;
 *  - OptiXpress : le colis avance, les traits de vitesse filent.
 * Fichier partagé (bridge/shared/loader) — le même dans les trois logiciels.
 */
export type LoaderApp = 'fret' | 'flow' | 'xpress';

interface LogoLoaderProps {
  app: LoaderApp;
  /** Taille du symbole en pixels. */
  size?: number;
  /** Texte sous le symbole ; null pour ne rien afficher. */
  label?: string | null;
  /** Écran entier (lancement, connexion) ou bloc centré dans la page. */
  variant?: 'fullscreen' | 'page' | 'inline';
  className?: string;
}

const RING_D = 'M43.1,199.9 A118,118 0 1 1 100.1,256.9';

const RING_STOPS: Record<LoaderApp, [number, string][]> = {
  fret: [[0, '#22C55E'], [0.42, '#D4A443'], [0.62, '#2D6E9E'], [1, '#0B3B7A']],
  flow: [[0, '#18A8A8'], [0.45, '#D87818'], [0.7, '#2D5F95'], [1, '#0B3B7A']],
  xpress: [[0, '#F59E0B'], [0.3, '#F07800'], [0.55, '#D83A30'], [1, '#1A5FA0']],
};

const NAMES: Record<LoaderApp, string> = { fret: 'OptiFret', flow: 'OptiFlow', xpress: 'OptiXpress' };

export const LOGO_LOADER_CSS = `
.ll-mark{display:block;overflow:visible}
.ll-ink{fill:#0C2D5E}.ll-inks{stroke:#0C2D5E}
.dark .ll-ink{fill:#E8ECF7}.dark .ll-inks{stroke:#E8ECF7}
.ll-track{opacity:.14}
.ll-ring{stroke-dasharray:100 110;stroke-dashoffset:0;animation:ll-ring 2.4s cubic-bezier(.65,0,.35,1) infinite}
@keyframes ll-ring{0%{stroke-dashoffset:106}45%,62%{stroke-dashoffset:0}100%{stroke-dashoffset:-106}}
.ll-float{animation:ll-float 2.4s ease-in-out infinite}
@keyframes ll-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.ll-draw{stroke-dasharray:100 110;stroke-dashoffset:0;animation:ll-draw 2.4s cubic-bezier(.65,0,.35,1) infinite}
@keyframes ll-draw{0%,12%{stroke-dashoffset:106}55%,80%{stroke-dashoffset:0}100%{stroke-dashoffset:-106}}
.ll-head{animation:ll-head 2.4s ease-in-out infinite}
@keyframes ll-head{0%,45%{opacity:0;transform:translate(-6px,4px)}55%,80%{opacity:1;transform:translate(0,0)}95%,100%{opacity:0}}
.ll-chev{animation:ll-chev 1.2s ease-in-out infinite}
@keyframes ll-chev{0%,100%{opacity:.22;transform:translateX(-5px)}45%{opacity:1;transform:translateX(5px)}}
.ll-go{animation:ll-go 1.2s ease-in-out infinite}
@keyframes ll-go{0%,100%{transform:translateX(-3px)}50%{transform:translateX(5px)}}
.ll-speed{animation:ll-speed 1.2s linear infinite}
@keyframes ll-speed{0%{opacity:0;transform:translateX(12px)}25%{opacity:1}100%{opacity:0;transform:translateX(-18px)}}
.ll-label{animation:ll-label 2.4s ease-in-out infinite}
@keyframes ll-label{0%,100%{opacity:.55}50%{opacity:1}}
`;

function Symbol({ app, gid }: { app: LoaderApp; gid: string }) {
  if (app === 'flow') {
    const chev = (x: number, color: string, delay: number) => (
      <path
        className="ll-chev"
        style={{ animationDelay: `${delay}s` }}
        d={`M${x},104 L${x + 44},150 L${x},196`}
        fill="none"
        stroke={color}
        strokeWidth={24}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
    return (
      <>
        {chev(86, '#18A8A8', 0)}
        {chev(132, '#D87818', 0.15)}
        <g className="ll-inks">
          <path
            className="ll-chev"
            style={{ animationDelay: '0.3s' }}
            d="M178,104 L222,150 L178,196"
            fill="none"
            strokeWidth={24}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </>
    );
  }
  if (app === 'xpress') {
    return (
      <>
        <defs>
          <linearGradient id={`${gid}-bx`} gradientUnits="userSpaceOnUse" x1="130" y1="110" x2="220" y2="200">
            <stop offset="0" stopColor="#F0A048" />
            <stop offset="1" stopColor="#C96A12" />
          </linearGradient>
        </defs>
        <g className="ll-go">
          <rect x="128" y="104" width="94" height="92" rx="10" fill={`url(#${gid}-bx)`} />
          <rect x="166" y="104" width="18" height="92" fill="#1AA0B0" />
        </g>
        <g className="ll-inks" strokeWidth={12} strokeLinecap="round">
          <path className="ll-speed" d="M66,124 h44" />
          <path className="ll-speed" style={{ animationDelay: '0.3s' }} d="M54,150 h56" />
          <path className="ll-speed" style={{ animationDelay: '0.6s' }} d="M72,176 h38" />
        </g>
        <path
          className="ll-inks ll-draw"
          pathLength={100}
          d="M88,222 C140,240 196,232 232,206"
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
        />
      </>
    );
  }
  return (
    <>
      <g className="ll-float">
        <path d="M76,108 L150,80 L224,108 L150,136 Z" fill="#5BD08A" />
        <path d="M76,108 L150,136 L150,190 L76,162 Z" fill="#22A85A" />
        <path d="M150,136 L224,108 L224,162 L150,190 Z" fill="#157A46" />
        <path
          className="ll-ink"
          d="M84,167 l15,5.7 v13 l-15,-5.7 Z M108,176.1 l15,5.7 v13 l-15,-5.7 Z M132,185.2 l15,5.7 v13 l-15,-5.7 Z"
        />
      </g>
      <path
        className="ll-inks ll-draw"
        pathLength={100}
        d="M64,224 C126,252 198,240 230,202"
        fill="none"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path className="ll-ink ll-head" d="M214,196 L246,184 L242,218 Z" />
    </>
  );
}

export function LogoMarkAnimated({ app, size = 96 }: { app: LoaderApp; size?: number }) {
  const gid = `ll${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const stops = RING_STOPS[app];
  return (
    <svg className="ll-mark" viewBox="0 0 300 300" width={size} height={size} aria-hidden="true">
      <style>{LOGO_LOADER_CSS}</style>
      <defs>
        <linearGradient id={`${gid}-r`} gradientUnits="userSpaceOnUse" x1="40" y1="40" x2="260" y2="260">
          {stops.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <path className="ll-track" d={RING_D} fill="none" stroke={`url(#${gid}-r)`} strokeWidth={18} strokeLinecap="round" />
      <path
        className="ll-ring"
        pathLength={100}
        d={RING_D}
        fill="none"
        stroke={`url(#${gid}-r)`}
        strokeWidth={18}
        strokeLinecap="round"
      />
      <Symbol app={app} gid={gid} />
    </svg>
  );
}

export function LogoLoader({ app, size, label = 'Chargement…', variant = 'page', className = '' }: LogoLoaderProps) {
  const px = size ?? (variant === 'fullscreen' ? 112 : variant === 'page' ? 88 : 56);
  const wrap =
    variant === 'fullscreen'
      ? 'fixed inset-0 z-[100] bg-background'
      : variant === 'page'
        ? 'min-h-screen bg-background'
        : 'min-h-[40vh]';
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? `Chargement de ${NAMES[app]}`}
      className={`${wrap} flex flex-col items-center justify-center gap-5 ${className}`}
    >
      <LogoMarkAnimated app={app} size={px} />
      {label && <p className="ll-label text-sm font-medium text-muted-foreground">{label}</p>}
    </div>
  );
}

export default LogoLoader;
