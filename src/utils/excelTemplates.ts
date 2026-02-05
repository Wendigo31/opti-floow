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

/**
 * Generate a sample Excel template for client import
 */
export function generateClientsTemplate(): Blob {
  const headers = [
    'Nom',
    'Société',
    'Email',
    'Téléphone',
    'Adresse',
    'Ville',
    'Code postal',
    'SIRET',
    'Notes'
  ];

  const sampleData = [
    ['Carrefour France', 'Carrefour', 'contact@carrefour.fr', '01 23 45 67 89', '1 Avenue de France', 'Paris', '75001', '123 456 789 00012', 'Client régulier'],
    ['Leclerc Distribution', 'E.Leclerc', 'logistique@leclerc.fr', '02 34 56 78 90', '10 Rue du Commerce', 'Lyon', '69001', '234 567 890 00023', 'Livraisons hebdomadaires'],
    ['Auchan Retail', 'Auchan', 'transport@auchan.fr', '03 45 67 89 01', '5 Boulevard Central', 'Marseille', '13001', '345 678 901 00034', ''],
    ['Metro Cash & Carry', 'Metro', 'expedition@metro.fr', '04 56 78 90 12', '20 Zone Industrielle', 'Toulouse', '31000', '456 789 012 00045', 'Palettes uniquement'],
    ['Intermarché ITM', 'Intermarché', 'livraisons@itm.fr', '05 67 89 01 23', '8 Rue des Entrepôts', 'Bordeaux', '33000', '', 'Horaires stricts'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Nom
    { wch: 20 }, // Société
    { wch: 30 }, // Email
    { wch: 18 }, // Téléphone
    { wch: 30 }, // Adresse
    { wch: 15 }, // Ville
    { wch: 12 }, // Code postal
    { wch: 20 }, // SIRET
    { wch: 30 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');

  // Add instructions sheet
  const instructionsData = [
    ['INSTRUCTIONS D\'IMPORT DES CLIENTS'],
    [''],
    ['Colonnes obligatoires:'],
    ['- Nom: Nom du client ou du contact principal'],
    [''],
    ['Colonnes optionnelles:'],
    ['- Société: Nom de l\'entreprise'],
    ['- Email: Adresse email de contact'],
    ['- Téléphone: Numéro de téléphone'],
    ['- Adresse: Adresse postale'],
    ['- Ville: Ville'],
    ['- Code postal: Code postal'],
    ['- SIRET: Numéro SIRET (14 chiffres)'],
    ['- Notes: Informations complémentaires'],
    [''],
    ['Conseils:'],
    ['- Vérifiez les doublons avant l\'import'],
    ['- Les clients existants ne seront pas écrasés'],
    ['- Vous pouvez ajouter des adresses supplémentaires après l\'import'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download clients template
 */
export function downloadClientsTemplate(): void {
  const blob = generateClientsTemplate();
  downloadBlob(blob, 'modele_import_clients.xlsx');
}