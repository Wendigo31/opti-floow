import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CostBreakdown, TripCalculation, VehicleParams } from '@/types';
import type { ExportOptions } from '@/components/export/PDFExportDialog';
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

interface ForecastMonth {
  name: string;
  fuel: number;
  adBlue: number;
  tolls: number;
  structure: number;
  driver: number;
  total: number;
  cumulative: number;
  trips: number;
  revenue?: number;
  profit?: number;
}

interface PDFExportData {
  companyName: string;
  trip: TripCalculation;
  vehicle: VehicleParams;
  costs: CostBreakdown;
  selectedDriverNames: string[];
  forecast: ForecastMonth[];
  forecastMonths: number;
  monthlyTotalCost: number;
  tripsPerMonth: number;
  exportOptions?: ExportOptions;
  originAddress?: string;
  destinationAddress?: string;
}

export function exportForecastPDF(data: PDFExportData) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const contentWidth = pageWidth - PDF_LAYOUT.marginX * 2;

  let y = drawHeader(pdf, {
    title: 'Cotation Transport',
    subtitle: `Prévisionnel sur ${data.forecastMonths} mois`,
    companyName: data.companyName,
    reference: `REF-${Date.now().toString().slice(-6)}`,
  });

  // Note personnalisée
  if (data.exportOptions?.note?.trim()) {
    y = ensureSpace(pdf, y, 30);
    pdf.setFillColor(239, 246, 255);
    const noteLines = pdf.splitTextToSize(data.exportOptions.note, contentWidth - 8);
    const h = noteLines.length * 4.5 + 8;
    pdf.roundedRect(PDF_LAYOUT.marginX, y, contentWidth, h, 2, 2, 'F');
    pdf.setDrawColor(...PDF_COLORS.primary);
    pdf.setLineWidth(0.5);
    pdf.line(PDF_LAYOUT.marginX, y, PDF_LAYOUT.marginX, y + h);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...PDF_COLORS.dark);
    pdf.text(noteLines, PDF_LAYOUT.marginX + 4, y + 6);
    y += h + 6;
  }

  // Itinéraire
  if (data.originAddress && data.destinationAddress) {
    y = ensureSpace(pdf, y, 35);
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
        ['Départ', data.originAddress],
        ['Arrivée', data.destinationAddress],
      ],
      margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // KPI cards
  y = ensureSpace(pdf, y, 35);
  const kpiW = (contentWidth - 8) / 3;
  infoBox(pdf, 'Distance', `${formatNumber(data.trip.distance)} km`, PDF_LAYOUT.marginX, y, kpiW, 'neutral');
  infoBox(pdf, 'Coût total / trajet', formatCurrency(data.costs.totalCost), PDF_LAYOUT.marginX + kpiW + 4, y, kpiW, 'primary');
  const margin = data.costs.profitMargin || 0;
  const variant = margin >= 15 ? 'success' : margin >= 8 ? 'warning' : 'danger';
  infoBox(pdf, 'Marge', formatPercent(margin), PDF_LAYOUT.marginX + (kpiW + 4) * 2, y, kpiW, variant);
  y += 28;

  // Paramètres
  y = ensureSpace(pdf, y, 50);
  y = sectionTitle(pdf, 'Paramètres du trajet', y);
  autoTable(pdf, {
    startY: y,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: PDF_COLORS.dark, textColor: 255, fontStyle: 'bold' },
    head: [['Paramètre', 'Valeur']],
    body: [
      ['Distance', `${formatNumber(data.trip.distance)} km`],
      ['Péages', formatCurrencyDetailed(data.trip.tollCost)],
      ['Mode de tarification', data.trip.pricingMode === 'km' ? `${data.trip.pricePerKm} €/km` : `Forfait ${formatCurrencyDetailed(data.trip.fixedPrice)}`],
      ['Marge cible', `${data.trip.targetMargin} %`],
      ['Conducteur(s)', data.selectedDriverNames.join(', ') || 'Non défini'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
    margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
  });
  y = (pdf as any).lastAutoTable.finalY + 6;

  // Décomposition coûts
  if (data.exportOptions?.includeCostChart !== false) {
    y = ensureSpace(pdf, y, 60);
    y = sectionTitle(pdf, 'Décomposition des coûts par trajet', y);
    const total = data.costs.totalCost || 1;
    const rows = [
      ['Gazole', data.costs.fuel],
      ['AdBlue', data.costs.adBlue],
      ['Péages', data.costs.tolls],
      ['Conducteur(s)', data.costs.driverCost],
      ['Structure', data.costs.structureCost],
    ];
    autoTable(pdf, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_COLORS.primary, textColor: 255, fontStyle: 'bold' },
      head: [['Poste', 'Montant', 'Part']],
      body: rows.map(([label, val]) => [
        label as string,
        formatCurrencyDetailed(val as number),
        `${(((val as number) / total) * 100).toFixed(1)} %`,
      ]),
      foot: [['TOTAL', formatCurrencyDetailed(data.costs.totalCost), '100,0 %']],
      footStyles: { fillColor: PDF_COLORS.dark, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right', cellWidth: 45 },
        2: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // Rentabilité
  if (data.exportOptions?.includeProfitChart !== false) {
    y = ensureSpace(pdf, y, 50);
    y = sectionTitle(pdf, 'Rentabilité', y);
    autoTable(pdf, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: PDF_COLORS.success, textColor: 255 },
      head: [['Indicateur', 'Valeur']],
      body: [
        ["Chiffre d'affaires", formatCurrencyDetailed(data.costs.revenue)],
        ['Coût de revient', formatCurrencyDetailed(data.costs.totalCost)],
        ['Bénéfice', formatCurrencyDetailed(data.costs.profit)],
        ['Marge', formatPercent(data.costs.profitMargin)],
        ['Prix suggéré', formatCurrencyDetailed(data.costs.suggestedPrice)],
        ['Prix/km suggéré', `${data.costs.suggestedPricePerKm.toFixed(3)} €/km`],
        ['Coût/km', `${data.costs.costPerKm.toFixed(3)} €/km`],
      ],
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 }, 1: { halign: 'right' } },
      margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
    });
    y = (pdf as any).lastAutoTable.finalY + 6;
  }

  // Carte
  if (data.exportOptions?.includeMap && data.exportOptions?.mapImageData) {
    pdf.addPage();
    y = drawHeader(pdf, {
      title: 'Cotation Transport',
      subtitle: 'Carte de l\'itinéraire',
      companyName: data.companyName,
    });
    y = sectionTitle(pdf, 'Carte de l\'itinéraire', y);
    try {
      const imgWidth = contentWidth;
      const imgHeight = 130;
      pdf.addImage(data.exportOptions.mapImageData, 'PNG', PDF_LAYOUT.marginX, y, imgWidth, imgHeight);
    } catch (e) {
      pdf.setFontSize(9);
      pdf.setTextColor(...PDF_COLORS.danger);
      pdf.text('Carte indisponible', PDF_LAYOUT.marginX, y + 10);
    }
  }

  // Prévisionnel
  if (data.exportOptions?.includeForecastTable !== false) {
    pdf.addPage();
    y = drawHeader(pdf, {
      title: 'Cotation Transport',
      subtitle: `Prévisionnel sur ${data.forecastMonths} mois`,
      companyName: data.companyName,
    });

    const totalForecast = data.monthlyTotalCost * data.forecastMonths;
    const totalTrips = Math.round(data.tripsPerMonth * data.forecastMonths);
    const kpi3 = (contentWidth - 8) / 3;
    infoBox(pdf, 'Coût mensuel', formatCurrency(data.monthlyTotalCost), PDF_LAYOUT.marginX, y, kpi3);
    infoBox(pdf, `Total ${data.forecastMonths} mois`, formatCurrency(totalForecast), PDF_LAYOUT.marginX + kpi3 + 4, y, kpi3, 'primary');
    infoBox(pdf, 'Trajets estimés', formatNumber(totalTrips), PDF_LAYOUT.marginX + (kpi3 + 4) * 2, y, kpi3);
    y += 28;

    y = sectionTitle(pdf, 'Détail mensuel', y);

    autoTable(pdf, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: PDF_COLORS.primary, textColor: 255, fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: PDF_COLORS.dark, textColor: 255, fontStyle: 'bold' },
      head: [['Mois', 'Trajets', 'Gazole', 'AdBlue', 'Péages', 'Structure', 'Conducteur', 'Total', 'Cumulé']],
      body: data.forecast.map((m) => [
        m.name,
        formatNumber(m.trips),
        formatCurrency(m.fuel),
        formatCurrency(m.adBlue),
        formatCurrency(m.tolls),
        formatCurrency(m.structure),
        formatCurrency(m.driver),
        formatCurrency(m.total),
        formatCurrency(m.cumulative),
      ]),
      foot: [[
        'TOTAL',
        formatNumber(totalTrips),
        formatCurrency(data.forecast.reduce((s, m) => s + m.fuel, 0)),
        formatCurrency(data.forecast.reduce((s, m) => s + m.adBlue, 0)),
        formatCurrency(data.forecast.reduce((s, m) => s + m.tolls, 0)),
        formatCurrency(data.forecast.reduce((s, m) => s + m.structure, 0)),
        formatCurrency(data.forecast.reduce((s, m) => s + m.driver, 0)),
        formatCurrency(totalForecast),
        '—',
      ]],
      columnStyles: {
        0: { cellWidth: 22, fontStyle: 'bold' },
        1: { halign: 'right', cellWidth: 14 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right', fontStyle: 'bold' },
        8: { halign: 'right' },
      },
      margin: { left: PDF_LAYOUT.marginX, right: PDF_LAYOUT.marginX },
    });
  }

  drawFooter(pdf);
  pdf.save(`cotation_${data.forecastMonths}mois_${new Date().toISOString().split('T')[0]}.pdf`);
}
