import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDF_COLORS, PDF_LAYOUT, formatCurrencyDetailed } from './pdfHelpers';

interface Position { lat: number; lon: number }
interface Waypoint { id: string; address: string; position: Position | null }
interface RouteResult {
  distance: number;
  duration: number;
  tollCost: number;
  fuelCost: number;
  coordinates: [number, number][];
  type: 'highway' | 'national';
}
interface Segment { km: number; durationH: number; tollCost: number; fuelCost: number }

export interface ItineraryPdfData {
  originAddress: string;
  destinationAddress: string;
  stops: Waypoint[];
  route: RouteResult;
  segments: Segment[];
  transportMode: 'truck' | 'car';
  vehicleName?: string | null;
  clientName?: string | null;
  mapElement?: HTMLElement | null;
}

function formatDuration(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${mm.toString().padStart(2, '0')}`;
}

export async function exportItineraryPDF(data: ItineraryPdfData): Promise<void> {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const { marginX, marginTop } = PDF_LAYOUT;

  // Header
  pdf.setFillColor(...PDF_COLORS.primary);
  pdf.rect(0, 0, pageW, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text("Détail de l'itinéraire", marginX, 12);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  pdf.text(dateStr, marginX, 19);
  pdf.text(
    `Mode : ${data.transportMode === 'truck' ? 'Camion' : 'Voiture'} • Via ${data.route.type === 'highway' ? 'autoroute' : 'nationale'}`,
    marginX,
    24
  );

  let y = 36;
  pdf.setTextColor(...PDF_COLORS.dark);

  // Context
  if (data.vehicleName || data.clientName) {
    pdf.setFillColor(...PDF_COLORS.light);
    pdf.roundedRect(marginX, y, pageW - marginX * 2, 12, 2, 2, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...PDF_COLORS.muted);
    let cx = marginX + 4;
    if (data.clientName) {
      pdf.text('Client : ', cx, y + 7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...PDF_COLORS.dark);
      pdf.text(data.clientName, cx + 14, y + 7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...PDF_COLORS.muted);
      cx += 80;
    }
    if (data.vehicleName) {
      pdf.text('Véhicule : ', cx, y + 7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...PDF_COLORS.dark);
      pdf.text(data.vehicleName, cx + 18, y + 7);
    }
    y += 16;
  }

  // Totals strip
  const totalCost = (data.route.tollCost || 0) + (data.route.fuelCost || 0);
  const stripW = pageW - marginX * 2;
  const cellW = stripW / 4;
  pdf.setFillColor(...PDF_COLORS.primary);
  pdf.roundedRect(marginX, y, stripW, 18, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  const cells = [
    { label: 'Distance', value: `${data.route.distance} km` },
    { label: 'Durée', value: formatDuration(data.route.duration) },
    { label: 'Péages', value: formatCurrencyDetailed(data.route.tollCost) },
    { label: 'Coût total', value: formatCurrencyDetailed(totalCost) },
  ];
  cells.forEach((c, i) => {
    const cx = marginX + cellW * i + cellW / 2;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(c.label.toUpperCase(), cx, y + 6, { align: 'center' });
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(c.value, cx, y + 13, { align: 'center' });
  });
  y += 24;

  // Map snapshot (best-effort)
  if (data.mapElement) {
    try {
      const canvas = await html2canvas(data.mapElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scale: 1.5,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const imgW = pageW - marginX * 2;
      const imgH = Math.min(80, (canvas.height / canvas.width) * imgW);
      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.roundedRect(marginX, y, imgW, imgH, 2, 2, 'S');
      pdf.addImage(imgData, 'JPEG', marginX, y, imgW, imgH);
      y += imgH + 6;
    } catch (err) {
      console.warn('Map capture failed', err);
    }
  }

  // Stops
  pdf.setTextColor(...PDF_COLORS.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Étapes & tronçons', marginX, y);
  y += 5;

  const points = [
    { label: 'Départ', address: data.originAddress || '—' },
    ...data.stops.map((s, i) => ({ label: `Arrêt ${i + 1}`, address: s.address || '—' })),
    { label: 'Arrivée', address: data.destinationAddress || '—' },
  ];

  pdf.setFillColor(...PDF_COLORS.light);
  pdf.rect(marginX, y, pageW - marginX * 2, 7, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_COLORS.muted);
  pdf.text('POINT', marginX + 2, y + 5);
  pdf.text('ADRESSE', marginX + 30, y + 5);
  pdf.text('KM', pageW - marginX - 50, y + 5, { align: 'right' });
  pdf.text('DURÉE', pageW - marginX - 30, y + 5, { align: 'right' });
  pdf.text('PÉAGE', pageW - marginX - 2, y + 5, { align: 'right' });
  y += 9;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...PDF_COLORS.dark);

  for (let i = 0; i < points.length; i++) {
    if (y > pageH - 25) {
      pdf.addPage();
      y = marginTop;
    }
    const p = points[i];
    pdf.setFont('helvetica', 'bold');
    pdf.text(p.label, marginX + 2, y);
    pdf.setFont('helvetica', 'normal');
    const addrLines = pdf.splitTextToSize(p.address, pageW - marginX * 2 - 90);
    pdf.text(addrLines, marginX + 30, y);
    const lineH = Math.max(5, addrLines.length * 4.5);
    y += lineH;

    const seg = data.segments[i];
    if (i < points.length - 1 && seg) {
      pdf.setTextColor(...PDF_COLORS.muted);
      pdf.setFontSize(8);
      pdf.text(`tronçon ${i + 1}`, marginX + 6, y + 2);
      pdf.text(`${seg.km} km`, pageW - marginX - 50, y + 2, { align: 'right' });
      pdf.text(formatDuration(seg.durationH), pageW - marginX - 30, y + 2, { align: 'right' });
      pdf.text(formatCurrencyDetailed(seg.tollCost), pageW - marginX - 2, y + 2, { align: 'right' });
      y += 6;
      pdf.setDrawColor(...PDF_COLORS.border);
      pdf.line(marginX, y, pageW - marginX, y);
      y += 3;
      pdf.setFontSize(9);
      pdf.setTextColor(...PDF_COLORS.dark);
    }
  }

  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...PDF_COLORS.muted);
    pdf.text(`OptiFlow • Page ${i}/${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  const fileName = `itineraire_${(data.originAddress.split(',')[0] || 'depart').trim()}_${(data.destinationAddress.split(',')[0] || 'arrivee').trim()}_${new Date().toISOString().slice(0, 10)}.pdf`
    .replace(/[^a-z0-9_\-\.]/gi, '_');
  pdf.save(fileName);
}