import { describe, it, expect } from 'vitest';
import './jspdfFrenchSpaces';
import jsPDF from 'jspdf';

describe('textes des PDF', () => {
  it('remplace les espaces insécables et la flèche, illisibles avec les polices standard', () => {
    const doc = new jsPDF();
    const montant = (1020).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    expect(String(doc.splitTextToSize(`${montant} € Toulouse → Bordeaux`, 200))).toBe('1 020,00 € Toulouse -> Bordeaux');
  });
});
