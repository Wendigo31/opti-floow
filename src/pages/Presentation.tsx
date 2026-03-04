import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Printer, Calculator, Route, Users, Truck, BarChart3, Shield, Clock, Target, Zap, CheckCircle2, Star, Mail, Globe, TrendingUp, MapPin, FileText, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import heroImg from '@/assets/presentation/hero-stylized.jpg';
import profitImg from '@/assets/presentation/profit-growth.jpg';
import routeImg from '@/assets/presentation/route-optimization.jpg';
import screenshotCalc from '@/assets/presentation/screenshot-calculator.jpg';
import screenshotPlanning from '@/assets/presentation/screenshot-planning.jpg';

// Fixed slide resolution
const SLIDE_W = 1920;
const SLIDE_H = 1080;

function SlideBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, position: 'relative', overflow: 'hidden' }} className="flex-shrink-0">
      {children}
    </div>
  );
}

const SLIDES = [
  // SLIDE 1 — Couverture (light)
  {
    id: 'cover',
    render: () => (
      <SlideBox>
        <div className="absolute inset-0 bg-white" />
        <img src={heroImg} alt="" className="absolute right-0 top-0 w-[55%] h-full object-cover opacity-90" />
        <div className="absolute right-0 top-0 w-[55%] h-full bg-gradient-to-r from-white via-white/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center h-full px-24">
          <div className="max-w-[850px]">
            <img src={optiflowLogo} alt="OptiFlow" className="w-32 h-32 mb-8" />
            <h1 className="text-[74px] font-extrabold text-[hsl(210,45%,15%)] leading-[0.95] mb-8">
              Arrêtez de perdre<br />de l'argent
              <br /><span className="text-[hsl(175,85%,35%)]">sur chaque kilomètre.</span>
            </h1>
            <p className="text-[24px] text-[hsl(210,20%,40%)] max-w-[650px] mb-10">
              La suite logicielle qui transforme votre exploitation transport en machine à rentabilité.
            </p>
            <div className="flex items-center gap-4 text-[20px] text-[hsl(24,95%,53%)] font-semibold">
              <span>OptiFlow</span>
              <span className="text-[hsl(210,20%,75%)]">•</span>
              <span>OptiXpress</span>
              <span className="text-[hsl(210,20%,75%)]">•</span>
              <span>OptiFret</span>
            </div>
            <p className="mt-6 text-[hsl(210,20%,65%)] text-[15px]">Par OptiGroup — Édition 2026</p>
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 2 — Le problème (already light)
  {
    id: 'problem',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="flex-1 flex flex-col justify-center px-24 py-16">
            <p className="text-[hsl(24,95%,53%)] font-bold text-[18px] mb-6 uppercase tracking-[0.2em]">Le constat</p>
            <h2 className="text-[58px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-10">
              87% des transporteurs<br />ne connaissent pas leur<br />
              <span className="text-[hsl(0,72%,50%)]">coût réel au kilomètre.</span>
            </h2>
            <div className="space-y-6">
              {[
                'Des prix de vente fixés "au feeling" sans données fiables',
                'Des marges qui s\'érodent sans que vous le sachiez',
                'Des heures perdues en calculs manuels sur Excel',
                'Aucune visibilité sur la rentabilité par tournée',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-full bg-[hsl(0,72%,95%)] flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-[hsl(0,72%,50%)] font-bold text-[16px]">{i + 1}</span>
                  </div>
                  <p className="text-[24px] text-[hsl(210,20%,35%)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[42%] bg-[hsl(0,72%,97%)] flex items-center justify-center p-20">
            <div className="text-center">
              <p className="text-[180px] font-black text-[hsl(0,72%,50%)] leading-none">-15%</p>
              <p className="text-[26px] text-[hsl(210,20%,35%)] mt-6">de marge perdue<br />en moyenne par an</p>
            </div>
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 3 — La solution OptiGroup (light)
  {
    id: 'solution',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-[hsl(180,15%,98%)] flex flex-col items-center justify-center px-24">
          <div className="w-20 h-20 rounded-2xl bg-[hsl(175,85%,35%)] flex items-center justify-center mb-10">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-[62px] font-extrabold text-[hsl(210,45%,15%)] mb-8 text-center leading-[1.1]">
            Et si chaque décision était<br />
            <span className="text-[hsl(175,85%,35%)]">guidée par vos vrais chiffres ?</span>
          </h2>
          <p className="text-[26px] text-[hsl(210,20%,45%)] max-w-[900px] text-center mb-20">
            OptiGroup développe les outils qui donnent aux transporteurs le pouvoir de piloter leur activité avec précision.
          </p>
          <div className="grid grid-cols-3 gap-10 w-full max-w-[1400px]">
            {[
              { icon: Calculator, name: 'OptiFlow', desc: 'Calculateur de rentabilité & pilotage financier complet' },
              { icon: Route, name: 'OptiXpress', desc: 'Optimisation d\'itinéraires PL & planification intelligente' },
              { icon: Truck, name: 'OptiFret', desc: 'Gestion de flotte, conducteurs & suivi d\'exploitation' },
            ].map((product, i) => (
              <div key={i} className="bg-white border border-[hsl(180,15%,88%)] rounded-3xl p-10 text-center shadow-sm">
                <product.icon className="w-12 h-12 text-[hsl(24,95%,53%)] mx-auto mb-5" />
                <h3 className="text-[28px] font-bold text-[hsl(210,45%,15%)] mb-3">{product.name}</h3>
                <p className="text-[18px] text-[hsl(210,20%,45%)]">{product.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 4 — Calculateur avec screenshot (already light)
  {
    id: 'calculator',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="w-[48%] flex flex-col justify-center px-24 py-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[hsl(175,85%,92%)] flex items-center justify-center">
                <Calculator className="w-7 h-7 text-[hsl(175,85%,35%)]" />
              </div>
              <p className="text-[hsl(175,85%,35%)] font-bold text-[18px] uppercase tracking-[0.15em]">OptiFlow</p>
            </div>
            <h2 className="text-[52px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-8">
              Votre prix de<br />revient réel en<br />
              <span className="text-[hsl(175,85%,35%)]">30 secondes.</span>
            </h2>
            <p className="text-[22px] text-[hsl(210,20%,45%)] mb-10">
              Salaires, charges, carburant, péages, AdBlue, amortissements… Tout est intégré.
            </p>
            <div className="grid grid-cols-2 gap-5">
              {[
                'Calcul multi-conducteurs',
                'Péages automatiques',
                'Charges fixes & variables',
                'Export PDF pro',
                'Historique des calculs',
                'Alertes de marge',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-[hsl(158,70%,40%)] flex-shrink-0" />
                  <span className="text-[18px] text-[hsl(210,20%,30%)]">{feat}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[52%] relative flex items-center justify-center bg-[hsl(180,10%,96%)] p-10">
            <img src={screenshotCalc} alt="Calculateur OptiFlow" className="w-full rounded-xl shadow-2xl border border-[hsl(180,15%,88%)]" />
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 5 — Itinéraires (light)
  {
    id: 'itinerary',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="flex-1 flex flex-col justify-center px-24 py-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[hsl(24,95%,92%)] flex items-center justify-center">
                <Route className="w-7 h-7 text-[hsl(24,95%,53%)]" />
              </div>
              <p className="text-[hsl(24,95%,53%)] font-bold text-[18px] uppercase tracking-[0.15em]">Itinéraires intelligents</p>
            </div>
            <h2 className="text-[56px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-8">
              Optimisez chaque<br />trajet, maximisez<br />
              <span className="text-[hsl(175,85%,35%)]">chaque euro.</span>
            </h2>
            <p className="text-[24px] text-[hsl(210,20%,45%)] mb-12">
              Itinéraires poids lourds avec restrictions, péages détaillés, comparaison autoroute vs nationale.
            </p>
            <div className="grid grid-cols-2 gap-5">
              {[
                { icon: Target, label: 'Restrictions PL intégrées' },
                { icon: Clock, label: 'Temps de conduite estimé' },
                { icon: TrendingUp, label: 'Coût péages par classe' },
                { icon: MapPin, label: 'Adresses favorites & clients' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-[hsl(180,15%,97%)] border border-[hsl(180,15%,90%)] rounded-xl px-6 py-4">
                  <item.icon className="w-6 h-6 text-[hsl(175,85%,35%)]" />
                  <span className="text-[20px] text-[hsl(210,45%,20%)] font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[45%] relative">
            <img src={routeImg} alt="" className="absolute inset-0 w-full h-full object-cover rounded-l-3xl" />
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 6 — Planning avec screenshot (light)
  {
    id: 'planning',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-[hsl(180,15%,98%)] flex">
          <div className="w-[52%] flex items-center justify-center p-10">
            <img src={screenshotPlanning} alt="Planning hebdomadaire" className="w-full rounded-xl shadow-2xl border border-[hsl(180,15%,88%)]" />
          </div>
          <div className="w-[48%] flex flex-col justify-center px-20 py-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[hsl(175,85%,92%)] flex items-center justify-center">
                <CalendarDays className="w-7 h-7 text-[hsl(175,85%,35%)]" />
              </div>
              <p className="text-[hsl(175,85%,35%)] font-bold text-[18px] uppercase tracking-[0.15em]">Planning</p>
            </div>
            <h2 className="text-[50px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-8">
              Planifiez votre<br />exploitation en<br />
              <span className="text-[hsl(24,95%,53%)]">un clin d'œil.</span>
            </h2>
            <div className="space-y-5">
              {[
                { icon: Users, text: 'Vue hebdomadaire par conducteur' },
                { icon: FileText, text: 'Import Excel massif de vos plannings' },
                { icon: Truck, text: 'Affectation véhicules & remorques' },
                { icon: Star, text: 'Tournées récurrentes automatisées' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-white rounded-xl px-6 py-4 border border-[hsl(180,15%,90%)] shadow-sm">
                  <item.icon className="w-6 h-6 text-[hsl(175,85%,35%)] flex-shrink-0" />
                  <span className="text-[20px] text-[hsl(210,20%,30%)]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 7 — Gestion de flotte (already light)
  {
    id: 'fleet',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="flex-1 flex flex-col justify-center px-24 py-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[hsl(175,85%,92%)] flex items-center justify-center">
                <Truck className="w-7 h-7 text-[hsl(175,85%,35%)]" />
              </div>
              <p className="text-[hsl(175,85%,35%)] font-bold text-[18px] uppercase tracking-[0.15em]">Gestion complète</p>
            </div>
            <h2 className="text-[52px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-10">
              Vos conducteurs,<br />véhicules et clients<br />
              <span className="text-[hsl(175,85%,35%)]">dans un seul outil.</span>
            </h2>
            <div className="space-y-6">
              {[
                { icon: Users, title: 'Conducteurs', desc: 'Fiches complètes : salaires, primes, contrats CDI/CDD/intérim' },
                { icon: Truck, title: 'Véhicules & remorques', desc: 'Consommation, amortissement, coûts d\'entretien par véhicule' },
                { icon: BarChart3, title: 'Dashboard', desc: 'Tableau de bord financier avec KPIs en temps réel' },
                { icon: Star, title: 'Clients', desc: 'Analyse de rentabilité par client, détection des clients toxiques' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5 bg-[hsl(180,15%,98%)] rounded-xl p-6 border border-[hsl(180,15%,90%)]">
                  <div className="w-12 h-12 rounded-lg bg-[hsl(175,85%,92%)] flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-6 h-6 text-[hsl(175,85%,35%)]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[hsl(210,45%,15%)] text-[22px]">{item.title}</h4>
                    <p className="text-[18px] text-[hsl(210,20%,45%)]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[40%] relative">
            <img src={profitImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 8 — Chiffres clés (light)
  {
    id: 'stats',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex flex-col items-center justify-center px-24">
          <h2 className="text-[58px] font-extrabold text-[hsl(210,45%,15%)] mb-5 text-center">
            Des résultats <span className="text-[hsl(175,85%,35%)]">concrets.</span>
          </h2>
          <p className="text-[24px] text-[hsl(210,20%,45%)] mb-20 text-center">Ce que nos utilisateurs constatent en moyenne après 3 mois.</p>
          <div className="grid grid-cols-4 gap-10 w-full max-w-[1500px] mb-20">
            {[
              { value: '+12%', label: 'de marge\nrécupérée', color: 'hsl(158,70%,40%)' },
              { value: '2h', label: 'gagnées par jour\nen administration', color: 'hsl(175,85%,35%)' },
              { value: '100%', label: 'de visibilité\nsur vos coûts', color: 'hsl(24,95%,53%)' },
              { value: '30s', label: 'pour calculer\nun prix de revient', color: 'hsl(175,85%,35%)' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-[90px] font-black leading-none mb-5" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[20px] text-[hsl(210,20%,40%)] whitespace-pre-line">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-[hsl(180,15%,97%)] border border-[hsl(180,15%,90%)] rounded-3xl px-14 py-8 max-w-[1100px] text-center">
            <p className="text-[24px] text-[hsl(210,20%,30%)] italic leading-relaxed">
              « Depuis qu'on utilise OptiFlow, on a découvert qu'on vendait 3 lignes à perte. 
              On a ajusté nos prix et récupéré 18 000 € de marge en 4 mois. »
            </p>
            <p className="text-[hsl(175,85%,35%)] mt-4 font-semibold text-[20px]">— Directeur, Transport régional · 44 véhicules</p>
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 9 — Sécurité & Rôles (already light)
  {
    id: 'security',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex flex-col items-center justify-center px-24">
          <div className="w-20 h-20 rounded-2xl bg-[hsl(175,85%,35%)] flex items-center justify-center mb-10">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-[56px] font-extrabold text-[hsl(210,45%,15%)] mb-5 text-center leading-[1.1]">
            Sécurisé, collaboratif,<br />
            <span className="text-[hsl(175,85%,35%)]">conçu pour les équipes.</span>
          </h2>
          <p className="text-[24px] text-[hsl(210,20%,45%)] mb-16 text-center max-w-[800px]">
            Chaque utilisateur accède uniquement aux données qui le concernent.
          </p>
          <div className="grid grid-cols-3 gap-10 w-full max-w-[1400px]">
            {[
              { role: 'Direction', desc: 'Accès total : marges, salaires, coûts de structure, tableau de bord financier complet', color: 'hsl(24,95%,53%)' },
              { role: 'Exploitation', desc: 'Gestion opérationnelle complète, données financières sensibles masquées par défaut', color: 'hsl(175,85%,35%)' },
              { role: 'Membre', desc: 'Accès restreint aux fonctions opérationnelles du quotidien', color: 'hsl(210,45%,50%)' },
            ].map((item, i) => (
              <div key={i} className="rounded-3xl border-2 p-10 text-center" style={{ borderColor: item.color }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: item.color + '18' }}>
                  <Users className="w-8 h-8" style={{ color: item.color }} />
                </div>
                <h3 className="text-[28px] font-bold text-[hsl(210,45%,15%)] mb-4">{item.role}</h3>
                <p className="text-[18px] text-[hsl(210,20%,45%)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 10 — Tarification (light)
  {
    id: 'pricing',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-[hsl(180,15%,98%)] flex flex-col items-center justify-center px-24">
          <h2 className="text-[56px] font-extrabold text-[hsl(210,45%,15%)] mb-5 text-center leading-[1.1]">
            Un investissement qui se<br />
            <span className="text-[hsl(175,85%,35%)]">rentabilise dès le 1er mois.</span>
          </h2>
          <p className="text-[22px] text-[hsl(210,20%,45%)] mb-16 text-center">Tarifs sur devis personnalisé selon la taille de votre flotte.</p>
          <div className="grid grid-cols-3 gap-10 w-full max-w-[1400px]">
            {[
              { plan: 'Start', desc: 'Idéal pour les TPE', features: ['Calculateur de rentabilité', 'Jusqu\'à 5 conducteurs', 'Export PDF', 'Support email'], highlight: false },
              { plan: 'Pro', desc: 'Pour les PME ambitieuses', features: ['Tout Start +', 'Itinéraires optimisés', 'Multi-utilisateurs', 'Dashboard analytics', 'Import Excel', 'Alertes de marge'], highlight: true },
              { plan: 'Enterprise', desc: 'Pour les grandes flottes', features: ['Tout Pro +', 'Utilisateurs illimités', 'IA & prédictions', 'API & intégration TMS', 'Support prioritaire'], highlight: false },
            ].map((item, i) => (
              <div key={i} className={`rounded-3xl p-10 ${item.highlight ? 'bg-[hsl(175,85%,35%)] text-white ring-4 ring-[hsl(175,85%,28%)] scale-105' : 'bg-white border border-[hsl(180,15%,88%)]'}`}>
                {item.highlight && <p className="text-white/80 text-[14px] font-bold uppercase tracking-[0.2em] mb-3 text-center">Le plus populaire</p>}
                <h3 className={`text-[34px] font-bold mb-3 text-center ${item.highlight ? 'text-white' : 'text-[hsl(210,45%,15%)]'}`}>{item.plan}</h3>
                <p className={`mb-8 text-center text-[18px] ${item.highlight ? 'text-white/75' : 'text-[hsl(210,20%,45%)]'}`}>{item.desc}</p>
                <div className="space-y-4">
                  {item.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${item.highlight ? 'text-white' : 'text-[hsl(158,70%,40%)]'}`} />
                      <span className={`text-[18px] ${item.highlight ? 'text-white/90' : 'text-[hsl(210,20%,35%)]'}`}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 11 — CTA final (light)
  {
    id: 'cta',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex flex-col items-center justify-center px-24 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]">
            <div className="absolute top-32 left-32 w-[500px] h-[500px] rounded-full bg-[hsl(175,85%,50%)] blur-[150px]" />
            <div className="absolute bottom-32 right-32 w-[500px] h-[500px] rounded-full bg-[hsl(24,95%,53%)] blur-[150px]" />
          </div>
          <div className="relative z-10">
            <img src={optiflowLogo} alt="OptiFlow" className="w-32 h-32 mx-auto mb-10" />
            <h2 className="text-[66px] font-extrabold text-[hsl(210,45%,15%)] mb-8 leading-[1.05]">
              Prêt à reprendre le contrôle<br />
              <span className="text-[hsl(175,85%,35%)]">de votre rentabilité ?</span>
            </h2>
            <p className="text-[28px] text-[hsl(210,20%,40%)] max-w-[800px] mx-auto mb-14">
              Demandez votre démonstration gratuite et découvrez combien vous pourriez économiser.
            </p>
            <div className="flex items-center justify-center gap-8 mb-20">
              <div className="flex items-center gap-4 bg-[hsl(180,15%,97%)] rounded-2xl px-8 py-5 border border-[hsl(180,15%,90%)]">
                <Mail className="w-6 h-6 text-[hsl(175,85%,35%)]" />
                <span className="text-[22px] text-[hsl(210,45%,15%)] font-medium">support@opti-group.fr</span>
              </div>
              <div className="flex items-center gap-4 bg-[hsl(180,15%,97%)] rounded-2xl px-8 py-5 border border-[hsl(180,15%,90%)]">
                <Globe className="w-6 h-6 text-[hsl(175,85%,35%)]" />
                <span className="text-[22px] text-[hsl(210,45%,15%)] font-medium">opti-group.fr</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 text-[hsl(210,20%,70%)] text-[16px]">
              <span>OptiFlow</span><span>•</span><span>OptiXpress</span><span>•</span><span>OptiFret</span>
              <span className="ml-6">© 2026 OptiGroup — Tous droits réservés</span>
            </div>
          </div>
        </div>
      </SlideBox>
    ),
  },
];

// Scaled slide viewer component
function ScaledSlide({ slideIndex, containerRef }: { slideIndex: number; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [scale, setScale] = useState(0.5);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = clientWidth / SLIDE_W;
    const scaleY = clientHeight / SLIDE_H;
    setScale(Math.min(scaleX, scaleY));
  }, [containerRef]);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  return (
    <div
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        position: 'absolute',
        left: '50%',
        top: '50%',
        marginLeft: -SLIDE_W / 2,
        marginTop: -SLIDE_H / 2,
      }}
    >
      {SLIDES[slideIndex].render()}
    </div>
  );
}

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => setCurrent(c => Math.min(SLIDES.length - 1, c + 1));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen bg-[hsl(210,10%,92%)] flex flex-col overflow-hidden">
      {/* Controls */}
      <div className="print:hidden flex items-center justify-between px-6 py-3 flex-shrink-0 bg-white border-b border-[hsl(210,10%,88%)]">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={prev} disabled={current === 0} className="h-9 w-9">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-[hsl(210,20%,40%)] text-sm font-medium min-w-[80px] text-center">
            {current + 1} / {SLIDES.length}
          </span>
          <Button variant="outline" size="icon" onClick={next} disabled={current === SLIDES.length - 1} className="h-9 w-9">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="h-9 text-sm">
          <Printer className="w-4 h-4 mr-2" />
          Imprimer / PDF
        </Button>
      </div>

      {/* Slide canvas */}
      <div ref={containerRef} className="print:hidden flex-1 relative overflow-hidden">
        <ScaledSlide slideIndex={current} containerRef={containerRef} />
      </div>

      {/* Thumbnail strip */}
      <div className="print:hidden flex-shrink-0 px-4 py-3 bg-white border-t border-[hsl(210,10%,88%)]">
        <div className="flex gap-2 overflow-x-auto justify-center">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-24 h-[54px] rounded-md overflow-hidden border-2 transition-all ${
                i === current ? 'border-[hsl(175,85%,35%)] shadow-md' : 'border-[hsl(210,10%,85%)] opacity-60 hover:opacity-90'
              }`}
            >
              <div className="w-full h-full relative">
                <div style={{ transform: `scale(${24 / SLIDE_W})`, transformOrigin: 'top left', width: SLIDE_W, height: SLIDE_H }}>
                  {slide.render()}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Print: all slides one per page */}
      <div className="hidden print:block">
        {SLIDES.map((slide, i) => (
          <div key={slide.id} className="overflow-hidden" style={{ width: '297mm', height: '210mm', pageBreakAfter: i < SLIDES.length - 1 ? 'always' : 'auto' }}>
            <div style={{ transform: `scale(${(297 * 3.78) / SLIDE_W})`, transformOrigin: 'top left', width: SLIDE_W, height: SLIDE_H }}>
              {slide.render()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
