 import * as XLSX from 'xlsx';
 import type { Driver } from '@/types';
 
 export interface ParsedDriverRow {
   name: string;
   firstName: string;
   lastName: string;
   phone: string;
   contractType: 'cdi' | 'cdd' | 'interim';
   agencyName?: string;
   position?: string;
   department?: string;
   email?: string;
 }
 
 export interface ExtendedParsedDriver extends Driver {
   isInterim: boolean;
   interimAgency: string;
   phone: string;
   contractType: 'cdi' | 'cdd' | 'interim';
 }
 
 /**
  * Parse driver name (handles "NOM Prénom" and "Prénom NOM" formats)
  */
 function parseDriverName(value: string): { firstName: string; lastName: string; fullName: string } {
   if (!value) return { firstName: '', lastName: '', fullName: '' };
   
   const cleaned = value.trim()
     .replace(/\s+/g, ' ')
     .replace(/\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g, '') // Remove phone numbers
     .trim();
   
   const parts = cleaned.split(' ').filter(p => p.length > 0);
   
   if (parts.length === 0) return { firstName: '', lastName: '', fullName: '' };
   if (parts.length === 1) return { firstName: parts[0], lastName: '', fullName: parts[0] };
   
   // Check if first part is all uppercase (likely last name)
   const firstIsUpper = parts[0] === parts[0].toUpperCase() && parts[0].length > 2;
   
   if (firstIsUpper) {
     // Format: NOM Prénom
     const lastName = parts[0];
     const firstName = parts.slice(1).join(' ');
     return { 
       firstName: titleCase(firstName), 
       lastName: titleCase(lastName), 
       fullName: `${titleCase(firstName)} ${titleCase(lastName)}`
     };
   } else {
     // Format: Prénom NOM or mixed
     const firstName = parts[0];
     const lastName = parts.slice(1).join(' ');
     return { 
       firstName: titleCase(firstName), 
       lastName: titleCase(lastName), 
       fullName: `${titleCase(firstName)} ${titleCase(lastName)}`
     };
   }
 }
 
 function titleCase(str: string): string {
   if (!str) return '';
   return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
 }
 
 /**
  * Extract phone number from text
  */
 function extractPhone(value: string): string {
   if (!value) return '';
   
   // Match French phone patterns
   const phoneMatch = value.match(/(\d{2}\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/);
   if (phoneMatch) {
     return phoneMatch[1].replace(/\s/g, ' ').trim();
   }
   
   // Match with dots or dashes
   const altMatch = value.match(/(\d{2}[.\-]\d{2}[.\-]\d{2}[.\-]\d{2}[.\-]\d{2})/);
   if (altMatch) {
     return altMatch[1].replace(/[.\-]/g, ' ');
   }
   
   return '';
 }
 
 /**
  * Determine contract type from text
  */
 function parseContractType(value: string): 'cdi' | 'cdd' | 'interim' {
   if (!value) return 'cdi';
   const lower = value.toLowerCase().trim();
   
   if (lower.includes('interim') || lower.includes('intérim') || lower.includes('interimaire') || lower.includes('intérimaire')) {
     return 'interim';
   }
   if (lower.includes('cdd')) {
     return 'cdd';
   }
   return 'cdi';
 }
 
 /**
  * Check if a row represents a driver/chauffeur
  */
 function isDriverRow(row: any[], headers: string[]): boolean {
   // Look for keywords in the row that indicate it's a driver
   const rowText = row.join(' ').toLowerCase();
   
   const driverKeywords = [
     'chauffeur', 'conducteur', 'routier', 'driver', 'spl', 'pl',
    'super poids lourd', 'poids lourd', 'livreur', 'super poids lourds',
    'poids lourds', 'chauffeurs', 'conducteurs'
   ];
   
   return driverKeywords.some(kw => rowText.includes(kw));
 }
 
/**
 * Check if text contains driver keywords
 */
function containsDriverKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  const keywords = [
    'chauffeur', 'conducteur', 'routier', 'driver', 'spl', 'pl',
    'super poids lourd', 'poids lourd', 'livreur', 'super poids lourds',
    'poids lourds'
  ];
  return keywords.some(kw => lower.includes(kw));
}

 /**
  * Parse the uploaded Excel file for driver data
  */
 export function parseDriversExcel(workbook: XLSX.WorkBook): ParsedDriverRow[] {
   const drivers: ParsedDriverRow[] = [];
   
   // Process all sheets
   for (const sheetName of workbook.SheetNames) {
     const sheet = workbook.Sheets[sheetName];
     const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
     
     if (rawData.length < 2) continue;
     
     // Find header row
     let headerRowIndex = -1;
     let headers: string[] = [];
     
     for (let i = 0; i < Math.min(20, rawData.length); i++) {
       const row = rawData[i];
       if (!row) continue;
       
       const rowText = row.map(c => String(c || '').toLowerCase()).join(' ');
       
       // Look for header indicators
       if (rowText.includes('nom') || rowText.includes('prénom') || rowText.includes('fonction') || 
           rowText.includes('poste') || rowText.includes('téléphone') || rowText.includes('contrat')) {
         headerRowIndex = i;
         headers = row.map(c => String(c || '').toLowerCase().trim());
         break;
       }
     }
     
     if (headerRowIndex === -1) continue;
     
     // Find relevant column indices
     const nameIdx = headers.findIndex(h => h === 'nom' || h.includes('nom complet'));
     const firstNameIdx = headers.findIndex(h => h === 'prénom' || h === 'prenom');
     const lastNameIdx = headers.findIndex(h => h === 'nom de famille' || (h === 'nom' && firstNameIdx >= 0));
     const phoneIdx = headers.findIndex(h => h.includes('téléphone') || h.includes('telephone') || h.includes('tel') || h.includes('portable') || h.includes('mobile'));
     const positionIdx = headers.findIndex(h => h.includes('fonction') || h.includes('poste') || h.includes('emploi') || h.includes('métier'));
     const contractIdx = headers.findIndex(h => h.includes('contrat') || h.includes('type'));
     const agencyIdx = headers.findIndex(h => h.includes('agence') || h.includes('interim') || h.includes('intérim'));
     const deptIdx = headers.findIndex(h => h.includes('département') || h.includes('departement') || h.includes('service') || h.includes('secteur'));
     const emailIdx = headers.findIndex(h => h.includes('email') || h.includes('mail') || h.includes('@'));
     
     console.log('Found columns:', { nameIdx, firstNameIdx, phoneIdx, positionIdx, contractIdx });
     
     // Process data rows
     for (let i = headerRowIndex + 1; i < rawData.length; i++) {
       const row = rawData[i];
       if (!row || row.length === 0) continue;
       
       // Skip empty rows
       const rowContent = row.filter(c => c && String(c).trim()).length;
       if (rowContent < 2) continue;
       
       // Check if this row is a driver (look for driver-related keywords in position/function)
       let position = positionIdx >= 0 ? String(row[positionIdx] || '').trim() : '';
       const rowText = row.join(' ').toLowerCase();
       
      // Only include if it's a driver/chauffeur - be more lenient
      const hasDriverKeyword = isDriverRow(row, headers);
      const positionHasKeyword = containsDriverKeyword(position);
      
      if (!hasDriverKeyword && !positionHasKeyword) continue;
       
       // Extract name
       let fullName = '';
       let firstName = '';
       let lastName = '';
       
       if (nameIdx >= 0 && row[nameIdx]) {
         const parsed = parseDriverName(String(row[nameIdx]));
         fullName = parsed.fullName;
         firstName = parsed.firstName;
         lastName = parsed.lastName;
       } else if (firstNameIdx >= 0 || lastNameIdx >= 0) {
         firstName = firstNameIdx >= 0 ? titleCase(String(row[firstNameIdx] || '').trim()) : '';
         lastName = lastNameIdx >= 0 ? titleCase(String(row[lastNameIdx] || '').trim()) : '';
         fullName = `${firstName} ${lastName}`.trim();
       }
       
       if (!fullName) continue;
       
       // Extract phone
       let phone = '';
       if (phoneIdx >= 0) {
         phone = extractPhone(String(row[phoneIdx] || ''));
       }
       // Also try to find phone in name column
       if (!phone && nameIdx >= 0) {
         phone = extractPhone(String(row[nameIdx] || ''));
       }
       
       // Determine contract type
       let contractType: 'cdi' | 'cdd' | 'interim' = 'cdi';
       if (contractIdx >= 0) {
         contractType = parseContractType(String(row[contractIdx] || ''));
       } else if (rowText.includes('interim') || rowText.includes('intérim')) {
         contractType = 'interim';
       }
       
       // Get agency name for interim
       let agencyName = '';
       if (agencyIdx >= 0) {
         agencyName = String(row[agencyIdx] || '').trim();
       }
       
       // Get department
       let department = '';
       if (deptIdx >= 0) {
         department = String(row[deptIdx] || '').trim();
       }
       
       // Get email
       let email = '';
       if (emailIdx >= 0) {
         email = String(row[emailIdx] || '').trim();
       }
       
       drivers.push({
         name: fullName,
         firstName,
         lastName,
         phone,
         contractType,
         agencyName,
         position,
         department,
         email,
       });
     }
   }
   
   // Remove duplicates by name
   const uniqueDrivers = drivers.reduce((acc, driver) => {
     const key = driver.name.toLowerCase();
     if (!acc.has(key)) {
       acc.set(key, driver);
     }
     return acc;
   }, new Map<string, ParsedDriverRow>());
   
   return Array.from(uniqueDrivers.values());
 }
 
