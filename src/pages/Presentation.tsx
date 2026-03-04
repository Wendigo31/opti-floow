import { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Printer, TrendingUp, Calculator, Route, Users, Truck, BarChart3, Shield, Clock, Target, Zap, CheckCircle2, ArrowRight, Star, Phone, Mail, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import heroImg from '@/assets/presentation/hero-trucks.jpg';
import dashboardImg from '@/assets/presentation/dashboard-mockup.jpg';
import profitImg from '@/assets/presentation/profit-growth.jpg';
import routeImg from '@/assets/presentation/route-optimization.jpg';

const SLIDES = [
  // SLIDE 1 — Couverture
  {
    id: 'cover',
    render: () => (
      <div className="relative w-full h-full overflow-hidden bg-[hsl(210,45%,8%)]">
        <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(210,45%,8%)] via-[hsl(210,45%,8%)]/60 to-transparent" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-16">
          <img src={optiflowLogo} alt="OptiFlow" className="w-40 h-40 mb-8" />
          <h1 className="text-7xl font-extrabold text-white leading-tight mb-6">
            Arrêtez de perdre de l'argent<br />
            <span className="text-[hsl(175,85%,50%)]">sur chaque kilomètre.</span>
          </h1>
          <p className="text-2xl text-white/80 max-w-3xl mb-10">
            La suite logicielle qui transforme votre exploitation transport en machine à rentabilité.
          </p>
          <div className="flex items-center gap-3 text-lg text-[hsl(24,95%,53%)] font-semibold">
            <span>OptiFlow</span>
            <span className="text-white/40">•</span>
            <span>OptiXpress</span>
            <span className="text-white/40">•</span>
            <span>OptiFret</span>
          </div>
          <p className="mt-6 text-white/50 text-sm">Par OptiGroup — Édition 2026</p>
        </div>
      </div>
    ),
  },

  // SLIDE 2 — Le problème
  {
    id: 'problem',
    render: () => (
      <div className="w-full h-full bg-white flex">
        <div className="flex-1 flex flex-col justify-center px-20">
          <p className="text-[hsl(24,95%,53%)] font-bold text-lg mb-4 uppercase tracking-widest">Le constat</p>
          <h2 className="text-5xl font-extrabold text-[hsl(210,45%,15%)] leading-tight mb-8">
            87% des transporteurs<br />ne connaissent pas leur<br />
            <span className="text-[hsl(0,72%,50%)]">coût réel au kilomètre.</span>
          </h2>
          <div className="space-y-5">
            {[
              'Des prix de vente fixés "au feeling" sans données fiables',
              'Des marges qui s\'érodent sans que vous le sachiez',
              'Des heures perdues en calculs manuels sur Excel',
              'Aucune visibilité sur la rentabilité par tournée',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[hsl(0,72%,95%)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[hsl(0,72%,50%)] font-bold text-sm">{i + 1}</span>
                </div>
                <p className="text-xl text-[hsl(210,20%,35%)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[45%] bg-[hsl(0,72%,97%)] flex items-center justify-center p-16">
          <div className="text-center">
            <p className="text-[140px] font-black text-[hsl(0,72%,50%)] leading-none">-15%</p>
            <p className="text-2xl text-[hsl(210,20%,35%)] mt-4">de marge perdue<br />en moyenne par an</p>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 3 — La solution
  {
    id: 'solution',
    render: () => (
      <div className="w-full h-full bg-[hsl(210,45%,8%)] flex flex-col items-center justify-center px-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(175,85%,35%)] flex items-center justify-center mb-8">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-6xl font-extrabold text-white mb-6">
          Et si chaque décision était<br />
          <span className="text-[hsl(175,85%,50%)]">guidée par vos vrais chiffres ?</span>
        </h2>
        <p className="text-2xl text-white/70 max-w-3xl mb-16">
          OptiGroup développe les outils qui donnent aux transporteurs le pouvoir de piloter leur activité avec précision, clarté et confiance.
        </p>
        <div className="grid grid-cols-3 gap-8 w-full max-w-5xl">
          {[
            { icon: Calculator, name: 'OptiFlow', desc: 'Calculateur de rentabilité & pilotage financier' },
            { icon: Route, name: 'OptiXpress', desc: 'Optimisation d\'itinéraires & planification' },
            { icon: Truck, name: 'OptiFret', desc: 'Gestion de flotte & suivi d\'exploitation' },
          ].map((product, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
              <product.icon className="w-10 h-10 text-[hsl(24,95%,53%)] mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-white/60">{product.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // SLIDE 4 — Fonctionnalité phare : Calculateur
  {
    id: 'calculator',
    render: () => (
      <div className="w-full h-full bg-white flex">
        <div className="flex-1 flex flex-col justify-center px-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[hsl(175,85%,92%)] flex items-center justify-center">
              <Calculator className="w-6 h-6 text-[hsl(175,85%,35%)]" />
            </div>
            <p className="text-[hsl(175,85%,35%)] font-bold text-lg uppercase tracking-widest">OptiFlow</p>
          </div>
          <h2 className="text-5xl font-extrabold text-[hsl(210,45%,15%)] leading-tight mb-6">
            Connaissez votre<br />
            <span className="text-[hsl(175,85%,35%)]">prix de revient réel</span><br />
            en 30 secondes.
          </h2>
          <p className="text-xl text-[hsl(210,20%,45%)] mb-8 max-w-xl">
            Intégrez salaires, charges sociales, carburant, péages, AdBlue, amortissements et charges fixes. Obtenez instantanément votre coût au km et votre prix de vente minimum.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              'Calcul multi-conducteurs',
              'Péages automatiques',
              'Charges fixes & variables',
              'Export PDF professionnel',
              'Historique des calculs',
              'Alertes de marge',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[hsl(158,70%,40%)]" />
                <span className="text-[hsl(210,20%,30%)]">{feat}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[50%] relative">
          <img src={dashboardImg} alt="Dashboard" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/20" />
        </div>
      </div>
    ),
  },

  // SLIDE 5 — Itinéraires & Planning
  {
    id: 'itinerary',
    render: () => (
      <div className="w-full h-full relative">
        <img src={routeImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[hsl(210,45%,8%)]/70" />
        <div className="relative z-10 flex flex-col justify-center h-full px-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[hsl(24,95%,53%)] flex items-center justify-center">
                <Route className="w-6 h-6 text-white" />
              </div>
              <p className="text-[hsl(24,95%,53%)] font-bold text-lg uppercase tracking-widest">Itinéraires intelligents</p>
            </div>
            <h2 className="text-5xl font-extrabold text-white leading-tight mb-6">
              Optimisez chaque<br />trajet, maximisez<br />
              <span className="text-[hsl(175,85%,50%)]">chaque euro.</span>
            </h2>
            <p className="text-xl text-white/70 mb-10">
              Calcul d'itinéraires poids lourds avec restrictions, péages détaillés par classe, comparaison autoroute vs nationale, et estimation précise des coûts.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Target, label: 'Restrictions PL intégrées' },
                { icon: Clock, label: 'Temps de conduite estimé' },
                { icon: TrendingUp, label: 'Coût péages par classe' },
                { icon: BarChart3, label: 'Comparaison itinéraires' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-3">
                  <item.icon className="w-5 h-5 text-[hsl(175,85%,50%)]" />
                  <span className="text-white font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 6 — Gestion de flotte
  {
    id: 'fleet',
    render: () => (
      <div className="w-full h-full bg-[hsl(180,15%,98%)] flex">
        <div className="flex-1 flex flex-col justify-center px-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[hsl(175,85%,92%)] flex items-center justify-center">
              <Truck className="w-6 h-6 text-[hsl(175,85%,35%)]" />
            </div>
            <p className="text-[hsl(175,85%,35%)] font-bold text-lg uppercase tracking-widest">Gestion de flotte</p>
          </div>
          <h2 className="text-5xl font-extrabold text-[hsl(210,45%,15%)] leading-tight mb-8">
            Vos véhicules, conducteurs<br />et clients dans<br />
            <span className="text-[hsl(175,85%,35%)]">un seul outil.</span>
          </h2>
          <div className="space-y-5">
            {[
              { icon: Users, title: 'Conducteurs', desc: 'Fiches complètes avec salaires, primes, contrats CDI/CDD/intérim' },
              { icon: Truck, title: 'Véhicules & remorques', desc: 'Consommation, amortissement, coûts d\'entretien par véhicule' },
              { icon: BarChart3, title: 'Planning', desc: 'Planification hebdomadaire par conducteur, import Excel massif' },
              { icon: Star, title: 'Clients', desc: 'Analyse de rentabilité par client, détection des clients toxiques' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm border border-[hsl(180,15%,90%)]">
                <div className="w-10 h-10 rounded-lg bg-[hsl(175,85%,92%)] flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-[hsl(175,85%,35%)]" />
                </div>
                <div>
                  <h4 className="font-bold text-[hsl(210,45%,15%)] text-lg">{item.title}</h4>
                  <p className="text-[hsl(210,20%,45%)]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[40%] flex items-center justify-center">
          <img src={profitImg} alt="" className="w-full h-full object-cover rounded-l-3xl" />
        </div>
      </div>
    ),
  },

  // SLIDE 7 — Chiffres clés
  {
    id: 'stats',
    render: () => (
      <div className="w-full h-full bg-[hsl(210,45%,8%)] flex flex-col items-center justify-center px-20">
        <h2 className="text-5xl font-extrabold text-white mb-4 text-center">
          Des résultats <span className="text-[hsl(175,85%,50%)]">concrets.</span>
        </h2>
        <p className="text-xl text-white/60 mb-16 text-center">Ce que nos utilisateurs constatent en moyenne après 3 mois.</p>
        <div className="grid grid-cols-4 gap-8 w-full max-w-6xl">
          {[
            { value: '+12%', label: 'de marge récupérée', color: 'hsl(158,70%,40%)' },
            { value: '2h', label: 'gagnées par jour\nen administration', color: 'hsl(175,85%,50%)' },
            { value: '100%', label: 'de visibilité\nsur vos coûts', color: 'hsl(24,95%,53%)' },
            { value: '30s', label: 'pour calculer\nun prix de revient', color: 'hsl(175,85%,50%)' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-7xl font-black leading-none mb-4" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-lg text-white/70 whitespace-pre-line">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 bg-white/5 border border-white/10 rounded-2xl px-10 py-6 max-w-3xl text-center">
          <p className="text-xl text-white/80 italic">
            « Depuis qu'on utilise OptiFlow, on a découvert qu'on vendait 3 lignes à perte. 
            On a ajusté nos prix et récupéré 18 000 € de marge en 4 mois. »
          </p>
          <p className="text-[hsl(175,85%,50%)] mt-3 font-semibold">— Directeur, Transport régional 44 véhicules</p>
        </div>
      </div>
    ),
  },

  // SLIDE 8 — Sécurité & Multi-utilisateurs
  {
    id: 'security',
    render: () => (
      <div className="w-full h-full bg-white flex flex-col items-center justify-center px-20">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(210,45%,12%)] flex items-center justify-center mb-8">
          <Shield className="w-8 h-8 text-[hsl(175,85%,50%)]" />
        </div>
        <h2 className="text-5xl font-extrabold text-[hsl(210,45%,15%)] mb-4 text-center">
          Sécurisé, collaboratif,<br />
          <span className="text-[hsl(175,85%,35%)]">conçu pour les équipes.</span>
        </h2>
        <p className="text-xl text-[hsl(210,20%,45%)] mb-14 text-center max-w-2xl">
          Chaque utilisateur accède uniquement aux données qui le concernent. La direction garde une vision complète.
        </p>
        <div className="grid grid-cols-3 gap-8 w-full max-w-5xl">
          {[
            { role: 'Direction', desc: 'Accès total : marges, salaires, coûts de structure, tableau de bord financier complet', color: 'hsl(24,95%,53%)' },
            { role: 'Exploitation', desc: 'Gestion opérationnelle complète, données financières sensibles masquées', color: 'hsl(175,85%,35%)' },
            { role: 'Membre', desc: 'Accès restreint aux fonctions opérationnelles du quotidien', color: 'hsl(210,45%,50%)' },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border-2 p-8 text-center" style={{ borderColor: item.color }}>
              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: item.color + '15' }}>
                <Users className="w-6 h-6" style={{ color: item.color }} />
              </div>
              <h3 className="text-2xl font-bold text-[hsl(210,45%,15%)] mb-3">{item.role}</h3>
              <p className="text-[hsl(210,20%,45%)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // SLIDE 9 — Tarification
  {
    id: 'pricing',
    render: () => (
      <div className="w-full h-full bg-[hsl(180,15%,98%)] flex flex-col items-center justify-center px-20">
        <h2 className="text-5xl font-extrabold text-[hsl(210,45%,15%)] mb-4 text-center">
          Un investissement<br />
          <span className="text-[hsl(175,85%,35%)]">qui se rentabilise dès le 1er mois.</span>
        </h2>
        <p className="text-xl text-[hsl(210,20%,45%)] mb-14 text-center">Tarifs sur devis personnalisé selon la taille de votre flotte.</p>
        <div className="grid grid-cols-3 gap-8 w-full max-w-5xl">
          {[
            { plan: 'Start', desc: 'Idéal pour les TPE', features: ['Calculateur de rentabilité', 'Jusqu\'à 5 conducteurs', 'Export PDF', 'Support email'], highlight: false },
            { plan: 'Pro', desc: 'Pour les PME ambitieuses', features: ['Tout Start +', 'Itinéraires optimisés', 'Multi-utilisateurs', 'Dashboard analytics', 'Import Excel', 'Alertes de marge'], highlight: true },
            { plan: 'Enterprise', desc: 'Pour les grandes flottes', features: ['Tout Pro +', 'Utilisateurs illimités', 'IA & prédictions', 'API & intégration TMS', 'Support prioritaire'], highlight: false },
          ].map((item, i) => (
            <div key={i} className={`rounded-2xl p-8 text-center ${item.highlight ? 'bg-[hsl(210,45%,8%)] text-white ring-4 ring-[hsl(175,85%,35%)] scale-105' : 'bg-white border border-[hsl(180,15%,88%)]'}`}>
              {item.highlight && <p className="text-[hsl(24,95%,53%)] text-sm font-bold uppercase tracking-widest mb-2">Le plus populaire</p>}
              <h3 className={`text-3xl font-bold mb-2 ${item.highlight ? 'text-white' : 'text-[hsl(210,45%,15%)]'}`}>{item.plan}</h3>
              <p className={`mb-6 ${item.highlight ? 'text-white/60' : 'text-[hsl(210,20%,45%)]'}`}>{item.desc}</p>
              <div className="space-y-3 text-left">
                {item.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.highlight ? 'text-[hsl(175,85%,50%)]' : 'text-[hsl(158,70%,40%)]'}`} />
                    <span className={`text-sm ${item.highlight ? 'text-white/80' : 'text-[hsl(210,20%,35%)]'}`}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // SLIDE 10 — CTA final
  {
    id: 'cta',
    render: () => (
      <div className="w-full h-full bg-[hsl(210,45%,8%)] flex flex-col items-center justify-center px-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 rounded-full bg-[hsl(175,85%,50%)] blur-[120px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-[hsl(24,95%,53%)] blur-[120px]" />
        </div>
        <div className="relative z-10">
          <img src={optiflowLogo} alt="OptiFlow" className="w-24 h-24 mx-auto mb-8" />
          <h2 className="text-6xl font-extrabold text-white mb-6">
            Prêt à reprendre le contrôle<br />
            <span className="text-[hsl(175,85%,50%)]">de votre rentabilité ?</span>
          </h2>
          <p className="text-2xl text-white/70 max-w-2xl mx-auto mb-12">
            Demandez votre démonstration gratuite et découvrez combien vous pourriez économiser.
          </p>
          <div className="flex items-center justify-center gap-6 mb-16">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-6 py-4">
              <Mail className="w-5 h-5 text-[hsl(175,85%,50%)]" />
              <span className="text-white font-medium">contact@opti-group.fr</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-6 py-4">
              <Globe className="w-5 h-5 text-[hsl(175,85%,50%)]" />
              <span className="text-white font-medium">optiflow.fr</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
            <span>OptiFlow</span><span>•</span><span>OptiXpress</span><span>•</span><span>OptiFret</span>
            <span className="ml-4">© 2026 OptiGroup — Tous droits réservés</span>
          </div>
        </div>
      </div>
    ),
  },
];

export default function Presentation() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(SLIDES.length - 1, c + 1));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[hsl(210,45%,6%)] flex flex-col items-center">
      {/* Controls — hidden on print */}
      <div className="print:hidden w-full max-w-[1200px] flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={prev} disabled={current === 0} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-white/70 text-sm font-medium min-w-[80px] text-center">
            {current + 1} / {SLIDES.length}
          </span>
          <Button variant="outline" size="icon" onClick={next} disabled={current === SLIDES.length - 1} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePrint} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            <Printer className="w-4 h-4 mr-2" />
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* Slide viewer — single slide on screen */}
      <div className="print:hidden w-full flex items-center justify-center flex-1 px-6 pb-6">
        <div className="w-full max-w-[1200px] aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10">
          {SLIDES[current].render()}
        </div>
      </div>

      {/* Print view — all slides, one per page */}
      <div className="hidden print:block">
        {SLIDES.map((slide, i) => (
          <div key={slide.id} className="w-[297mm] h-[210mm] overflow-hidden" style={{ pageBreakAfter: i < SLIDES.length - 1 ? 'always' : 'auto' }}>
            <div className="w-full h-full">
              {slide.render()}
            </div>
          </div>
        ))}
      </div>

      {/* Thumbnail strip — hidden on print */}
      <div className="print:hidden w-full max-w-[1200px] px-6 pb-6">
        <div className="flex gap-2 overflow-x-auto py-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-28 aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-[hsl(175,85%,50%)] ring-2 ring-[hsl(175,85%,50%)]/30' : 'border-white/10 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="w-full h-full transform scale-[0.1] origin-top-left" style={{ width: '1000%', height: '1000%' }}>
                {slide.render()}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
