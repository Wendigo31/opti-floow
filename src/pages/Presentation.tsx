import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Printer, Calculator, Route, Users, Truck, BarChart3, Shield, Clock, Target, Zap, CheckCircle2, Star, Mail, Globe, TrendingUp, MapPin, FileText, CalendarDays, Gauge, PieChart, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import optiflowLogo from '@/assets/optiflow-logo.svg';
import mockupDashboard from '@/assets/presentation/mockup-dashboard.jpg';
import mockupCalculator from '@/assets/presentation/mockup-calculator.jpg';
import mockupPlanning from '@/assets/presentation/mockup-planning.jpg';
import mockupItinerary from '@/assets/presentation/mockup-itinerary.jpg';

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
  // SLIDE 1 — Couverture
  {
    id: 'cover',
    render: () => (
      <SlideBox>
        <div className="absolute inset-0 bg-white" />
        {/* Subtle background shapes */}
        <div className="absolute top-0 right-0 w-[60%] h-full">
          <div className="absolute top-20 right-20 w-[400px] h-[400px] rounded-full bg-[hsl(175,85%,95%)] blur-[80px]" />
          <div className="absolute bottom-20 right-40 w-[300px] h-[300px] rounded-full bg-[hsl(24,95%,95%)] blur-[80px]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center h-full px-24">
          <div className="max-w-[900px]">
            <img src={optiflowLogo} alt="OptiFlow" className="w-28 h-28 mb-8" />
            <h1 className="text-[72px] font-extrabold text-[hsl(210,45%,15%)] leading-[0.95] mb-8">
              Pilotez la rentabilité<br />de votre flotte<br />
              <span className="text-[hsl(175,85%,35%)]">poids lourds.</span>
            </h1>
            <p className="text-[26px] text-[hsl(210,20%,40%)] max-w-[700px] mb-12">
              Le calculateur de rentabilité conçu par et pour les transporteurs routiers. Calculez, planifiez, optimisez.
            </p>
            <div className="flex items-center gap-6">
              <div className="px-8 py-4 rounded-2xl text-white font-bold text-[20px]" style={{ background: 'linear-gradient(135deg, hsl(175,85%,35%) 0%, hsl(24,95%,53%) 100%)' }}>
                Demander une démo
              </div>
              <span className="text-[hsl(210,20%,65%)] text-[18px]">opti-group.fr</span>
            </div>
          </div>
        </div>
        {/* Dashboard preview */}
        <div className="absolute right-16 top-1/2 -translate-y-1/2 w-[750px]">
          <img src={mockupDashboard} alt="Dashboard OptiFlow" className="w-full rounded-2xl shadow-2xl border border-[hsl(210,10%,90%)]" />
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 2 — Le problème
  {
    id: 'problem',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="flex-1 flex flex-col justify-center px-24 py-16">
            <p className="text-[hsl(0,72%,50%)] font-bold text-[18px] mb-6 uppercase tracking-[0.2em]">Le constat</p>
            <h2 className="text-[56px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-10">
              87% des transporteurs<br />ne connaissent pas leur<br />
              <span className="text-[hsl(0,72%,50%)]">coût réel au kilomètre.</span>
            </h2>
            <div className="space-y-6">
              {[
                'Des prix fixés "au feeling" sans données fiables',
                'Des marges qui s\'érodent sans que vous le sachiez',
                'Des heures perdues en calculs manuels sur Excel',
                'Aucune visibilité sur la rentabilité par tournée',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-full bg-[hsl(0,72%,95%)] flex items-center justify-center flex-shrink-0 mt-1">
                    <AlertTriangle className="w-5 h-5 text-[hsl(0,72%,50%)]" />
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

  // SLIDE 3 — La solution OptiFlow
  {
    id: 'solution',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-[hsl(180,15%,98%)] flex flex-col items-center justify-center px-24">
          <img src={optiflowLogo} alt="OptiFlow" className="w-24 h-24 mb-8" />
          <h2 className="text-[62px] font-extrabold text-[hsl(210,45%,15%)] mb-6 text-center leading-[1.1]">
            OptiFlow — Votre copilote<br />
            <span className="text-[hsl(175,85%,35%)]">financier transport.</span>
          </h2>
          <p className="text-[26px] text-[hsl(210,20%,45%)] max-w-[900px] text-center mb-16">
            Une solution tout-en-un pour calculer vos coûts, piloter votre rentabilité et planifier votre exploitation.
          </p>
          <div className="grid grid-cols-4 gap-8 w-full max-w-[1500px]">
            {[
              { icon: Calculator, name: 'Calculateur', desc: 'Prix de revient en 30 secondes' },
              { icon: Route, name: 'Itinéraires', desc: 'Routes PL optimisées avec péages' },
              { icon: CalendarDays, name: 'Planning', desc: 'Gestion hebdomadaire des tournées' },
              { icon: BarChart3, name: 'Analyse', desc: 'Dashboard financier en temps réel' },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-[hsl(180,15%,88%)] rounded-2xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[hsl(175,85%,92%)] flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-8 h-8 text-[hsl(175,85%,35%)]" />
                </div>
                <h3 className="text-[24px] font-bold text-[hsl(210,45%,15%)] mb-2">{item.name}</h3>
                <p className="text-[18px] text-[hsl(210,20%,50%)]">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-8 w-full max-w-[1500px] mt-8">
            {[
              { icon: Truck, name: 'Flotte', desc: 'Véhicules, remorques & conducteurs' },
              { icon: Users, name: 'Clients', desc: 'Analyse de rentabilité par client' },
              { icon: FileText, name: 'Devis', desc: 'Devis professionnels automatisés' },
              { icon: TrendingUp, name: 'Prévisionnel', desc: 'Prédictions & alertes de marge' },
            ].map((item, i) => (
              <div key={i} className="bg-white border border-[hsl(180,15%,88%)] rounded-2xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[hsl(24,95%,92%)] flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-8 h-8 text-[hsl(24,95%,53%)]" />
                </div>
                <h3 className="text-[24px] font-bold text-[hsl(210,45%,15%)] mb-2">{item.name}</h3>
                <p className="text-[18px] text-[hsl(210,20%,50%)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 4 — Calculateur
  {
    id: 'calculator',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="w-[45%] flex flex-col justify-center px-24 py-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[hsl(175,85%,92%)] flex items-center justify-center">
                <Calculator className="w-7 h-7 text-[hsl(175,85%,35%)]" />
              </div>
              <p className="text-[hsl(175,85%,35%)] font-bold text-[18px] uppercase tracking-[0.15em]">Calculateur</p>
            </div>
            <h2 className="text-[50px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-8">
              Votre prix de<br />revient réel en<br />
              <span className="text-[hsl(175,85%,35%)]">30 secondes.</span>
            </h2>
            <p className="text-[22px] text-[hsl(210,20%,45%)] mb-10">
              Salaires, charges, carburant, péages, AdBlue, amortissements… Tout est intégré automatiquement.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                'Calcul multi-conducteurs',
                'Péages automatiques',
                'Charges fixes & variables',
                'Export PDF professionnel',
                'Historique complet',
                'Alertes de marge',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[hsl(158,70%,40%)] flex-shrink-0" />
                  <span className="text-[18px] text-[hsl(210,20%,30%)]">{feat}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[55%] flex items-center justify-center bg-[hsl(180,10%,97%)] p-12">
            <img src={mockupCalculator} alt="Calculateur OptiFlow" className="w-full rounded-xl shadow-2xl border border-[hsl(180,15%,88%)]" />
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 5 — Itinéraires
  {
    id: 'itinerary',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="w-[55%] flex items-center justify-center bg-[hsl(180,10%,97%)] p-12">
            <img src={mockupItinerary} alt="Itinéraire OptiFlow" className="w-full rounded-xl shadow-2xl border border-[hsl(180,15%,88%)]" />
          </div>
          <div className="w-[45%] flex flex-col justify-center px-20 py-16">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-xl bg-[hsl(24,95%,92%)] flex items-center justify-center">
                <Route className="w-7 h-7 text-[hsl(24,95%,53%)]" />
              </div>
              <p className="text-[hsl(24,95%,53%)] font-bold text-[18px] uppercase tracking-[0.15em]">Itinéraires PL</p>
            </div>
            <h2 className="text-[50px] font-extrabold text-[hsl(210,45%,15%)] leading-[1.1] mb-8">
              Optimisez chaque<br />trajet, maximisez<br />
              <span className="text-[hsl(175,85%,35%)]">chaque euro.</span>
            </h2>
            <div className="space-y-4">
              {[
                { icon: Target, label: 'Restrictions PL intégrées (hauteur, poids, largeur)' },
                { icon: Clock, label: 'Temps de conduite estimé' },
                { icon: TrendingUp, label: 'Comparaison autoroute vs nationale' },
                { icon: Gauge, label: 'Coût péages détaillé par classe' },
                { icon: MapPin, label: 'Adresses favorites & carnet clients' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-[hsl(180,15%,97%)] border border-[hsl(180,15%,90%)] rounded-xl px-6 py-4">
                  <item.icon className="w-6 h-6 text-[hsl(175,85%,35%)]" />
                  <span className="text-[19px] text-[hsl(210,45%,20%)] font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 6 — Planning
  {
    id: 'planning',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-white flex">
          <div className="w-[45%] flex flex-col justify-center px-24 py-16">
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
                { icon: PieChart, text: 'Ordres de mission intégrés' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-[hsl(180,15%,97%)] rounded-xl px-6 py-4 border border-[hsl(180,15%,90%)] shadow-sm">
                  <item.icon className="w-6 h-6 text-[hsl(175,85%,35%)] flex-shrink-0" />
                  <span className="text-[19px] text-[hsl(210,20%,30%)]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[55%] flex items-center justify-center bg-[hsl(180,10%,97%)] p-12">
            <img src={mockupPlanning} alt="Planning OptiFlow" className="w-full rounded-xl shadow-2xl border border-[hsl(180,15%,88%)]" />
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 7 — Gestion de flotte & clients
  {
    id: 'fleet',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-[hsl(180,15%,98%)] flex flex-col items-center justify-center px-24">
          <h2 className="text-[56px] font-extrabold text-[hsl(210,45%,15%)] mb-5 text-center leading-[1.1]">
            Tout votre parc dans<br />
            <span className="text-[hsl(175,85%,35%)]">un seul outil.</span>
          </h2>
          <p className="text-[24px] text-[hsl(210,20%,45%)] mb-16 text-center max-w-[800px]">
            Gérez conducteurs, véhicules, remorques et clients depuis une seule interface.
          </p>
          <div className="grid grid-cols-2 gap-10 w-full max-w-[1400px]">
            {[
              { icon: Users, title: 'Conducteurs', desc: 'Fiches complètes : salaires brut/net, primes, taux horaire, contrats CDI/CDD/intérim. Calcul automatique du coût conducteur.', color: 'hsl(175,85%,35%)' },
              { icon: Truck, title: 'Véhicules & Remorques', desc: 'Consommation, leasing, amortissement, coûts d\'entretien. Suivi par véhicule avec rapports de dépréciation.', color: 'hsl(24,95%,53%)' },
              { icon: Star, title: 'Clients', desc: 'Analyse de rentabilité par client. Détection automatique des clients toxiques qui érodent vos marges.', color: 'hsl(158,70%,40%)' },
              { icon: BarChart3, title: 'Dashboard', desc: 'Tableau de bord avec KPIs : CA, bénéfice, marge moyenne, état de la flotte, indicateurs clés en temps réel.', color: 'hsl(200,80%,50%)' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-6 bg-white rounded-2xl p-8 border border-[hsl(180,15%,90%)] shadow-sm">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color + '18' }}>
                  <item.icon className="w-7 h-7" style={{ color: item.color }} />
                </div>
                <div>
                  <h4 className="font-bold text-[hsl(210,45%,15%)] text-[24px] mb-2">{item.title}</h4>
                  <p className="text-[18px] text-[hsl(210,20%,45%)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 8 — Sécurité & rôles
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
          <div className="mt-14 flex items-center gap-8 text-[18px] text-[hsl(210,20%,50%)]">
            <div className="flex items-center gap-2"><Settings className="w-5 h-5 text-[hsl(175,85%,35%)]" /> Synchronisation cloud</div>
            <span className="text-[hsl(210,10%,85%)]">•</span>
            <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[hsl(175,85%,35%)]" /> Données chiffrées</div>
            <span className="text-[hsl(210,10%,85%)]">•</span>
            <div className="flex items-center gap-2"><Users className="w-5 h-5 text-[hsl(175,85%,35%)]" /> Multi-utilisateurs</div>
          </div>
        </div>
      </SlideBox>
    ),
  },

  // SLIDE 9 — Chiffres clés
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

  // SLIDE 10 — Tarification
  {
    id: 'pricing',
    render: () => (
      <SlideBox>
        <div className="w-full h-full bg-[hsl(180,15%,98%)] flex flex-col items-center justify-center px-24">
          <h2 className="text-[56px] font-extrabold text-[hsl(210,45%,15%)] mb-5 text-center leading-[1.1]">
            Un investissement qui se<br />
            <span className="text-[hsl(175,85%,35%)]">rentabilise dès le 1er mois.</span>
          </h2>
          <p className="text-[22px] text-[hsl(210,20%,45%)] mb-16 text-center">Tarifs adaptés à la taille de votre flotte.</p>
          <div className="grid grid-cols-3 gap-10 w-full max-w-[1400px]">
            {[
              { plan: 'Start', desc: 'Idéal pour les TPE', features: ['Calculateur de rentabilité', 'Jusqu\'à 5 conducteurs', 'Export PDF', 'Support email'], highlight: false },
              { plan: 'Pro', desc: 'Pour les PME ambitieuses', features: ['Tout Start +', 'Itinéraires optimisés PL', 'Planning hebdomadaire', 'Multi-utilisateurs', 'Dashboard analytics', 'Alertes de marge'], highlight: true },
              { plan: 'Enterprise', desc: 'Pour les grandes flottes', features: ['Tout Pro +', 'Utilisateurs illimités', 'IA & prédictions', 'Analyse clients toxiques', 'Support prioritaire'], highlight: false },
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

  // SLIDE 11 — CTA final
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
            <p className="text-[hsl(210,20%,70%)] text-[16px]">
              © 2026 OptiGroup — Tous droits réservés
            </p>
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
    <div className="h-screen bg-[hsl(210,10%,92%)] flex flex-col overflow-hidden print:h-auto print:overflow-visible print:bg-white">
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
        {SLIDES.map((slide) => (
          <div key={slide.id} className="print-slide-page">
            <div style={{
              transform: `scale(${(297 * 3.7795) / SLIDE_W})`,
              transformOrigin: 'top left',
              width: SLIDE_W,
              height: SLIDE_H,
            }}>
              {slide.render()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
