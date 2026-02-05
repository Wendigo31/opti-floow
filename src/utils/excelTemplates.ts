 import * as XLSX from 'xlsx';
 
 /**
  * Generate a sample Excel template for driver import
  */
 export function generateDriversTemplate(): Blob {
   const headers = [
     'Nom',
     'Prénom', 
     'Téléphone',
     'Fonction',
     'Type de contrat',
     'Agence intérim',
     'Service/Département',
     'Email'
   ];
 
   const sampleData = [
     ['DUPONT', 'Jean', '06 12 34 56 78', 'Chauffeur SPL', 'CDI', '', 'Transport', 'jean.dupont@email.com'],
     ['MARTIN', 'Pierre', '06 98 76 54 32', 'Conducteur Poids Lourd', 'CDI', '', 'Livraison', 'pierre.martin@email.com'],
     ['DURAND', 'Marie', '07 11 22 33 44', 'Chauffeur SPL', 'CDD', '', 'Transport', 'marie.durand@email.com'],
     ['BERNARD', 'Lucas', '06 55 66 77 88', 'Chauffeur Routier', 'Intérim', 'Manpower', 'Transport', 'lucas.bernard@email.com'],
     ['PETIT', 'Sophie', '06 44 33 22 11', 'Conducteur Super Poids Lourd', 'Intérim', 'Adecco', 'Logistique', ''],
   ];
 
   const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
   
   // Set column widths
   ws['!cols'] = [
     { wch: 15 }, // Nom
     { wch: 15 }, // Prénom
     { wch: 18 }, // Téléphone
     { wch: 25 }, // Fonction
     { wch: 15 }, // Type de contrat
     { wch: 15 }, // Agence intérim
     { wch: 20 }, // Service
     { wch: 30 }, // Email
   ];
 
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, 'Conducteurs');
 
   const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
   return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 }
 
 /**
  * Generate a sample Excel template for planning import
  */
 export function generatePlanningTemplate(): Blob {
   const headers = [
     'Client',
     'Ligne (Origine - Destination)',
     'Titulaire / Conducteur',
     'Commentaire / ODM',
     'Lundi',
     'Mardi',
     'Mercredi',
     'Jeudi',
     'Vendredi',
     'Samedi',
     'Dimanche'
   ];
 
   const sampleData = [
     ['Carrefour', 'Paris - Lyon', 'Jean DUPONT', 'Livraison urgente - Départ 6h00', 'X', 'X', '', 'X', 'X', '', ''],
     ['Leclerc', 'Marseille - Bordeaux', 'Pierre MARTIN', 'Palette fragile', 'X', '', 'X', '', 'X', '', ''],
     ['Auchan', 'Lille - Nantes', 'Marie DURAND', 'RDV 8h00 - Quai 5', '', 'X', 'X', 'X', '', '', ''],
     ['Metro', 'Toulouse - Strasbourg', 'Lucas BERNARD', 'Frigo -18°C', 'X', 'X', 'X', 'X', 'X', '', ''],
     ['Intermarché', 'Lyon - Paris', 'Sophie PETIT', 'Retour à vide possible', '', '', 'X', 'X', 'X', 'X', ''],
   ];
 
   const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
   
   // Set column widths
   ws['!cols'] = [
     { wch: 20 }, // Client
     { wch: 30 }, // Ligne
     { wch: 20 }, // Titulaire
     { wch: 35 }, // Commentaire
     { wch: 8 },  // Lundi
     { wch: 8 },  // Mardi
     { wch: 10 }, // Mercredi
     { wch: 8 },  // Jeudi
     { wch: 10 }, // Vendredi
     { wch: 8 },  // Samedi
     { wch: 10 }, // Dimanche
   ];
 
   const wb = XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb, ws, 'Planning');
 
   // Add instructions sheet
   const instructionsData = [
     ['INSTRUCTIONS D\'UTILISATION'],
     [''],
     ['Colonnes obligatoires:'],
     ['- Client: Nom du client'],
     ['- Ligne: Format "Ville Origine - Ville Destination"'],
     ['- Titulaire: Nom du conducteur (doit correspondre à un conducteur existant)'],
     [''],
     ['Colonnes optionnelles:'],
     ['- Commentaire / ODM: Ordre de mission ou notes'],
     ['- Jours de la semaine: Mettre "X" pour indiquer les jours de récurrence'],
     [''],
     ['Conseils:'],
     ['- Ajoutez les heures dans le commentaire (ex: "Départ 6h00")'],
     ['- Les conducteurs doivent être créés avant l\'import du planning'],
     ['- Les clients existants seront automatiquement associés'],
   ];
 
   const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
   wsInstructions['!cols'] = [{ wch: 60 }];
   XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');
 
   const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
   return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
 }
 
 /**
  * Download a blob as a file
  */
 export function downloadBlob(blob: Blob, filename: string): void {
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url;
   a.download = filename;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
 }
 
 /**
  * Download drivers template
  */
 export function downloadDriversTemplate(): void {
   const blob = generateDriversTemplate();
   downloadBlob(blob, 'modele_import_conducteurs.xlsx');
 }
 
 /**
  * Download planning template
  */
 export function downloadPlanningTemplate(): void {
   const blob = generatePlanningTemplate();
   downloadBlob(blob, 'modele_import_planning.xlsx');
 }