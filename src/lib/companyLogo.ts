import type jsPDF from 'jspdf';

/**
 * Logo de la société courante, gardé en mémoire pour les PDF
 * (chargé par CompanyLogoLoader, modifié dans Paramètres).
 */
let current: string | null = null;
const listeners = new Set<() => void>();

export function getCompanyLogo() {
  return current;
}
export function setCompanyLogo(dataUrl: string | null) {
  current = dataUrl;
  listeners.forEach((l) => l());
}
export function subscribeCompanyLogo(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Dessine le logo dans le rectangle (x, y, maxW, maxH) en gardant ses proportions.
 * align = 'right' : collé au bord droit du rectangle. Sans logo ou en cas d'erreur : ne fait rien.
 * Retourne la largeur dessinée (0 si rien).
 */
export function drawCompanyLogo(pdf: jsPDF, x: number, y: number, maxW: number, maxH: number, opts: { align?: 'left' | 'right'; background?: boolean } = {}): number {
  const logo = current;
  if (!logo) return 0;
  try {
    const p = pdf.getImageProperties(logo);
    const ratio = p.width / p.height || 1;
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    const left = opts.align === 'right' ? x + maxW - w : x;
    const top = y + (maxH - h) / 2;
    if (opts.background) {
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(left - 1.5, top - 1.5, w + 3, h + 3, 1.5, 1.5, 'F');
    }
    pdf.addImage(logo, p.fileType || 'PNG', left, top, w, h);
    return w;
  } catch {
    return 0;
  }
}

/** Réduit une image choisie par l'utilisateur (≤ 400 × 160 px, PNG). */
export function resizeLogoFile(file: File, maxW = 400, maxH = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Choisissez une image (PNG, JPG, SVG…)'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Image illisible'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}
