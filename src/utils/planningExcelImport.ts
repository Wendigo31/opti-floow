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
   recurring_days: number[]; // 0=Lun, 1=Mar, 2=Mer, 3=Jeu, 4=Ven, 5=Sam, 6=Dim
   day_drivers: Record<number, string>; // conducteur spécifique par jour
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
  * Parse the uploaded Excel file for planning data
  */
 export function parsePlanningExcel(workbook: XLSX.WorkBook): ParsedPlanningEntry[] {
   const sheetName = workbook.SheetNames[0];
   const sheet = workbook.Sheets[sheetName];
   
   // Convert to array of arrays to handle complex headers
   const rawData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
   
   if (rawData.length < 3) return [];
   
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
   
   if (headerRowIndex === -1) {
     console.error('Could not find header row');
     return [];
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
   
    console.log('Column indices:', {
      clientIdx,
      ligneIdx,
      titulaireIdx,
      odmIdx,
      startTimeIdx,
      endTimeIdx,
     sectorManagerIdx,
      dayColumns: dayColumns.map(d => ({ col: d.colIdx, day: d.dayIdx })),
    });
   
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
     if (ligne.toLowerCase().includes('information')) continue;
     
     // Parse addresses from ligne
     const { origin, destination } = parseAddresses(ligne);
     
     // Determine which days are active and who drives each day
      // Always import the full week (Mon=0 to Sun=6)
      const recurring_days: number[] = [0, 1, 2, 3, 4, 5, 6];
     const day_drivers: Record<number, string> = {};
     
       // Parse driver names from Excel day columns (only for assignment, not for day creation)
      dayColumns.forEach(({ colIdx, dayIdx }) => {
        const cellValue = (row[colIdx] || '').toString();
         
         // Extract driver name if present (skip empty cells and markers like "X")
        const driverForDay = extractDriverFromCell(cellValue);
         if (driverForDay && driverForDay.length > 1 && driverForDay.toLowerCase() !== 'x') {
          day_drivers[dayIdx] = driverForDay;
        }
      });
     
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
         day_drivers,
       sector_manager: sectorManager || null,
       });
     }
   }
   
   return entries;
 }
 
 /**
  * Convert parsed entries to TourInput format for the planning system
  */
 export function convertToTourInputs(
   parsedEntries: ParsedPlanningEntry[],
   clientMap: Map<string, string>, // client name -> client id
   driverMap: Map<string, string>, // driver name -> driver id
  defaultVehicleId: string | null,
   startDate: string
): (Partial<TourInput> & { sector_manager?: string | null; day_driver_ids?: Record<number, string> })[] {
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
     
     // Try to match driver
     let driver_id: string | null = null;
     if (entry.driver_name) {
       const driverLower = entry.driver_name.toLowerCase();
       for (const [name, id] of driverMap.entries()) {
         if (name.toLowerCase().includes(driverLower) || driverLower.includes(name.toLowerCase())) {
           driver_id = id;
           break;
         }
       }
     }
     
    // Match drivers per day
    const day_driver_ids: Record<number, string> = {};
    for (const [dayIdx, driverName] of Object.entries(entry.day_drivers)) {
      if (!driverName) continue;
      const driverLower = driverName.toLowerCase();
      for (const [name, id] of driverMap.entries()) {
        if (name.toLowerCase().includes(driverLower) || driverLower.includes(name.toLowerCase())) {
          day_driver_ids[Number(dayIdx)] = id;
          break;
        }
      }
    }

     return {
       tour_name: entry.ligne || entry.client || 'Tournée importée',
      vehicle_id: defaultVehicleId || undefined,
       client_id,
       driver_id,
       recurring_days: entry.recurring_days.length > 0 ? entry.recurring_days : [0, 1, 2, 3, 4],
       is_all_year: false,
       start_date: startDate,
       start_time: entry.start_time,
       end_time: entry.end_time,
       origin_address: entry.origin_address || null,
       destination_address: entry.destination_address || null,
       mission_order: entry.mission_order || null,
      sector_manager: entry.sector_manager,
      day_driver_ids: Object.keys(day_driver_ids).length > 0 ? day_driver_ids : undefined,
     };
   });
 }