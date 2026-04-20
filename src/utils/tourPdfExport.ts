import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SavedTour } from '@/types/savedTour';
import {
  PDF_COLORS,
  PDF_LAYOUT,
  drawHeader,
  drawFooter,
  sectionTitle,
  ensureSpace,
  infoBox,
  formatCurrency,
  formatCurrencyDetailed,
  formatPercent,
  formatNumber,
} from './pdfHelpers';

interface TourPDFOptions {
  includeAIAnalysis?: boolean;
  includeVehicleDetails?: boolean;
  includeDriverDetails?: boolean;
  companyName?: string;
}

export function exportTourDetailedPDF(tour: SavedTour, options: TourPDFOptions = {}) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_LAYOUT.marginX * 2;

  let y = drawHeader(pdf, {
    title: 'Rapport de Tournée',
    subtitle: tour.name,
    companyName: options.companyName,
    reference: `T-${tour.id.substring(0, 8).toUpperCase()}`,
  });

  // Itinéraire
  y = sectionTitle(pdf, 'Itinéraire', y);
  autoTable(pdf, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: PDF_COLORS.dark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 22, textColor: PDF_COLORS.muted },
      1: { cellWidth: contentWidth - 22 },
    },
    body: [
      ['Départ', tour.origin_address],
      ['Arrivée', tour.destination_address],
      ['Distance', `${formatNumber(tour.distance_km)} km`],
      ['Durée', tour.duration_minutes ? `${Math.floor(tour.duration_minutes / 60)} h ${(tour.duration_minutes % 60).toString().padStart(2, '0')}` : '—'],
    ],
    margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
  });
  y = (pdf as any).lastAutoTable.finalY + 6;

  // Résumé financier (KPI)
  y = ensureSpace(pdf, y, 35);
  const kpiW = (contentWidth - 8) / 3;
  const margin = tour.profit_margin || 0;
  const profit = tour.profit || 0;
  infoBox(pdf, "Chiffre d'affaires", formatCurrency(tour.revenue || 0), PDF_LAYOUT.marginX, y, kpiW);
  infoBox(
    pdf,
    'Bénéfice',
    formatCurrency(profit),
    PDF_LAYOUT.marginX + kpiW + 4,
    y,
    kpiW,
    profit >= 0 ? 'success' : 'danger'
  );
  infoBox(
    pdf,
    'Marge',
    formatPercent(margin),
    PDF_LAYOUT.marginX + (kpiW + 4) * 2,
    y,
    kpiW,
    margin >= 15 ? 'success' : margin >= 8 ? 'warning' : 'danger'
  );
  y += 28;

  // Ventilation des coûts
  y = ensureSpace(pdf, y, 80);
  y = sectionTitle(pdf, 'Ventilation des coûts', y);
  const total = tour.total_cost || 1;
  const costs: [string, number][] = [
    ['Carburant (Gazole)', tour.fuel_cost],
    ['AdBlue', tour.adblue_cost],
    ['Péages', tour.toll_cost],
    ['Conducteur(s)', tour.driver_cost],
    ['Structure', tour.structure_cost],
    ['Véhicule', tour.vehicle_cost],
  ];
  autoTable(pdf, {
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PDF_COLORS.primary, textColor: 255, fontStyle: 'bold' },
    head: [['Poste', 'Montant', 'Part']],
    body: costs.map(([label, val]) => [
      label,
      formatCurrencyDetailed(val),
      `${((val / total) * 100).toFixed(1)} %`,
    ]),
    foot: [['COÛT TOTAL', formatCurrencyDetailed(tour.total_cost), '100,0 %']],
    footStyles: { fillColor: PDF_COLORS.dark, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 45 },
      2: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
  });
  y = (pdf as any).lastAutoTable.finalY + 6;

  // Indicateurs clés
  y = ensureSpace(pdf, y, 50);
  y = sectionTitle(pdf, 'Indicateurs clés', y);
  const cpk = tour.distance_km > 0 ? tour.total_cost / tour.distance_km : 0;
  const rpk = tour.distance_km > 0 && tour.revenue ? tour.revenue / tour.distance_km : 0;
  const mpk = tour.distance_km > 0 && tour.profit ? tour.profit / tour.distance_km : 0;
  autoTable(pdf, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PDF_COLORS.dark, textColor: 255 },
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Coût au kilomètre', `${cpk.toFixed(3)} €/km`],
      ['Revenu au kilomètre', `${rpk.toFixed(3)} €/km`],
      ['Marge au kilomètre', `${mpk.toFixed(3)} €/km`],
      [
        'Mode de tarification',
        tour.pricing_mode === 'km'
          ? `${tour.price_per_km?.toFixed(2) || 0} €/km`
          : tour.pricing_mode === 'fixed'
          ? `Forfait ${formatCurrencyDetailed(tour.fixed_price || 0)}`
          : 'Auto',
      ],
      ['Date de création', format(new Date(tour.created_at), 'dd/MM/yyyy', { locale: fr })],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 }, 1: { halign: 'right' } },
    margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
  });
  y = (pdf as any).lastAutoTable.finalY + 6;

  // Ressources affectées
  if (
    (options.includeVehicleDetails && tour.vehicle_data) ||
    (options.includeDriverDetails && tour.drivers_data && (tour.drivers_data as any[]).length > 0)
  ) {
    y = ensureSpace(pdf, y, 30);
    y = sectionTitle(pdf, 'Ressources affectées', y);
    const body: any[] = [];
    if (tour.vehicle_data) {
      const v: any = tour.vehicle_data;
      body.push(['Véhicule', v.name || v.brand || 'Non spécifié']);
    }
    if (tour.drivers_data && (tour.drivers_data as any[]).length > 0) {
      body.push(['Conducteur(s)', (tour.drivers_data as any[]).map((d: any) => d.name).join(', ')]);
    }
    autoTable(pdf, {
      startY: y,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 35, textColor: PDF_COLORS.muted } },
      body,
      margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // Analyse IA
  if (options.includeAIAnalysis) {
    y = ensureSpace(pdf, y, 60);
    y = sectionTitle(pdf, 'Analyse automatique', y);
    const analyses: string[] = [];
    if (margin < 5) analyses.push('ALERTE — Marge critique. Cette tournée est déficitaire ou à la limite de rentabilité. Action urgente requise.');
    else if (margin < 10) analyses.push('Marge insuffisante. Recommandation : renégocier le tarif (+15 à 20 %) ou optimiser les coûts.');
    else if (margin < 15) analyses.push('Marge acceptable. Potentiel d\'amélioration en optimisant les temps de conduite.');
    else if (margin < 25) analyses.push('Bonne marge. Recommandation : fidéliser ce client et proposer des prestations similaires.');
    else analyses.push('Excellente marge. Ce client représente une opportunité commerciale importante.');

    const fp = (tour.fuel_cost / total) * 100;
    if (fp > 45) analyses.push(`Coût carburant élevé (${fp.toFixed(0)} % du total). Vérifiez la consommation ou envisagez un itinéraire plus économique.`);
    const tp = (tour.toll_cost / total) * 100;
    if (tp > 15) analyses.push(`Péages significatifs (${tp.toFixed(0)} % du total). Un itinéraire alternatif pourrait réduire cette charge.`);
    if (tour.revenue && tour.distance_km > 0) {
      const ppk = tour.revenue / tour.distance_km;
      if (ppk < 1.5) analyses.push(`Prix/km faible (${ppk.toFixed(2)} €/km). Tarif sous le marché pour du transport poids lourd.`);
      else if (ppk > 2.5) analyses.push(`Prix/km premium (${ppk.toFixed(2)} €/km). Excellent positionnement tarifaire.`);
    }

    autoTable(pdf, {
      startY: y,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3, fillColor: [248, 250, 252] },
      body: analyses.map((a) => [a]),
      margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // Notes
  if (tour.notes) {
    y = ensureSpace(pdf, y, 30);
    y = sectionTitle(pdf, 'Notes', y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...PDF_COLORS.dark);
    const lines = pdf.splitTextToSize(tour.notes, contentWidth);
    pdf.text(lines, PDF_LAYOUT.marginX, y);
  }

  drawFooter(pdf);
  const fileName = `tournee_${tour.name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
  return fileName;
}

export function exportToursSummaryPDF(tours: SavedTour[], options: { companyName?: string } = {}) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_LAYOUT.marginX * 2;

  let y = drawHeader(pdf, {
    title: 'Synthèse des Tournées',
    subtitle: `${tours.length} tournée(s) analysée(s)`,
    companyName: options.companyName,
  });

  const totalRevenue = tours.reduce((acc, t) => acc + (t.revenue || 0), 0);
  const totalCost = tours.reduce((acc, t) => acc + t.total_cost, 0);
  const totalProfit = tours.reduce((acc, t) => acc + (t.profit || 0), 0);
  const totalDistance = tours.reduce((acc, t) => acc + t.distance_km, 0);
  const withMargin = tours.filter((t) => t.profit_margin != null);
  const avgMargin = withMargin.length > 0 ? withMargin.reduce((acc, t) => acc + (t.profit_margin || 0), 0) / withMargin.length : 0;

  // KPIs
  const kpiW = (contentWidth - 12) / 4;
  infoBox(pdf, 'Distance', `${formatNumber(totalDistance)} km`, PDF_LAYOUT.marginX, y, kpiW);
  infoBox(pdf, 'CA total', formatCurrency(totalRevenue), PDF_LAYOUT.marginX + kpiW + 4, y, kpiW, 'primary');
  infoBox(pdf, 'Bénéfice', formatCurrency(totalProfit), PDF_LAYOUT.marginX + (kpiW + 4) * 2, y, kpiW, totalProfit >= 0 ? 'success' : 'danger');
  infoBox(pdf, 'Marge moy.', formatPercent(avgMargin), PDF_LAYOUT.marginX + (kpiW + 4) * 3, y, kpiW, avgMargin >= 15 ? 'success' : 'warning');
  y += 28;

  y = sectionTitle(pdf, 'Détail des tournées', y);
  autoTable(pdf, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: PDF_COLORS.primary, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: PDF_COLORS.dark, textColor: 255, fontStyle: 'bold' },
    head: [['Tournée', 'Distance', 'Coût', 'Revenu', 'Profit', 'Marge']],
    body: tours.map((tour) => [
      tour.name,
      `${formatNumber(tour.distance_km)} km`,
      formatCurrency(tour.total_cost),
      formatCurrency(tour.revenue || 0),
      formatCurrency(tour.profit || 0),
      formatPercent(tour.profit_margin || 0),
    ]),
    foot: [[
      'TOTAL',
      `${formatNumber(totalDistance)} km`,
      formatCurrency(totalCost),
      formatCurrency(totalRevenue),
      formatCurrency(totalProfit),
      formatPercent(avgMargin),
    ]],
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },
    margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
  });

  drawFooter(pdf);
  pdf.save(`synthese_tournees_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export function exportMissionOrderPDF(tour: SavedTour, options: { companyName?: string } = {}) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_LAYOUT.marginX * 2;

  let y = drawHeader(pdf, {
    title: 'Ordre de Mission',
    subtitle: tour.name,
    companyName: options.companyName,
    reference: `ODM-${tour.id.substring(0, 8).toUpperCase()}`,
  });

  // Bloc info
  y = sectionTitle(pdf, 'Informations générales', y);
  autoTable(pdf, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40, textColor: PDF_COLORS.muted },
      1: { cellWidth: contentWidth - 40 },
    },
    body: [
      ['Référence', `ODM-${tour.id.substring(0, 8).toUpperCase()}`],
      ['Date', format(new Date(), 'dd MMMM yyyy', { locale: fr })],
      ['Origine', tour.origin_address],
      ['Destination', tour.destination_address],
      ['Distance', `${formatNumber(tour.distance_km)} km`],
      ...(tour.drivers_data && (tour.drivers_data as any[]).length > 0
        ? [['Conducteur(s)', (tour.drivers_data as any[]).map((d: any) => d.name).join(', ')]]
        : []),
      ...(tour.vehicle_data ? [['Véhicule', (tour.vehicle_data as any).name || (tour.vehicle_data as any).brand || '—']] : []),
    ],
    margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  // Contenu ODM
  const missionText = (tour as any).mission_order;
  if (missionText) {
    y = sectionTitle(pdf, 'Détails de la mission', y);
    pdf.setFillColor(248, 250, 252);
    const lines = pdf.splitTextToSize(missionText, contentWidth - 8);
    const blockH = lines.length * 4.5 + 8;
    y = ensureSpace(pdf, y, Math.min(blockH, 60));
    pdf.roundedRect(PDF_LAYOUT.marginX, y, contentWidth, Math.min(blockH, 220), 2, 2, 'F');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...PDF_COLORS.dark);

    let cursorY = y + 6;
    const pageHeight = pdf.internal.pageSize.getHeight();
    for (const line of lines) {
      if (cursorY > pageHeight - PDF_LAYOUT.marginBottom) {
        pdf.addPage();
        cursorY = drawHeader(pdf, {
          title: 'Ordre de Mission',
          subtitle: tour.name,
          companyName: options.companyName,
        });
      }
      pdf.text(line, PDF_LAYOUT.marginX + 4, cursorY);
      cursorY += 5;
    }
  }

  drawFooter(pdf);
  pdf.save(`odm_${tour.name.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}
