import { ExternalLink, FileText, Scale, ShieldCheck } from 'lucide-react';

/**
 * Documents juridiques — identiques dans OptiFret, OptiFlow et OptiXpress. Les textes complets
 * sont publiés une seule fois sur opti-group.fr (CGV, CGU, confidentialité, mentions légales) ;
 * le logiciel en rappelle l'essentiel et y renvoie. Fichier partagé (bridge/shared/legal).
 */
const SITE = 'https://opti-group.fr';

const DOCS = [
  { href: `${SITE}/cgu`, title: "Conditions générales d'utilisation", hint: 'Compte, bon usage, applis conducteur, support', icon: FileText },
  { href: `${SITE}/cgv`, title: 'Conditions générales de vente', hint: 'Abonnement, prélèvement mensuel, résiliation, données', icon: Scale },
  { href: `${SITE}/confidentialite`, title: 'Politique de confidentialité', hint: 'Données personnelles et vos droits', icon: ShieldCheck },
  { href: `${SITE}/mentions-legales`, title: 'Mentions légales', hint: 'Éditeur et hébergement', icon: FileText },
];

const POINTS = [
  "L'abonnement est réglé chaque mois par prélèvement SEPA (mandat signé à la souscription) ; les options demandées depuis le logiciel s'ajoutent au prélèvement suivant.",
  'Chaque compte est personnel ; ses droits dépendent du rôle donné par la Direction ou les RH.',
  'Vos données vous appartiennent : OptiGroup les traite pour votre compte (sous-traitant RGPD) et vous les restitue en fin de contrat.',
  "La position des conducteurs et livreurs n'est transmise que pendant le service ; l'entreprise les en informe au préalable.",
  'Pour corriger un problème signalé, le support peut ouvrir une session avec votre compte : accès tracé, fermé au bout de 2 h maximum.',
  'Les factures sont produites au format Factur-X ; leur envoi par une plateforme agréée reste à la charge de votre entreprise.',
];

export function LegalSummary() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {DOCS.map((d) => (
          <a
            key={d.href}
            href={d.href}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent/40"
          >
            <d.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                {d.title}
                <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
              </span>
              <span className="block text-xs text-muted-foreground">{d.hint}</span>
            </span>
          </a>
        ))}
      </div>
      <div className="rounded-xl border bg-muted/40 p-4">
        <p className="mb-2 text-sm font-semibold">L'essentiel</p>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Seuls les textes publiés sur opti-group.fr font foi. Une question : support@opti-group.fr.
        </p>
      </div>
    </div>
  );
}

/** Ancienne page de document juridique : renvoie vers le texte officiel du site. */
export function LegalRedirect({ to }: { to: 'cgu' | 'cgv' | 'confidentialite' | 'mentions-legales' }) {
  if (typeof window !== 'undefined') window.location.replace(`${SITE}/${to}`);
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
      <a href={`${SITE}/${to}`} className="text-primary underline">
        Ouvrir le document sur opti-group.fr
      </a>
    </div>
  );
}
