 import * as XLSX from 'xlsx';
 
 /**
  * Generate a sample Excel template for driver import
  */
export function generateDriversTemplate(): Blob {
    const headers = [
      'Nom Prénom',
      'Téléphone',
      'Type (VL/PL/SPL/TP)',
      'Type de contrat',
      'Horaire',
      'Service/Département',
      'Email'
    ];
  
    const sampleData = [
      ['DUPONT Jean', '06 12 34 56 78', 'SPL', 'CDI', 'Jour', 'Transport', 'jean.dupont@email.com'],
      ['MARTIN Pierre', '06 98 76 54 32', 'PL', 'CDI', 'Nuit', 'Livraison', 'pierre.martin@email.com'],
      ['DURAND Marie', '07 11 22 33 44', 'SPL', 'CDD', 'Jour', 'Transport', 'marie.durand@email.com'],
      ['BERNARD Lucas', '06 55 66 77 88', 'TP', 'CDI', 'Nuit', 'Transport', 'lucas.bernard@email.com'],
      ['PETIT Sophie', '06 44 33 22 11', 'VL', 'CDD', 'Jour', 'Logistique', ''],
    ];
  
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Nom Prénom
      { wch: 18 }, // Téléphone
      { wch: 20 }, // Type
      { wch: 15 }, // Type de contrat
      { wch: 12 }, // Horaire
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
    'Responsable de secteur',
    'Client',
    'Ligne (Origine - Destination)',
    'Titulaire / Conducteur',
    'Lundi',
    'Mardi',
    'Mercredi',
    'Jeudi',
    'Vendredi',
    'Samedi',
    'Dimanche soir',
    'ODM (Ordre de Mission)',
    'Horaire début',
    'Horaire fin',
  ];

  const sampleData = [
    ['Paul RESPONSABLE', 'Carrefour', 'Paris - Lyon', 'Jean DUPONT', 'Jean DUPONT', 'Jean DUPONT', '', 'Jean DUPONT', 'Jean DUPONT', '', '', 'Livraison urgente', '06h00', '14h00'],
    ['Marie CHEF', 'Leclerc', 'Marseille - Bordeaux', 'Pierre MARTIN', 'Pierre MARTIN', '', 'Pierre MARTIN', '', 'Pierre MARTIN', '', '', 'Palette fragile', '08h00', '18h00'],
    ['Paul RESPONSABLE', 'Auchan', 'Lille - Nantes', 'Marie DURAND', '', 'Marie DURAND', 'Marie DURAND', 'Marie DURAND', '', '', '', 'RDV Quai 5', '05h30', '15h00'],
    ['Jean MANAGER', 'Metro', 'Toulouse - Strasbourg', 'Lucas BERNARD', 'Lucas BERNARD', 'Lucas BERNARD', 'Lucas BERNARD', 'Lucas BERNARD', 'Lucas BERNARD', '', 'Lucas BERNARD', 'Frigo -18°C', '22h00', '08h00'],
    ['Marie CHEF', 'Intermarché', 'Lyon - Paris', 'Sophie PETIT', '', '', 'Sophie PETIT', 'Sophie PETIT', 'Sophie PETIT', 'Sophie PETIT', '', 'Retour à vide possible', '04h00', '12h00'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  ws['!cols'] = [
    { wch: 22 }, // Responsable de secteur
    { wch: 20 }, // Client
    { wch: 30 }, // Ligne
    { wch: 20 }, // Titulaire
    { wch: 15 }, // Lundi
    { wch: 15 }, // Mardi
    { wch: 15 }, // Mercredi
    { wch: 15 }, // Jeudi
    { wch: 15 }, // Vendredi
    { wch: 15 }, // Samedi
    { wch: 15 }, // Dimanche soir
    { wch: 50 }, // ODM
    { wch: 12 }, // Horaire début
    { wch: 12 }, // Horaire fin
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Planning');

  const instructionsData = [
    ['INSTRUCTIONS D\'UTILISATION'],
    [''],
    ['Colonnes obligatoires:'],
    ['- Client: Nom du client'],
    ['- Ligne: Format "Ville Origine - Ville Destination"'],
    [''],
    ['Colonnes recommandées:'],
    ['- Responsable de secteur: Pour filtrer les tractions par responsable'],
    ['- Titulaire: Nom du conducteur titulaire de la ligne'],
    [''],
    ['Colonnes optionnelles:'],
    ['- ODM: Ordre de mission ou notes'],
    ['- Horaire début: Heure de départ (format: 06h00 ou 06:00)'],
    ['- Horaire fin: Heure d\'arrivée (format: 14h00 ou 14:00)'],
    [''],
    ['Jours de la semaine (Lundi à Dimanche soir):'],
    ['- Indiquer le nom du conducteur affecté ce jour-là'],
    ['- Laisser vide si la ligne ne tourne pas ce jour'],
    ['- "Dimanche soir" correspond au départ du dimanche soir'],
    [''],
    ['Conseils:'],
    ['- Les conducteurs doivent être créés avant l\'import'],
    ['- Les clients seront automatiquement créés s\'ils n\'existent pas'],
    ['- Si aucun véhicule n\'est sélectionné, les missions apparaîtront dans "Non assigné"'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 70 }];
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

/**
 * Generate a sample Excel template for interim driver import
 */
export function generateInterimDriversTemplate(): Blob {
  const headers = [
    'Nom Prénom',
    'Téléphone',
    'Email',
    'Agence intérim',
    'Horaire',
    'Taux horaire (€)',
    'Coefficient',
    'Heures/jour',
    'Jours travaillés/mois',
    'Notes'
  ];

  const sampleData = [
    ['DUPONT Jean', '06 12 34 56 78', 'jean.dupont@email.com', 'Manpower', 'Jour', '12.50', '1.85', '10', '21', 'Chauffeur SPL expérimenté'],
    ['MARTIN Pierre', '06 98 76 54 32', '', 'Adecco', 'Nuit', '13.00', '1.90', '10', '21', 'Disponible week-end'],
    ['DURAND Marie', '07 11 22 33 44', 'marie.d@email.com', 'Randstad', 'Jour', '12.00', '1.80', '8', '20', ''],
    ['BERNARD Lucas', '06 55 66 77 88', '', 'Synergie', 'Nuit', '14.00', '2.00', '10', '22', 'Longue distance'],
    ['PETIT Sophie', '06 44 33 22 11', '', 'Manpower', 'Jour', '11.50', '1.75', '10', '21', 'Permis EC'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Nom Prénom
    { wch: 18 }, // Téléphone
    { wch: 25 }, // Email
    { wch: 15 }, // Agence
    { wch: 12 }, // Horaire
    { wch: 15 }, // Taux horaire
    { wch: 12 }, // Coefficient
    { wch: 12 }, // Heures/jour
    { wch: 18 }, // Jours travaillés
    { wch: 30 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Intérimaires');

  // Add instructions sheet
  const instructionsData = [
    ['MODÈLE D\'IMPORT INTÉRIMAIRES'],
    [''],
    ['Ce modèle est spécifique aux conducteurs intérimaires.'],
    [''],
    ['Colonnes obligatoires:'],
    ['- Nom: Nom de famille'],
    ['- Prénom: Prénom'],
    ['- Agence intérim: Nom de l\'agence (Manpower, Adecco, Randstad, etc.)'],
    [''],
    ['Colonnes recommandées:'],
    ['- Taux horaire: Taux horaire brut en euros (défaut: 12.50€)'],
    ['- Coefficient: Coefficient intérim (défaut: 1.85)'],
    ['- Heures/jour: Nombre d\'heures par jour (défaut: 10h)'],
    ['- Jours travaillés/mois: Nombre de jours travaillés par mois (défaut: 21)'],
    [''],
    ['Colonnes optionnelles:'],
    ['- Téléphone: Numéro de téléphone'],
    ['- Email: Adresse email'],
    ['- Type horaire: Jour, Nuit, ou Mixte (défaut: Jour)'],
    ['- Notes: Informations complémentaires'],
    [''],
    ['Calcul du coût:'],
    ['Coût mensuel = Taux horaire × Coefficient × Heures/jour × Jours travaillés'],
    ['Exemple: 12.50€ × 1.85 × 10h × 21j = 4 856.25€/mois'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Download interim drivers template
 */
export function downloadInterimDriversTemplate(): void {
  const blob = generateInterimDriversTemplate();
  downloadBlob(blob, 'modele_import_interimaires.xlsx');
}