import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SavedTour } from '@/types/savedTour';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

const formatPercent = (value: number): string =>
  `${value.toFixed(1)}%`;

interface TourPDFOptions {
  includeAIAnalysis?: boolean;
  includeVehicleDetails?: boolean;
  includeDriverDetails?: boolean;
  companyName?: string;
  companyLogo?: string;
}

export function exportTourDetailedPDF(tour: SavedTour, options: TourPDFOptions = {}) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Colors
  const primaryColor: [number, number, number] = [59, 130, 246]; // Blue
  const successColor: [number, number, number] = [34, 197, 94]; // Green
  const warningColor: [number, number, number] = [245, 158, 11]; // Amber
  const dangerColor: [number, number, number] = [239, 68, 68]; // Red
  const darkColor: [number, number, number] = [30, 41, 59]; // Slate

  let y = 0;

  // ========== HEADER ==========
  pdf.setFillColor(...darkColor);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RAPPORT DE TOURNÉE', 14, 18);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(tour.name, 14, 28);
  
  pdf.setFontSize(9);
  pdf.text(`Généré le ${format(new Date(), "dd MMMM yyyy 'à' HH:mm", { locale: fr })}`, 14, 36);
  
  // Company name on right
  if (options.companyName) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(options.companyName, pageWidth - 14, 22, { align: 'right' });
  }
  
  pdf.text('OptiFlow', pageWidth - 14, 36, { align: 'right' });
  
  y = 50;

  // ========== ROUTE INFO ==========
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('📍 Itinéraire', 14, y);
  y += 8;
  
  // Route box
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(14, y, pageWidth - 28, 35, 3, 3, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('DÉPART', 20, y + 8);
  pdf.text('ARRIVÉE', 20, y + 22);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(30, 30, 30);
  const originLines = pdf.splitTextToSize(tour.origin_address, pageWidth - 70);
  pdf.text(originLines[0], 55, y + 8);
  const destLines = pdf.splitTextToSize(tour.destination_address, pageWidth - 70);
  pdf.text(destLines[0], 55, y + 22);
  
  // Distance badge
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(pageWidth - 55, y + 10, 40, 14, 3, 3, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${tour.distance_km.toFixed(0)} km`, pageWidth - 35, y + 19, { align: 'center' });
  
  y += 45;

  // ========== COSTS BREAKDOWN ==========
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('💰 Ventilation des Coûts', 14, y);
  y += 8;

  // Cost table data
  const costItems = [
    { label: 'Carburant (Gazole)', value: tour.fuel_cost, icon: '⛽', percent: (tour.fuel_cost / tour.total_cost) * 100 },
    { label: 'AdBlue', value: tour.adblue_cost, icon: '💧', percent: (tour.adblue_cost / tour.total_cost) * 100 },
    { label: 'Péages', value: tour.toll_cost, icon: '🛣️', percent: (tour.toll_cost / tour.total_cost) * 100 },
    { label: 'Conducteur(s)', value: tour.driver_cost, icon: '👤', percent: (tour.driver_cost / tour.total_cost) * 100 },
    { label: 'Structure (charges fixes)', value: tour.structure_cost, icon: '🏢', percent: (tour.structure_cost / tour.total_cost) * 100 },
    { label: 'Véhicule (entretien, pneus)', value: tour.vehicle_cost, icon: '🚛', percent: (tour.vehicle_cost / tour.total_cost) * 100 },
  ];

  // Draw cost breakdown with bars
  costItems.forEach((item, index) => {
    const rowY = y + (index * 12);
    
    // Label
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(`${item.icon} ${item.label}`, 14, rowY + 4);
    
    // Progress bar background
    pdf.setFillColor(230, 230, 230);
    pdf.roundedRect(100, rowY, 50, 5, 1, 1, 'F');
    
    // Progress bar fill
    const barWidth = Math.min(50, (item.percent / 100) * 50);
    if (barWidth > 0) {
      const barColor = item.percent > 40 ? dangerColor : item.percent > 25 ? warningColor : successColor;
      pdf.setFillColor(...barColor);
      pdf.roundedRect(100, rowY, barWidth, 5, 1, 1, 'F');
    }
    
    // Percentage
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${item.percent.toFixed(1)}%`, 155, rowY + 4);
    
    // Value
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(formatCurrency(item.value), pageWidth - 14, rowY + 4, { align: 'right' });
  });
  
  y += costItems.length * 12 + 5;
  
  // Total cost bar
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(14, y, pageWidth - 28, 12, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('COÛT TOTAL', 20, y + 8);
  pdf.text(formatCurrency(tour.total_cost), pageWidth - 20, y + 8, { align: 'right' });
  
  y += 22;

  // ========== FINANCIAL SUMMARY ==========
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('📊 Résumé Financier', 14, y);
  y += 8;

  // Three columns: Revenue, Profit, Margin
  const colWidth = (pageWidth - 42) / 3;
  
  // Revenue
  pdf.setFillColor(241, 245, 249);
  pdf.roundedRect(14, y, colWidth, 30, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text('CHIFFRE D\'AFFAIRES', 14 + colWidth / 2, y + 10, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 30, 30);
  pdf.text(formatCurrency(tour.revenue || 0), 14 + colWidth / 2, y + 22, { align: 'center' });
  
  // Profit
  const profitColor = (tour.profit || 0) >= 0 ? successColor : dangerColor;
  pdf.setFillColor(...profitColor);
  pdf.roundedRect(21 + colWidth, y, colWidth, 30, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('BÉNÉFICE', 21 + colWidth + colWidth / 2, y + 10, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrency(tour.profit || 0), 21 + colWidth + colWidth / 2, y + 22, { align: 'center' });
  
  // Margin
  const margin = tour.profit_margin || 0;
  const marginColor = margin >= 20 ? successColor : margin >= 10 ? warningColor : dangerColor;
  pdf.setFillColor(...marginColor);
  pdf.roundedRect(28 + colWidth * 2, y, colWidth, 30, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('MARGE', 28 + colWidth * 2 + colWidth / 2, y + 10, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatPercent(margin), 28 + colWidth * 2 + colWidth / 2, y + 22, { align: 'center' });
  
  y += 40;

  // ========== KEY METRICS ==========
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('📈 Indicateurs Clés', 14, y);
  y += 10;

  const metrics = [
    { label: 'Coût au kilomètre', value: tour.distance_km > 0 ? `${(tour.total_cost / tour.distance_km).toFixed(3)} €/km` : '-' },
    { label: 'Revenu au kilomètre', value: tour.distance_km > 0 && tour.revenue ? `${((tour.revenue) / tour.distance_km).toFixed(3)} €/km` : '-' },
    { label: 'Marge au kilomètre', value: tour.distance_km > 0 && tour.profit ? `${((tour.profit) / tour.distance_km).toFixed(3)} €/km` : '-' },
    { label: 'Durée estimée', value: tour.duration_minutes ? `${Math.floor(tour.duration_minutes / 60)}h${(tour.duration_minutes % 60).toString().padStart(2, '0')}` : '-' },
    { label: 'Mode de tarification', value: tour.pricing_mode === 'km' ? `${tour.price_per_km?.toFixed(2) || 0} €/km` : tour.pricing_mode === 'fixed' ? `Forfait ${formatCurrency(tour.fixed_price || 0)}` : 'Auto' },
    { label: 'Date de création', value: format(new Date(tour.created_at), 'dd/MM/yyyy', { locale: fr }) },
  ];

  pdf.setFontSize(9);
  metrics.forEach((metric, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col === 0 ? 14 : pageWidth / 2 + 7;
    const metricY = y + row * 10;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(metric.label + ':', x, metricY);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(metric.value, x + 50, metricY);
  });
  
  y += Math.ceil(metrics.length / 2) * 10 + 10;

  // ========== VEHICLE & DRIVER INFO ==========
  if ((options.includeVehicleDetails && tour.vehicle_data) || (options.includeDriverDetails && tour.drivers_data && tour.drivers_data.length > 0)) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('🚛 Ressources Affectées', 14, y);
    y += 10;
    
    pdf.setFontSize(9);
    
    if (tour.vehicle_data) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Véhicule:', 14, y);
      pdf.setFont('helvetica', 'normal');
      const vehicleName = tour.vehicle_data.name || tour.vehicle_data.brand || 'Non spécifié';
      pdf.text(vehicleName, 45, y);
      y += 6;
    }
    
    if (tour.drivers_data && tour.drivers_data.length > 0) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Conducteur(s):', 14, y);
      pdf.setFont('helvetica', 'normal');
      const driverNames = tour.drivers_data.map((d: any) => d.name).join(', ');
      pdf.text(driverNames, 45, y);
      y += 6;
    }
    
    y += 8;
  }

  // ========== AI ANALYSIS ==========
  if (options.includeAIAnalysis) {
    // Check if we need a new page
    if (y > pageHeight - 80) {
      pdf.addPage();
      y = 20;
    }
    
    pdf.setFillColor(139, 92, 246); // Purple
    pdf.roundedRect(14, y, pageWidth - 28, 12, 3, 3, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('🤖 Analyse IA', 20, y + 8);
    y += 18;
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    // Generate AI analysis based on data
    const analyses: string[] = [];
    
    // Margin analysis
    if (margin < 5) {
      analyses.push('⚠️ ALERTE: Marge critique - Cette tournée est déficitaire ou à la limite de la rentabilité. Action urgente requise.');
    } else if (margin < 10) {
      analyses.push('📊 Marge insuffisante - Rentabilité faible. Recommandation: renégocier le tarif (+15-20%) ou optimiser les coûts.');
    } else if (margin < 15) {
      analyses.push('✅ Marge acceptable - La tournée est rentable. Potentiel d\'amélioration en optimisant les temps de conduite.');
    } else if (margin < 25) {
      analyses.push('👍 Bonne marge - Tournée profitable. Recommandation: fidéliser ce client et proposer des prestations similaires.');
    } else {
      analyses.push('🌟 Excellente marge - Tournée très profitable. Ce client représente une opportunité commerciale importante.');
    }
    
    // Fuel cost analysis
    const fuelPercent = (tour.fuel_cost / tour.total_cost) * 100;
    if (fuelPercent > 45) {
      analyses.push(`⛽ Coût carburant élevé (${fuelPercent.toFixed(0)}% du total) - Vérifiez la consommation du véhicule ou envisagez un itinéraire plus économique.`);
    }
    
    // Toll analysis
    const tollPercent = (tour.toll_cost / tour.total_cost) * 100;
    if (tollPercent > 15) {
      analyses.push(`🛣️ Péages significatifs (${tollPercent.toFixed(0)}% du total) - Un itinéraire alternatif pourrait réduire cette charge.`);
    }
    
    // Price per km analysis
    if (tour.revenue && tour.distance_km > 0) {
      const pricePerKm = tour.revenue / tour.distance_km;
      if (pricePerKm < 1.5) {
        analyses.push(`💶 Prix/km faible (${pricePerKm.toFixed(2)} €/km) - Tarif en dessous du marché pour du transport poids lourd.`);
      } else if (pricePerKm > 2.5) {
        analyses.push(`💶 Prix/km premium (${pricePerKm.toFixed(2)} €/km) - Excellent positionnement tarifaire.`);
      }
    }
    
    analyses.forEach((analysis, index) => {
      const lines = pdf.splitTextToSize(analysis, pageWidth - 40);
      lines.forEach((line: string) => {
        pdf.text(line, 20, y);
        y += 5;
      });
      y += 3;
    });
  }

  // ========== NOTES ==========
  if (tour.notes) {
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = 20;
    }
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('📝 Notes', 14, y);
    y += 8;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const noteLines = pdf.splitTextToSize(tour.notes, pageWidth - 28);
    pdf.text(noteLines, 14, y);
  }

  // ========== FOOTER ==========
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i}/${pageCount} • OptiFlow - Optimisation Transport Poids Lourds`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const fileName = `tournee-${tour.name.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`;
  pdf.save(fileName);
  
  return fileName;
}

// Export multiple tours summary
export function exportToursSummaryPDF(tours: SavedTour[], options: { companyName?: string } = {}) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Header
  pdf.setFillColor(30, 41, 59);
  pdf.rect(0, 0, pageWidth, 35, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SYNTHÈSE DES TOURNÉES', 14, 18);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${tours.length} tournée(s) • Généré le ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`, 14, 28);
  
  if (options.companyName) {
    pdf.text(options.companyName, pageWidth - 14, 22, { align: 'right' });
  }
  
  let y = 45;
  
  // Summary stats
  const totalRevenue = tours.reduce((acc, t) => acc + (t.revenue || 0), 0);
  const totalCost = tours.reduce((acc, t) => acc + t.total_cost, 0);
  const totalProfit = tours.reduce((acc, t) => acc + (t.profit || 0), 0);
  const totalDistance = tours.reduce((acc, t) => acc + t.distance_km, 0);
  const avgMargin = tours.filter(t => t.profit_margin != null).reduce((acc, t) => acc + (t.profit_margin || 0), 0) / tours.filter(t => t.profit_margin != null).length || 0;
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Récapitulatif Global', 14, y);
  y += 10;
  
  const stats = [
    ['Distance totale', `${totalDistance.toFixed(0)} km`],
    ['Chiffre d\'affaires total', formatCurrency(totalRevenue)],
    ['Coûts totaux', formatCurrency(totalCost)],
    ['Bénéfice total', formatCurrency(totalProfit)],
    ['Marge moyenne', formatPercent(avgMargin)],
  ];
  
  pdf.setFontSize(10);
  stats.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.text(label + ':', 14, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, 80, y);
    y += 7;
  });
  
  y += 10;
  
  // Table of tours
  pdf.autoTable({
    startY: y,
    head: [['Tournée', 'Distance', 'Coût', 'Revenu', 'Profit', 'Marge']],
    body: tours.map(tour => [
      tour.name.substring(0, 25),
      `${tour.distance_km.toFixed(0)} km`,
      formatCurrency(tour.total_cost),
      formatCurrency(tour.revenue || 0),
      formatCurrency(tour.profit || 0),
      formatPercent(tour.profit_margin || 0),
    ]),
    headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 8 },
  });
  
  // Save
  pdf.save(`synthese-tournees-${format(new Date(), 'yyyyMMdd')}.pdf`);
}
