import jsPDF from 'jspdf';
import type { CostBreakdown, TripCalculation, VehicleParams } from '@/types';
import type { ExportOptions } from '@/components/export/PDFExportDialog';

// Import logo as base64 for PDF
const OPTIFLOW_WATERMARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" opacity="0.08">
  <text x="50" y="55" text-anchor="middle" font-size="12" font-family="Arial, sans-serif" fill="currentColor">OptiFlow</text>
</svg>`;

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
  cumulativeRevenue?: number;
  cumulativeProfit?: number;
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

const formatCurrency = (value: number): string => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

function addWatermark(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Add subtle watermark
  doc.setFontSize(60);
  doc.setTextColor(200, 200, 200);
  doc.setFont('helvetica', 'bold');
  
  // Save current state
  const currentPage = doc.getCurrentPageInfo().pageNumber;
  
  // Center watermark
  doc.text('OptiFlow', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45,
  });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
}

export function exportForecastPDF(data: PDFExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  // Add watermark to first page
  addWatermark(doc);
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(data.companyName, 14, y);
  y += 12;
  
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 80);
  doc.text('Prévisionnel de Coûts Transport - Poids Lourds', 14, y);
  y += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, y);
  y += 8;
  
  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pageWidth - 14, y);
  y += 12;

  // Custom Note (if provided)
  if (data.exportOptions?.note && data.exportOptions.note.trim()) {
    doc.setFillColor(245, 245, 250);
    const noteLines = doc.splitTextToSize(data.exportOptions.note, pageWidth - 40);
    const noteHeight = noteLines.length * 5 + 12;
    doc.roundedRect(14, y - 4, pageWidth - 28, noteHeight, 3, 3, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('📝 Note:', 18, y + 2);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(noteLines, 18, y + 10);
    y += noteHeight + 8;
  }

  // Route Info (if addresses provided)
  if (data.originAddress && data.destinationAddress) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Itinéraire', 14, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text('Départ:', 14, y);
    doc.setFont('helvetica', 'normal');
    const originLines = doc.splitTextToSize(data.originAddress, pageWidth - 60);
    doc.text(originLines, 40, y);
    y += originLines.length * 5 + 2;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Arrivée:', 14, y);
    doc.setFont('helvetica', 'normal');
    const destLines = doc.splitTextToSize(data.destinationAddress, pageWidth - 60);
    doc.text(destLines, 40, y);
    y += destLines.length * 5 + 8;
  }
  
  // Trip parameters section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Paramètres du Trajet', 14, y);
  y += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  const tripInfo = [
    ['Distance:', `${data.trip.distance.toLocaleString('fr-FR')} km`],
    ['Péages:', formatCurrency(data.trip.tollCost)],
    ['Mode tarification:', data.trip.pricingMode === 'km' ? `${data.trip.pricePerKm} €/km` : `Forfait ${formatCurrency(data.trip.fixedPrice)}`],
    ['Marge cible:', `${data.trip.targetMargin}%`],
    ['Conducteur(s):', data.selectedDriverNames.join(', ') || 'Non défini'],
  ];
  
  tripInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 60, y);
    y += 6;
  });
  
  y += 8;

  // Cost breakdown section (if includeCostChart is true or not specified)
  if (data.exportOptions?.includeCostChart !== false) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Décomposition des Coûts par Trajet', 14, y);
    y += 8;
    
    const costData = [
      ['Gazole:', formatCurrency(data.costs.fuel)],
      ['AdBlue:', formatCurrency(data.costs.adBlue)],
      ['Péages:', formatCurrency(data.costs.tolls)],
      ['Conducteur(s):', formatCurrency(data.costs.driverCost)],
      ['Structure:', formatCurrency(data.costs.structureCost)],
    ];
    
    doc.setFontSize(9);
    costData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.text(label, 14, y);
      doc.text(value, 60, y);
      y += 6;
    });
    
    // Total
    y += 2;
    doc.setFillColor(59, 130, 246);
    doc.rect(14, y - 4, 80, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', 16, y);
    doc.text(formatCurrency(data.costs.totalCost), 60, y);
    y += 14;
  }

  // Profit section (if includeProfitChart is true or not specified)
  if (data.exportOptions?.includeProfitChart !== false) {
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.text('Rentabilité', 14, y);
    y += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    
    const profitData = [
      ['Chiffre d\'affaires:', formatCurrency(data.costs.revenue)],
      ['Coût de revient:', formatCurrency(data.costs.totalCost)],
      ['Bénéfice:', formatCurrency(data.costs.profit)],
      ['Marge:', `${data.costs.profitMargin.toFixed(1)}%`],
    ];
    
    profitData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, y);
      y += 6;
    });
    y += 6;
  }
  
  // Suggested pricing
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.text('Tarification Suggérée', 14, y);
  y += 8;
  
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  const pricingData = [
    [`Prix suggéré (marge ${data.trip.targetMargin}%):`, formatCurrency(data.costs.suggestedPrice)],
    ['Prix/km suggéré:', `${data.costs.suggestedPricePerKm.toFixed(3)} €/km`],
    ['Coût/km:', `${data.costs.costPerKm.toFixed(3)} €/km`],
  ];
  
  pricingData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 80, y);
    y += 6;
  });

  // Map image (if provided and includeMap is true)
  if (data.exportOptions?.includeMap && data.exportOptions?.mapImageData) {
    doc.addPage();
    addWatermark(doc);
    y = 20;
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Carte de l\'itinéraire', 14, y);
    y += 10;
    
    try {
      const imgWidth = pageWidth - 28;
      const imgHeight = 100;
      doc.addImage(data.exportOptions.mapImageData, 'PNG', 14, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    } catch (e) {
      console.error('Error adding map image to PDF:', e);
    }
  }

  // Forecast table (if includeForecastTable is true or not specified)
  if (data.exportOptions?.includeForecastTable !== false) {
    doc.addPage();
    addWatermark(doc);
    y = 20;
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Prévisionnel sur ${data.forecastMonths} mois`, 14, y);
    y += 12;
    
    // Summary boxes
    doc.setFontSize(10);
    doc.setFillColor(240, 240, 240);
    
    const boxWidth = 55;
    const boxHeight = 18;
    const boxGap = 5;
    
    // Box 1 - Monthly cost
    doc.roundedRect(14, y, boxWidth, boxHeight, 2, 2, 'F');
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text('Coût Mensuel', 16, y + 6);
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(data.monthlyTotalCost), 16, y + 13);
    
    // Box 2 - Total cost
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.roundedRect(14 + boxWidth + boxGap, y, boxWidth, boxHeight, 2, 2, 'F');
    doc.setTextColor(100, 100, 100);
    doc.text(`Total ${data.forecastMonths} mois`, 16 + boxWidth + boxGap, y + 6);
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(data.monthlyTotalCost * data.forecastMonths), 16 + boxWidth + boxGap, y + 13);
    
    // Box 3 - Trips
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.roundedRect(14 + (boxWidth + boxGap) * 2, y, boxWidth, boxHeight, 2, 2, 'F');
    doc.setTextColor(100, 100, 100);
    doc.text('Trajets estimés', 16 + (boxWidth + boxGap) * 2, y + 6);
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${Math.round(data.tripsPerMonth * data.forecastMonths)}`, 16 + (boxWidth + boxGap) * 2, y + 13);
    
    y += boxHeight + 12;
    
    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(59, 130, 246);
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
    doc.setTextColor(255, 255, 255);
    
    const headers = ['Mois', 'Trajets', 'Gazole', 'AdBlue', 'Péages', 'Structure', 'Conducteur', 'Total', 'Cumulé'];
    const colWidths = [22, 16, 20, 18, 18, 22, 24, 22, 22];
    let x = 14;
    headers.forEach((header, i) => {
      doc.text(header, x + 1, y);
      x += colWidths[i];
    });
    y += 6;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    data.forecast.forEach((month, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, y - 4, pageWidth - 28, 6, 'F');
      }
      
      x = 14;
      const row = [
        month.name,
        month.trips.toString(),
        formatCurrency(month.fuel),
        formatCurrency(month.adBlue),
        formatCurrency(month.tolls),
        formatCurrency(month.structure),
        formatCurrency(month.driver),
        formatCurrency(month.total),
        formatCurrency(month.cumulative),
      ];
      
      row.forEach((cell, i) => {
        doc.text(cell.substring(0, 12), x + 1, y);
        x += colWidths[i];
      });
      y += 6;
    });
    
    // Total row
    y += 2;
    doc.setFillColor(220, 230, 250);
    doc.rect(14, y - 4, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    
    x = 14;
    const totalRow = [
      'TOTAL',
      Math.round(data.tripsPerMonth * data.forecastMonths).toString(),
      formatCurrency(data.forecast.reduce((sum, m) => sum + m.fuel, 0)),
      formatCurrency(data.forecast.reduce((sum, m) => sum + m.adBlue, 0)),
      formatCurrency(data.forecast.reduce((sum, m) => sum + m.tolls, 0)),
      formatCurrency(data.forecast.reduce((sum, m) => sum + m.structure, 0)),
      formatCurrency(data.forecast.reduce((sum, m) => sum + m.driver, 0)),
      formatCurrency(data.monthlyTotalCost * data.forecastMonths),
      '-',
    ];
    
    totalRow.forEach((cell, i) => {
      doc.text(cell.substring(0, 12), x + 1, y);
      x += colWidths[i];
    });
  }
  
  // Footer with watermark reference
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} / ${pageCount} - OptiFlow | Optimisation Poids Lourds`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save
  doc.save(`previsionnel_${data.forecastMonths}mois_${new Date().toISOString().split('T')[0]}.pdf`);
}
