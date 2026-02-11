 import * as XLSX from 'xlsx';
 import type { TourInput } from '@/types/planning';
 
 export interface ExcelPlanningRow {
   client?: string;
   ligne?: string;
   titulaire?: string;
   odm?: string;
   horaire_debut?: string;
   horaire_fin?: string;
   // Jours de la semaine (true/false ou nom du conducteur)
   dimanche?: string;
   lundi?: string;
   mardi?: string;
   mercredi?: string;
   jeudi?: string;
   vendredi?: string;
   samedi?: string;
 }
 
 export interface ParsedPlanningEntry {
   client: string;
   ligne: string;
   origin_address: string;
   destination_address: string;
   driver_name: string;
   mission_order: string;
   start_time: string | null;
   end_time: string | null;
  recurring_days: number[]; // 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam (Dim non importé)
  /** Raw text in each day cell (driver name OR free text) per day index */
  day_cells: Record<number, string>;
  sector_manager: string | null; // Responsable de secteur
 }

/**
 * Map an Excel header to internal day index.
 * Internal convention: 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
 */
function getDayIdxFromHeader(header: string): number | null {
  const h = (header || '').toString().toLowerCase().trim();
  if (!h) return null;

  // Full FR names (our template)
  if (h.includes('lundi')) return 0;
  if (h.includes('mardi')) return 1;
  if (h.includes('mercredi')) return 2;
  if (h.includes('jeudi')) return 3;
  if (h.includes('vendredi')) return 4;
  if (h.includes('samedi')) return 5;
  if (h.includes('dimanche')) return 6;
  if (h.includes('dim') && h.includes('soir')) return 6;

  // Abbreviations FR
  if (/\blun\b/.test(h)) return 0;
  if (/\bmar\b/.test(h)) return 1;
  if (/\bmer\b/.test(h)) return 2;
  if (/\bjeu\b/.test(h)) return 3;
  if (/\bven\b/.test(h)) return 4;
  if (/\bsam\b/.test(h)) return 5;
  if (/\bdim\b/.test(h)) return 6;

  // Date-like headers: "Sun 18 Jan 26", "Mon 19 Jan 26", etc.
  if (/\bsun\b/.test(h)) return 6;
  if (/\bmon\b/.test(h)) return 0;
  if (/\btue\b/.test(h)) return 1;
  if (/\bwed\b/.test(h)) return 2;
  if (/\bthu\b/.test(h)) return 3;
  if (/\bfri\b/.test(h)) return 4;
  if (/\bsat\b/.test(h)) return 5;

  return null;
}
 
 /**
  * Parse addresses from "VILLE1 - VILLE2" or "VILLE1 / VILLE2" format
  */
 function parseAddresses(ligne: string): { origin: string; destination: string } {
   // Remove links/URLs in brackets
   const cleanLigne = ligne.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
   
   // Try different separators
   const separators = [' - ', ' / ', ' => ', ' -> '];
   for (const sep of separators) {
     if (cleanLigne.includes(sep)) {
       const parts = cleanLigne.split(sep).map(p => p.trim()).filter(p => p);
       if (parts.length >= 2) {
         return {
           origin: parts[0],
           destination: parts[parts.length - 1],
         };
       }
     }
   }
   
   return { origin: cleanLigne, destination: '' };
 }
 
 /**
  * Parse time from various formats (22h00, 22:00, etc.)
  */
 function parseTime(timeStr: string | undefined): string | null {
   if (!timeStr) return null;
   
   // Clean the string
   const clean = timeStr.trim().toLowerCase();
   
   // Match patterns like "22h00", "22H30", "22:00"
   const match = clean.match(/(\d{1,2})[h:](\d{2})/i);
   if (match) {
     const hours = match[1].padStart(2, '0');
     const mins = match[2];
     return `${hours}:${mins}`;
   }
   
   // Simple hour match like "22h"
   const simpleMatch = clean.match(/(\d{1,2})h/i);
   if (simpleMatch) {
     return `${simpleMatch[1].padStart(2, '0')}:00`;
   }
   
   return null;
 }
 
 /**
  * Check if a day cell indicates the driver works that day
  */
 function isDayActive(cellValue: string | undefined): boolean {
   if (!cellValue) return false;
   const lower = cellValue.toLowerCase().trim();
   
   // Inactive indicators
   const inactivePatterns = ['ne tourne pas', 'arret', 'arrêt', 'ferie', 'férié', 'repos', '-', ''];
   if (inactivePatterns.some(p => lower.includes(p) || lower === p)) {
     return false;
   }
   
   // If there's text (usually driver name), it's active
   return cellValue.trim().length > 0;
 }
 
 /**
  * Extract driver name from day cell (can contain driver name + phone)
  */
 function extractDriverFromCell(cellValue: string | undefined): string {
   if (!cellValue) return '';
   
   // Remove phone numbers
   let clean = cellValue.replace(/\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g, '').trim();
   
   // Remove "CHAUFFEUR BRIEFE" type markers
   clean = clean.replace(/chauffeur\s+brie?f[eé]/gi, '').trim();
   
   // Take first name if there are multiple
   const parts = clean.split('/');
   if (parts.length > 0) {
     clean = parts[0].trim();
   }
   
   // Remove trailing numbers or special chars
   clean = clean.replace(/\s*\d+\s*$/, '').trim();
   
   return clean;
 }

