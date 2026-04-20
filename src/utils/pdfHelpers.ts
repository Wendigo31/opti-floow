import jsPDF from 'jspdf';

export const PDF_COLORS = {
  primary: [37, 99, 235] as [number, number, number],
  primaryDark: [29, 78, 216] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  warning: [217, 119, 6] as [number, number, number],
  danger: [220, 38, 38] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
};

export const PDF_LAYOUT = {
  marginX: 14,
  marginTop: 18,
  marginBottom: 18,
  headerHeight: 38,
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatCurrencyDetailed(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatPercent(value: number): string {
  return `${(value || 0).toFixed(1)} %`;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0);
}

export interface DocHeaderOptions {
  title: string;
  subtitle?: string;
  companyName?: string;
  reference?: string;
}

export function drawHeader(pdf: jsPDF, opts: DocHeaderOptions): number {
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Top color band
  pdf.setFillColor(...PDF_COLORS.dark);
  pdf.rect(0, 0, pageWidth, PDF_LAYOUT.headerHeight, 'F');

  // Accent bar
  pdf.setFillColor(...PDF_COLORS.primary);
  pdf.rect(0, PDF_LAYOUT.headerHeight, pageWidth, 1.5, 'F');

  // Title
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(opts.title.toUpperCase(), PDF_LAYOUT.marginX, 16);

  // Subtitle
  if (opts.subtitle) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(203, 213, 225);
    const sub = pdf.splitTextToSize(opts.subtitle, pageWidth - PDF_LAYOUT.marginX * 2 - 60)[0];
    pdf.text(sub, PDF_LAYOUT.marginX, 24);
  }

  // Date
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    `Émis le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
    PDF_LAYOUT.marginX,
    32
  );

  // Right side: company + reference
  if (opts.companyName) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(opts.companyName, pageWidth - PDF_LAYOUT.marginX, 16, { align: 'right' });
  }
  if (opts.reference) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text(opts.reference, pageWidth - PDF_LAYOUT.marginX, 24, { align: 'right' });
  }
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('OptiFlow', pageWidth - PDF_LAYOUT.marginX, 32, { align: 'right' });

  return PDF_LAYOUT.headerHeight + 8; // next y
}

export function drawFooter(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(...PDF_COLORS.border);
    pdf.setLineWidth(0.2);
    pdf.line(PDF_LAYOUT.marginX, pageHeight - 12, pageWidth - PDF_LAYOUT.marginX, pageHeight - 12);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...PDF_COLORS.muted);
    pdf.text('OptiFlow — Optimisation Transport Poids Lourds', PDF_LAYOUT.marginX, pageHeight - 7);
    pdf.text(`Page ${i} / ${pageCount}`, pageWidth - PDF_LAYOUT.marginX, pageHeight - 7, { align: 'right' });
  }
}

export function sectionTitle(pdf: jsPDF, text: string, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFillColor(...PDF_COLORS.primary);
  pdf.rect(PDF_LAYOUT.marginX, y, 3, 6, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(...PDF_COLORS.dark);
  pdf.text(text, PDF_LAYOUT.marginX + 6, y + 5);
  pdf.setDrawColor(...PDF_COLORS.border);
  pdf.setLineWidth(0.2);
  pdf.line(PDF_LAYOUT.marginX, y + 8, pageWidth - PDF_LAYOUT.marginX, y + 8);
  return y + 12;
}

export function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + needed > pageHeight - PDF_LAYOUT.marginBottom) {
    pdf.addPage();
    return PDF_LAYOUT.marginTop;
  }
  return y;
}

export function infoBox(
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  variant: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' = 'neutral'
) {
  const colors = {
    neutral: { bg: [241, 245, 249], text: PDF_COLORS.dark, label: PDF_COLORS.muted },
    primary: { bg: PDF_COLORS.primary, text: [255, 255, 255], label: [219, 234, 254] },
    success: { bg: PDF_COLORS.success, text: [255, 255, 255], label: [220, 252, 231] },
    warning: { bg: PDF_COLORS.warning, text: [255, 255, 255], label: [254, 243, 199] },
    danger: { bg: PDF_COLORS.danger, text: [255, 255, 255], label: [254, 226, 226] },
  } as const;
  const c = colors[variant];

  pdf.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
  pdf.roundedRect(x, y, width, 22, 2, 2, 'F');

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(c.label[0], c.label[1], c.label[2]);
  pdf.text(label.toUpperCase(), x + 4, y + 7);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(c.text[0], c.text[1], c.text[2]);
  pdf.text(value, x + 4, y + 17);
}
