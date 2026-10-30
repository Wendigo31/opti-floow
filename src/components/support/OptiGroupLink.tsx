/**
 * Logo carré OptiGroup qui ouvre opti-group.fr — identique dans les 3 logiciels, à côté du
 * bouton Support (volet d'onglets et page de connexion).
 */
export function OptiGroupLink({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <a
      href="https://opti-group.fr"
      target="_blank"
      rel="noopener noreferrer"
      title="OptiGroup — opti-group.fr"
      aria-label="OptiGroup : ouvrir le site opti-group.fr"
      className={`inline-flex shrink-0 rounded-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <svg viewBox="0 0 1024 1024" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="optigroup-sq-bg" x1="100" y1="70" x2="924" y2="954" gradientUnits="userSpaceOnUse">
            <stop stopColor="#19234B" />
            <stop offset="1" stopColor="#0B1028" />
          </linearGradient>
          <linearGradient id="optigroup-sq-brand" x1="162" y1="363" x2="862" y2="646" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFB000" />
            <stop offset=".24" stopColor="#FF6A22" />
            <stop offset=".5" stopColor="#A550E8" />
            <stop offset=".74" stopColor="#5375FF" />
            <stop offset="1" stopColor="#20D3DA" />
          </linearGradient>
        </defs>
        <rect width="1024" height="1024" rx="224" fill="url(#optigroup-sq-bg)" />
        <path
          d="M166 512C166 385 273 344 360 378C425 404 466 466 511 512C557 560 599 620 664 646C751 680 856 639 856 512C856 385 751 344 664 378C599 404 557 464 511 512C466 560 425 620 360 646C273 680 166 639 166 512"
          fill="none"
          stroke="url(#optigroup-sq-brand)"
          strokeWidth="92"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