/**
 * Extract user-entered day cell text.
 * Keep it as-is as much as possible (these cells can contain notes / placeholders).
 */
function extractDayCellText(cellValue: string | undefined): string {
  if (!cellValue) return '';
  let clean = cellValue.toString().trim();
  // Strip phone numbers only
  clean = clean.replace(/\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g, '').trim();
  // Common marker
  clean = clean.replace(/chauffeur\s+brie?f[eé]/gi, '').trim();
  return clean;
}
 
 /**
  * Parse the uploaded Excel file for planning data
  */
 export function parsePlanningExcel(workbook: XLSX.WorkBook): ParsedPlanningEntry[] {
   const sheetName = workbook.SheetNames[0];
   const sheet = workbook.Sheets[sheetName];
   
   // Convert to array of arrays to handle complex headers
   const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
   
   if (rawData.length < 2) return [];
   
   // Find header row (usually row 8 in this format, index 7)
   let headerRowIndex = -1;
   for (let i = 0; i < Math.min(15, rawData.length); i++) {
     const row = rawData[i];
     if (row && row.some(cell => 
       cell && typeof cell === 'string' && 
       (cell.toLowerCase().includes('client') || cell.toLowerCase().includes('ligne'))
     )) {
       headerRowIndex = i;
       break;
     }
   }
   
   // If no header row found, assume first row is header
   if (headerRowIndex === -1) {
     headerRowIndex = 0;
   }
   
   const headers = rawData[headerRowIndex].map(h => (h || '').toString().toLowerCase().trim());
   
   // Find column indices
   const clientIdx = headers.findIndex(h => h === 'client' || h.includes('client'));
   const ligneIdx = headers.findIndex(h => h === 'ligne' && !h.includes('chauffeur'));
   const titulaireIdx = headers.findIndex(h => h.includes('titulaire') || h.includes('chauffeur'));
   const odmIdx = headers.findIndex(h => h.includes('commentaire') || h.includes('odm'));
  const startTimeIdx = headers.findIndex(h => 
    (h.includes('horaire') && h.includes('début')) || 
    (h.includes('horaire') && h.includes('debut')) ||
    h === 'horaire début' ||
    h === 'horaire debut' ||
    h.includes('heure début') ||
    h.includes('heure debut')
  );
  const endTimeIdx = headers.findIndex(h => 
    (h.includes('horaire') && h.includes('fin')) ||
    h === 'horaire fin' ||
    h.includes('heure fin') ||
    h.includes('heure arrivée') ||
    h.includes('heure arrivee')
  );

  const sectorManagerIdx = headers.findIndex(h => 
    h.includes('responsable') || h.includes('secteur') || h.includes('manager')
  );
   
   // Find day columns (robust: supports full names, abbreviations and date-like headers)
   const dayColumns: Array<{ colIdx: number; dayIdx: number }> = [];
   headers.forEach((h, idx) => {
     const dayIdx = getDayIdxFromHeader(h);
     if (dayIdx !== null) {
       dayColumns.push({ colIdx: idx, dayIdx });
     }
   });
   
   // Debug log only in dev
   if (import.meta.env.DEV) {
     console.log('Planning Excel columns:', { clientIdx, ligneIdx, titulaireIdx, odmIdx, dayColumns: dayColumns.length });
   }
   
   const entries: ParsedPlanningEntry[] = [];
   
   // Process data rows
   for (let i = headerRowIndex + 1; i < rawData.length; i++) {
     const row = rawData[i];
     if (!row || row.length === 0) continue;
     
     const client = clientIdx >= 0 ? (row[clientIdx] || '').toString().trim() : '';
     const ligne = ligneIdx >= 0 ? (row[ligneIdx] || '').toString().trim() : '';
     const titulaire = titulaireIdx >= 0 ? (row[titulaireIdx] || '').toString().trim() : '';
     const odm = odmIdx >= 0 ? (row[odmIdx] || '').toString().trim() : '';
     const startTime = startTimeIdx >= 0 ? (row[startTimeIdx] || '').toString() : '';
     const endTime = endTimeIdx >= 0 ? (row[endTimeIdx] || '').toString() : '';
    const sectorManager = sectorManagerIdx >= 0 ? (row[sectorManagerIdx] || '').toString().trim() : '';
     
     // Skip empty or header-like rows
     if (!client && !ligne) continue;
     // Skip rows that look like section headers
     const ligneLower = ligne.toLowerCase();
     if (ligneLower.includes('information') || ligneLower.includes('total') || ligneLower.includes('sous-total')) continue;
     
     // Parse addresses from ligne
     const { origin, destination } = parseAddresses(ligne);
     
     // Determine which days are active and who drives each day
     // Always import Mon..Sat. Sunday is intentionally excluded.
     const recurring_days: number[] = [0, 1, 2, 3, 4, 5, 6];
    const day_cells: Record<number, string> = {};
     
      // Parse raw day cell text from Excel day columns (notes/placeholders)
      for (const { colIdx, dayIdx } of dayColumns) {
        const raw = row[colIdx];
        if (!raw) continue;
        const v = extractDayCellText(raw.toString());
         if (!v) continue;
         // "X" means the line runs that day but no specific info — skip it (leave cell empty)
         if (v.toLowerCase() === 'x') {
           continue;
         }
         day_cells[dayIdx] = v;
     }
     
     // Only add if we have meaningful data
     if (client || ligne || odm) {
       entries.push({
         client,
         ligne,
         origin_address: origin,
         destination_address: destination,
         driver_name: extractDriverFromCell(titulaire),
         mission_order: odm,
         start_time: parseTime(startTime),
         end_time: parseTime(endTime),
         recurring_days,
        day_cells,
        sector_manager: sectorManager || null,
       });
     }
   }
   
   return entries;
 }
 
