import { useState, type ReactNode } from 'react';
import { CheckCircle2, Eye, EyeOff, Loader2, Lock, LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SupportButton } from '@/components/support/SupportButton';
import { LogoMarkAnimated, type LoaderApp } from '@/components/LogoLoader';
import { CentralBanner } from '@/components/CentralBanner';

/**
 * Écran de connexion — identique dans OptiFlow, OptiFret et OptiXpress, aux couleurs de
 * chaque logiciel : un panneau de marque (logo animé, promesse, points forts) et le
 * formulaire email / identifiant (la partie de l'email avant le @) + mot de passe.
 */
const BRAND: Record<
  LoaderApp,
  { tagline: string; points: string[]; from: string; to: string; glowA: string; glowB: string }
> = {
  fret: {
    tagline: 'Le logiciel des transporteurs affrétés',
    points: [
      'La marge de chaque transport, avant de l’accepter',
      'Vos donneurs d’ordre suivent en direct',
      'La facture part le jour de la livraison',
    ],
    from: '#22C55E',
    to: '#157A46',
    glowA: 'rgba(34,197,94,0.35)',
    glowB: 'rgba(212,164,67,0.28)',
  },
  flow: {
    tagline: 'Traction, distribution et messagerie',
    points: [
      'Le coût de revient réel de chaque ligne',
      'Tournées, conducteurs et véhicules au même endroit',
      'Les clients qui font baisser la marge, repérés',
    ],
    from: '#18A8A8',
    to: '#0E7C7C',
    glowA: 'rgba(24,168,168,0.38)',
    glowB: 'rgba(216,120,24,0.30)',
  },
  xpress: {
    tagline: 'Le logiciel des sociétés de livraison de colis',
    points: [
      'Les tournées suivies en direct',
      'L’application livreur incluse',
      'Facturation et paie intégrées',
    ],
    from: '#F07800',
    to: '#D83A30',
    glowA: 'rgba(240,120,0,0.38)',
    glowB: 'rgba(26,95,160,0.40)',
  },
};

const appKey = (name: string): LoaderApp =>
  /flow/i.test(name) ? 'flow' : /xpress/i.test(name) ? 'xpress' : 'fret';

export function LoginForm({
  appName,
  onSubmit,
  canSubmit = true,
  footer,
}: {
  /** Conservé pour compatibilité : le logo est maintenant dessiné (animé) par l'écran. */
  logo?: string;
  appName: string;
  /** Renvoie un message d'erreur, ou null si la connexion a réussi. */
  onSubmit: (login: string, password: string) => Promise<string | null>;
  canSubmit?: boolean;
  footer?: ReactNode;
}) {
  const app = appKey(appName);
  const b = BRAND[app];
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      setError('Saisissez votre email (ou identifiant) et votre mot de passe.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setError(await onSubmit(login.trim(), password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };

  const gradient = `linear-gradient(135deg, ${b.from}, ${b.to})`;

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panneau de marque (ordinateur) */}
      <aside
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col"
        style={{ background: '#0B1028' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: b.glowA }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-24 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{ background: b.glowB }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="dark rounded-2xl bg-white/5 p-1.5 ring-1 ring-white/10">
            <LogoMarkAnimated app={app} size={44} />
          </div>
          <span className="text-xl font-bold tracking-tight">{appName}</span>
        </div>

        <div className="relative my-auto max-w-lg py-12">
          <div className="dark mb-8 w-fit">
            <LogoMarkAnimated app={app} size={132} />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em]" style={{ color: b.from }}>
            {b.tagline}
          </p>
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Organisation et rentabilité,{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradient }}>
              au même endroit.
            </span>
          </h2>
          <ul className="mt-8 space-y-3">
            {b.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px] text-white/85">
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: b.from }} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative pl-[104px] text-xs text-white/50">
          Un logiciel OptiGroup ·{' '}
          <a href="https://opti-group.fr" target="_blank" rel="noreferrer" className="underline hover:text-white">
            opti-group.fr
          </a>
        </p>
      </aside>

      {/* Formulaire */}
      <main className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        {/* Messages d'OptiCentral (mise à jour, maintenance…), visibles dès la connexion. */}
        <div className="absolute inset-x-0 top-0">
          <CentralBanner licenseId={null} />
        </div>
        {/* Support et logo OptiGroup, au même endroit qu'une fois connecté (bas gauche). */}
        <SupportButton licenseId={null} app={appName.toLowerCase()} floating />

        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
            <LogoMarkAnimated app={app} size={88} />
            <div>
              <p className="text-2xl font-bold tracking-tight">{appName}</p>
              <p className="text-sm text-muted-foreground">{b.tagline}</p>
            </div>
          </div>

          <div className="mb-6 hidden lg:block">
            <h1 className="text-2xl font-bold tracking-tight">Connexion</h1>
            <p className="mt-1 text-sm text-muted-foreground">Accédez à votre espace {appName}.</p>
          </div>
          <h1 className="sr-only lg:hidden">Connexion à {appName}</h1>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="login">Email ou identifiant</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login"
                  type="text"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="username"
                  placeholder="prenom.nom@societe.fr"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  disabled={busy}
                  className="h-11 pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                  disabled={busy}
                  className="h-11 pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {caps && <p className="text-xs text-amber-600 dark:text-amber-400">Majuscules activées.</p>}
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-11 w-full border-0 text-[15px] font-semibold text-white shadow-md transition-[filter] hover:brightness-110"
              style={{ backgroundImage: gradient }}
              disabled={busy || !canSubmit}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Se connecter
            </Button>
          </form>

          <div className="mt-6 rounded-xl border bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Identifiant</span> : la partie de votre email
              avant le @.
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">Pas encore de mot de passe, ou oublié ?</span>{' '}
              Demandez-en un à votre direction ou à vos RH.
            </p>
          </div>
          {footer && <div className="mt-4">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