/**
 * Parse Excel from URL (for auto-import)
 */
export async function parseDriversFromUrl(url: string): Promise<ParsedDriverRow[]> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    return parseDriversExcel(workbook);
  } catch (error) {
    console.error('Error fetching/parsing Excel from URL:', error);
    return [];
  }
}

 /**
  * Convert parsed rows to Driver objects ready for import
  */
 export function convertToDrivers(parsedDrivers: ParsedDriverRow[]): ExtendedParsedDriver[] {
   return parsedDrivers.map((parsed, index) => ({
     id: `imported_${Date.now()}_${index}`,
     name: parsed.name,
     firstName: parsed.firstName,
     lastName: parsed.lastName,
     baseSalary: parsed.contractType === 'interim' ? 0 : 2200,
     hourlyRate: 12.50,
     hoursPerDay: 10,
     patronalCharges: parsed.contractType === 'interim' ? 0 : 45,
     mealAllowance: 15.20,
     overnightAllowance: 45,
     workingDaysPerMonth: 21,
     sundayBonus: 0,
     nightBonus: 0,
     seniorityBonus: 0,
     isInterim: parsed.contractType === 'interim',
     interimAgency: parsed.agencyName || '',
     phone: parsed.phone,
     email: parsed.email || '',
     contractType: parsed.contractType,
   }));
 }