/**
 * Normalize a name for fuzzy matching: lowercase, strip annotations like (Vl), (Polyvalent), etc.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // Remove parenthetical annotations
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract first/last name parts from a full name string.
 * Handles formats like "Toufaha (Vl) Abdallah" -> ["toufaha", "abdallah"]
 */
function extractNameParts(name: string): string[] {
  return normalizeName(name).split(' ').filter(p => p.length > 0);
}

/**
 * Try to match a search name against a driver map entry.
 * Returns true if the names match (fuzzy).
 */
function fuzzyDriverMatch(
  searchName: string,
  driverName: string,
  driverFirstName?: string,
  driverLastName?: string,
): boolean {
  return fuzzyDriverMatchPublic(searchName, driverName, driverFirstName, driverLastName);
}

/**
 * Public version of fuzzyDriverMatch for use in other modules.
 */
export function fuzzyDriverMatchPublic(
  searchName: string,
  driverName: string,
  driverFirstName?: string,
  driverLastName?: string,
): boolean {
  const searchNorm = normalizeName(searchName);
  const driverNorm = normalizeName(driverName);
  const searchParts = searchNorm.split(' ').filter(p => p.length > 0);

  // Exact normalized match
  if (searchNorm === driverNorm) return true;

  // Substring match (either direction)
  if (driverNorm.includes(searchNorm) || searchNorm.includes(driverNorm)) return true;

  // Use provided firstName/lastName if available
  const fn = driverFirstName ? normalizeName(driverFirstName) : '';
  const ln = driverLastName ? normalizeName(driverLastName) : '';

  // If no separate first/last, extract from full name
  const driverParts = extractNameParts(driverName);
  const effectiveFirst = fn || (driverParts.length > 0 ? driverParts[0] : '');
  const effectiveLast = ln || (driverParts.length > 1 ? driverParts[driverParts.length - 1] : '');

  // Last name only match
  if (effectiveLast && effectiveLast === searchNorm) return true;

  // First name only match (if long enough)
  if (effectiveFirst && effectiveFirst === searchNorm && effectiveFirst.length >= 3) return true;

  // Cross-match parts (handles reversed order: "DUPONT JEAN" vs "Jean Dupont")
  if (searchParts.length >= 2 && driverParts.length >= 2) {
    const matchCount = searchParts.filter(sp =>
      driverParts.some(dp => dp.includes(sp) || sp.includes(dp))
    ).length;
    if (matchCount >= 2) return true;
  }

  // Partial last name match
  if (effectiveLast && searchNorm.length >= 3 && effectiveLast.includes(searchNorm)) return true;

  return false;
}

/**
 * Convert parsed entries to TourInput format for the planning system
 */
export function convertToTourInputs(
  parsedEntries: ParsedPlanningEntry[],
  clientMap: Map<string, string>, // client name -> client id
 driverMap: Map<string, { id: string; firstName?: string; lastName?: string }>, // driver name -> driver data with firstName/lastName
 defaultVehicleId: string | null,
  startDate: string
): (Partial<TourInput> & {
 sector_manager?: string | null;
 day_notes?: Record<number, string>;
})[] {
   return parsedEntries.map(entry => {
     // Try to match client
     let client_id: string | null = null;
     if (entry.client) {
       const clientLower = entry.client.toLowerCase();
       for (const [name, id] of clientMap.entries()) {
         if (name.toLowerCase().includes(clientLower) || clientLower.includes(name.toLowerCase())) {
           client_id = id;
           break;
         }
       }
     }
     
     // Try to match driver using improved fuzzy matching
      let driver_id: string | null = null;
      if (entry.driver_name) {
       for (const [name, driverData] of driverMap.entries()) {
         if (fuzzyDriverMatch(entry.driver_name, name, driverData.firstName, driverData.lastName)) {
           driver_id = driverData.id;
           break;
         }
       }
      }
     
      // Day cells -> notes per day AND per-day driver matching
      const day_notes: Record<number, string> = {};
      const day_driver_ids: Record<number, string> = {};
      for (const [dayIdxRaw, text] of Object.entries(entry.day_cells || {})) {
        const dayIdx = Number(dayIdxRaw);
        if (!Number.isInteger(dayIdx) || dayIdx < 0 || dayIdx > 6) continue;
        const v = (text || '').toString().trim();
        if (!v) continue;
        day_notes[dayIdx] = v;

         // Try to match day cell text to a known driver using improved fuzzy matching
         for (const [name, driverData] of driverMap.entries()) {
           if (fuzzyDriverMatch(v, name, driverData.firstName, driverData.lastName)) {
             day_driver_ids[dayIdx] = driverData.id;
             break;
           }
         }
      }

      return {
        tour_name: entry.ligne || entry.client || 'Tournée importée',
        vehicle_id: defaultVehicleId || undefined,
        client_id,
        driver_id,
        recurring_days: entry.recurring_days.length > 0 ? entry.recurring_days : [0, 1, 2, 3, 4, 5, 6],
        is_all_year: false,
        start_date: startDate,
        start_time: entry.start_time,
        end_time: entry.end_time,
        origin_address: entry.origin_address || null,
        destination_address: entry.destination_address || null,
        mission_order: entry.mission_order || null,
        sector_manager: entry.sector_manager,
        day_notes: Object.keys(day_notes).length > 0 ? day_notes : undefined,
        day_driver_ids: Object.keys(day_driver_ids).length > 0 ? day_driver_ids : undefined,
      };
   });
 }