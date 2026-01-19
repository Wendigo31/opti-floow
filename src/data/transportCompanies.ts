// Pre-registered transport company addresses for quick selection
export interface TransportCompanyAddress {
  id: string;
  company: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  lat: number;
  lon: number;
  category: 'express' | 'messagerie' | 'logistique' | 'postale' | 'pic' | 'pfc' | 'ceva' | 'gefco' | 'mta' | 'besson';
}

export const TRANSPORT_COMPANIES: TransportCompanyAddress[] = [
  // =====================================================
  // PIC LA POSTE (Plateforme Industrielle Courrier)
  // =====================================================
  { id: 'pic-paris-wissous', company: 'PIC La Poste', name: 'PIC Paris Sud', address: 'Avenue de la Baltique', city: 'Wissous', postalCode: '91320', lat: 48.7333, lon: 2.3167, category: 'pic' },
  { id: 'pic-creil', company: 'PIC La Poste', name: 'PIC Creil Oise', address: '353 Avenue du Tremblay', city: 'Creil', postalCode: '60100', lat: 49.2500, lon: 2.4833, category: 'pic' },
  { id: 'pic-arras', company: 'PIC La Poste', name: 'PIC Arras', address: '22 Rue du Dépôt', city: 'Arras', postalCode: '62000', lat: 50.2833, lon: 2.7833, category: 'pic' },
  { id: 'pic-nantes', company: 'PIC La Poste', name: 'PIC Nantes', address: '3 Rue de Solay', city: 'Orvault', postalCode: '44700', lat: 47.2667, lon: -1.6167, category: 'pic' },
  { id: 'pic-amiens', company: 'PIC La Poste', name: 'PIC Amiens', address: '151 Rue Dejean', city: 'Amiens', postalCode: '80000', lat: 49.8833, lon: 2.2833, category: 'pic' },
  { id: 'pic-toulouse', company: 'PIC La Poste', name: 'PIC Toulouse', address: '27 Chemin de Bordeblanche', city: 'Toulouse', postalCode: '31100', lat: 43.6000, lon: 1.4333, category: 'pic' },
  { id: 'pic-mulhouse', company: 'PIC La Poste', name: 'PIC Mulhouse', address: '33 Rue François Donat Blumstein', city: 'Mulhouse', postalCode: '68100', lat: 47.7500, lon: 7.3333, category: 'pic' },
  { id: 'pic-clermont', company: 'PIC La Poste', name: 'PIC Clermont-Ferrand', address: 'Rue de Milan', city: 'Lempdes', postalCode: '63370', lat: 45.7667, lon: 3.2000, category: 'pic' },
  { id: 'pic-bordeaux', company: 'PIC La Poste', name: 'PIC Bordeaux', address: 'Avenue de l\'Aérodrome', city: 'Cestas', postalCode: '33112', lat: 44.7833, lon: -0.7000, category: 'pic' },
  { id: 'pic-lyon', company: 'PIC La Poste', name: 'PIC Lyon', address: '52 Rue Jean Zay', city: 'Saint-Priest', postalCode: '69800', lat: 45.7000, lon: 4.9500, category: 'pic' },
  { id: 'pic-lille', company: 'PIC La Poste', name: 'PIC Lille', address: 'Zone Industrielle', city: 'Lesquin', postalCode: '59810', lat: 50.5667, lon: 3.1000, category: 'pic' },
  { id: 'pic-marseille', company: 'PIC La Poste', name: 'PIC Marseille', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'pic' },
  { id: 'pic-rennes', company: 'PIC La Poste', name: 'PIC Rennes', address: 'ZI Ouest', city: 'Rennes', postalCode: '35000', lat: 48.1167, lon: -1.6833, category: 'pic' },
  { id: 'pic-strasbourg', company: 'PIC La Poste', name: 'PIC Strasbourg', address: 'Rue du Rhin', city: 'Strasbourg', postalCode: '67000', lat: 48.5833, lon: 7.7500, category: 'pic' },
  { id: 'pic-nice', company: 'PIC La Poste', name: 'PIC Nice', address: 'Zone Logistique', city: 'Nice', postalCode: '06000', lat: 43.7000, lon: 7.2500, category: 'pic' },
  { id: 'pic-montpellier', company: 'PIC La Poste', name: 'PIC Montpellier', address: 'Rue de la Lironde', city: 'Montpellier', postalCode: '34000', lat: 43.6000, lon: 3.8833, category: 'pic' },
  { id: 'pic-nancy', company: 'PIC La Poste', name: 'PIC Nancy', address: 'ZI de Heillecourt', city: 'Nancy', postalCode: '54000', lat: 48.6833, lon: 6.1833, category: 'pic' },
  { id: 'pic-rouen', company: 'PIC La Poste', name: 'PIC Rouen', address: 'Rue Vincent Auriol', city: 'Sotteville-lès-Rouen', postalCode: '76300', lat: 49.4167, lon: 1.0833, category: 'pic' },
  { id: 'pic-tours', company: 'PIC La Poste', name: 'PIC Tours', address: 'ZI de la Vrillonnerie', city: 'Tours', postalCode: '37000', lat: 47.3833, lon: 0.6833, category: 'pic' },
  { id: 'pic-dijon', company: 'PIC La Poste', name: 'PIC Dijon', address: 'Zone Industrielle', city: 'Dijon', postalCode: '21000', lat: 47.3167, lon: 5.0167, category: 'pic' },

  // =====================================================
  // PFC LA POSTE (Plateforme Colis / Colissimo)
  // =====================================================
  { id: 'pfc-idf-sud', company: 'PFC La Poste', name: 'PFC Île-de-France Sud', address: 'Zone Logistique', city: 'Montereau-sur-le-Jard', postalCode: '77950', lat: 48.5167, lon: 2.7000, category: 'pfc' },
  { id: 'pfc-idf-nord', company: 'PFC La Poste', name: 'PFC Île-de-France Nord', address: 'Zone Logistique', city: 'Le Thillay', postalCode: '95500', lat: 49.0000, lon: 2.4667, category: 'pfc' },
  { id: 'pfc-normandie', company: 'PFC La Poste', name: 'PFC Normandie', address: 'Zone Logistique', city: 'Grand-Couronne', postalCode: '76530', lat: 49.3667, lon: 0.9833, category: 'pfc' },
  { id: 'pfc-hauts-france', company: 'PFC La Poste', name: 'PFC Hauts-de-France', address: 'Zone Industrielle', city: 'Douvrin', postalCode: '62138', lat: 50.5000, lon: 2.8333, category: 'pfc' },
  { id: 'pfc-cote-azur', company: 'PFC La Poste', name: 'PFC Côte d\'Azur', address: 'Zone Logistique', city: 'Les Arcs-sur-Argens', postalCode: '83460', lat: 43.4667, lon: 6.4833, category: 'pfc' },
  { id: 'pfc-alpes', company: 'PFC La Poste', name: 'PFC Alpes', address: 'Zone Logistique', city: 'La Buissière', postalCode: '38530', lat: 45.4167, lon: 5.9333, category: 'pfc' },
  { id: 'pfc-gennevilliers', company: 'PFC La Poste', name: 'PFC Gennevilliers', address: '27 Route Principale du Port', city: 'Gennevilliers', postalCode: '92230', lat: 48.9333, lon: 2.3000, category: 'pfc' },
  { id: 'pfc-lyon', company: 'PFC La Poste', name: 'PFC Lyon Corbas', address: 'Zone Industrielle Mi-Plaine', city: 'Corbas', postalCode: '69960', lat: 45.6667, lon: 4.9000, category: 'pfc' },
  { id: 'pfc-marseille', company: 'PFC La Poste', name: 'PFC Marseille', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'pfc' },
  { id: 'pfc-toulouse', company: 'PFC La Poste', name: 'PFC Toulouse', address: 'Zone Logistique Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'pfc' },
  { id: 'pfc-bordeaux', company: 'PFC La Poste', name: 'PFC Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'pfc' },
  { id: 'pfc-nantes', company: 'PFC La Poste', name: 'PFC Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'pfc' },
  { id: 'pfc-lille', company: 'PFC La Poste', name: 'PFC Lille', address: 'ZI de Seclin', city: 'Seclin', postalCode: '59113', lat: 50.5500, lon: 3.0333, category: 'pfc' },
  { id: 'pfc-strasbourg', company: 'PFC La Poste', name: 'PFC Strasbourg', address: 'Zone Portuaire', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'pfc' },
  { id: 'pfc-rennes', company: 'PFC La Poste', name: 'PFC Rennes', address: 'ZI Ouest', city: 'Noyal-Châtillon', postalCode: '35530', lat: 48.0500, lon: -1.7167, category: 'pfc' },

  // =====================================================
  // CEVA LOGISTICS
  // =====================================================
  { id: 'ceva-paris-cdg', company: 'CEVA Logistics', name: 'Paris Roissy CDG', address: 'Zone Cargo 2', city: 'Tremblay-en-France', postalCode: '93290', lat: 49.0000, lon: 2.5333, category: 'ceva' },
  { id: 'ceva-marseille', company: 'CEVA Logistics', name: 'Marseille Fos', address: 'Port de Fos', city: 'Fos-sur-Mer', postalCode: '13270', lat: 43.4167, lon: 4.9333, category: 'ceva' },
  { id: 'ceva-lyon', company: 'CEVA Logistics', name: 'Lyon Saint-Quentin-Fallavier', address: 'Rue des Frères Lumière', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'ceva' },
  { id: 'ceva-le-havre', company: 'CEVA Logistics', name: 'Le Havre Port', address: 'Terminal à Conteneurs', city: 'Le Havre', postalCode: '76600', lat: 49.4833, lon: 0.1167, category: 'ceva' },
  { id: 'ceva-toulouse', company: 'CEVA Logistics', name: 'Toulouse Eurocentre', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'ceva' },
  { id: 'ceva-bordeaux', company: 'CEVA Logistics', name: 'Bordeaux', address: 'Zone Industrielle', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'ceva' },
  { id: 'ceva-lille', company: 'CEVA Logistics', name: 'Lille Lesquin', address: 'Zone Industrielle', city: 'Lesquin', postalCode: '59810', lat: 50.5667, lon: 3.1000, category: 'ceva' },
  { id: 'ceva-strasbourg', company: 'CEVA Logistics', name: 'Strasbourg', address: 'Port du Rhin', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'ceva' },
  { id: 'ceva-nantes', company: 'CEVA Logistics', name: 'Nantes', address: 'Zone Portuaire', city: 'Saint-Nazaire', postalCode: '44600', lat: 47.2833, lon: -2.2000, category: 'ceva' },
  { id: 'ceva-nice', company: 'CEVA Logistics', name: 'Nice Aéroport', address: 'Zone Cargo Aéroport', city: 'Nice', postalCode: '06200', lat: 43.6667, lon: 7.2167, category: 'ceva' },

  // =====================================================
  // GEFCO
  // =====================================================
  { id: 'gefco-paris', company: 'GEFCO', name: 'Paris Gennevilliers', address: 'Port de Gennevilliers', city: 'Gennevilliers', postalCode: '92230', lat: 48.9333, lon: 2.3000, category: 'gefco' },
  { id: 'gefco-lyon', company: 'GEFCO', name: 'Lyon Vénissieux', address: 'ZI de Vénissieux', city: 'Vénissieux', postalCode: '69200', lat: 45.6833, lon: 4.8833, category: 'gefco' },
  { id: 'gefco-sochaux', company: 'GEFCO', name: 'Sochaux (Stellantis)', address: 'Zone Industrielle PSA', city: 'Sochaux', postalCode: '25600', lat: 47.5167, lon: 6.8333, category: 'gefco' },
  { id: 'gefco-poissy', company: 'GEFCO', name: 'Poissy (Stellantis)', address: 'Zone Industrielle', city: 'Poissy', postalCode: '78300', lat: 48.9333, lon: 2.0333, category: 'gefco' },
  { id: 'gefco-rennes', company: 'GEFCO', name: 'Rennes', address: 'ZI La Janais', city: 'Chartres-de-Bretagne', postalCode: '35131', lat: 48.0333, lon: -1.7000, category: 'gefco' },
  { id: 'gefco-mulhouse', company: 'GEFCO', name: 'Mulhouse', address: 'Zone Industrielle', city: 'Mulhouse', postalCode: '68100', lat: 47.7500, lon: 7.3333, category: 'gefco' },
  { id: 'gefco-marseille', company: 'GEFCO', name: 'Marseille Fos', address: 'Port de Fos', city: 'Fos-sur-Mer', postalCode: '13270', lat: 43.4333, lon: 4.9500, category: 'gefco' },
  { id: 'gefco-bordeaux', company: 'GEFCO', name: 'Bordeaux Blanquefort', address: 'Zone Industrielle', city: 'Blanquefort', postalCode: '33290', lat: 44.9167, lon: -0.6333, category: 'gefco' },
  { id: 'gefco-valenciennes', company: 'GEFCO', name: 'Valenciennes', address: 'Zone Industrielle', city: 'Valenciennes', postalCode: '59300', lat: 50.3500, lon: 3.5333, category: 'gefco' },
  { id: 'gefco-le-havre', company: 'GEFCO', name: 'Le Havre Port', address: 'Terminal Conteneurs', city: 'Le Havre', postalCode: '76600', lat: 49.4833, lon: 0.1167, category: 'gefco' },

  // =====================================================
  // MTA TRANSPORT (Groupe MTA)
  // =====================================================
  { id: 'mta-toulouse', company: 'MTA Transport', name: 'Toulouse Siège', address: '340 Avenue des États-Unis', city: 'Toulouse', postalCode: '31200', lat: 43.6000, lon: 1.4500, category: 'mta' },
  { id: 'mta-montauban', company: 'MTA Transport', name: 'Montauban Bressols', address: 'ZI de Moulis', city: 'Bressols', postalCode: '82710', lat: 43.9667, lon: 1.3167, category: 'mta' },
  { id: 'mta-lezignan', company: 'MTA Transport', name: 'Lézignan-Corbières', address: '8 Impasse Claudius Regaud', city: 'Lézignan-Corbières', postalCode: '11200', lat: 43.2000, lon: 2.7500, category: 'mta' },
  { id: 'mta-tarbes', company: 'MTA Transport', name: 'Tarbes', address: '20 Rue Robert Destarac', city: 'Tarbes', postalCode: '65000', lat: 43.2333, lon: 0.0667, category: 'mta' },
  { id: 'mta-lombers', company: 'MTA Transport', name: 'Lombers', address: 'ZA Plaine de Grau', city: 'Lombers', postalCode: '81120', lat: 43.8500, lon: 2.0333, category: 'mta' },
  { id: 'mta-carcassonne', company: 'MTA Transport', name: 'Carcassonne', address: 'Zone Industrielle', city: 'Carcassonne', postalCode: '11000', lat: 43.2167, lon: 2.3500, category: 'mta' },
  { id: 'mta-bordeaux', company: 'MTA Transport', name: 'Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'mta' },
  { id: 'mta-narbonne', company: 'MTA Transport', name: 'Narbonne', address: 'Zone Industrielle', city: 'Narbonne', postalCode: '11100', lat: 43.1833, lon: 3.0000, category: 'mta' },
  { id: 'mta-perpignan', company: 'MTA Transport', name: 'Perpignan', address: 'Zone du Polygone', city: 'Perpignan', postalCode: '66000', lat: 42.6833, lon: 2.8833, category: 'mta' },
  { id: 'mta-pau', company: 'MTA Transport', name: 'Pau', address: 'Zone Industrielle', city: 'Pau', postalCode: '64000', lat: 43.3000, lon: -0.3667, category: 'mta' },

  // =====================================================
  // BESSON TRANSPORT
  // =====================================================
  { id: 'besson-lyon', company: 'Besson Transport', name: 'Lyon Siège', address: 'Zone Industrielle', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'besson' },
  { id: 'besson-marseille', company: 'Besson Transport', name: 'Marseille', address: 'Zone Portuaire', city: 'Marseille', postalCode: '13015', lat: 43.3500, lon: 5.3667, category: 'besson' },
  { id: 'besson-paris', company: 'Besson Transport', name: 'Paris Nord', address: 'ZI Paris Nord 2', city: 'Villepinte', postalCode: '93420', lat: 48.9667, lon: 2.5500, category: 'besson' },
  { id: 'besson-toulouse', company: 'Besson Transport', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'besson' },
  { id: 'besson-bordeaux', company: 'Besson Transport', name: 'Bordeaux', address: 'Zone Industrielle', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'besson' },
  { id: 'besson-nantes', company: 'Besson Transport', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'besson' },
  { id: 'besson-lille', company: 'Besson Transport', name: 'Lille', address: 'Zone Industrielle', city: 'Seclin', postalCode: '59113', lat: 50.5500, lon: 3.0333, category: 'besson' },
  { id: 'besson-strasbourg', company: 'Besson Transport', name: 'Strasbourg', address: 'Zone Portuaire', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'besson' },

  // =====================================================
  // GEODIS (Extended)
  // =====================================================
  { id: 'geodis-paris', company: 'Geodis', name: 'Île-de-France', address: 'ZI de la Haie Griselle', city: 'Cergy-Pontoise', postalCode: '95000', lat: 49.0500, lon: 2.0333, category: 'logistique' },
  { id: 'geodis-lyon', company: 'Geodis', name: 'Lyon Est', address: 'Rue des Frères Lumière', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'logistique' },
  { id: 'geodis-marseille', company: 'Geodis', name: 'Marseille Fos', address: 'Zone Logistique de Fos', city: 'Fos-sur-Mer', postalCode: '13270', lat: 43.4333, lon: 4.9500, category: 'logistique' },
  { id: 'geodis-aix', company: 'Geodis', name: 'Aix-en-Provence Healthcare', address: '325 Avenue Mayor de Montricher', city: 'Aix-en-Provence', postalCode: '13100', lat: 43.5167, lon: 5.4500, category: 'logistique' },
  { id: 'geodis-paris-bercy', company: 'Geodis', name: 'Paris Bercy', address: '3 Rue Escoffier', city: 'Paris', postalCode: '75012', lat: 48.8333, lon: 2.3833, category: 'logistique' },
  { id: 'geodis-genay', company: 'Geodis', name: 'Lyon Genay', address: '360 Rue Jacquard', city: 'Genay', postalCode: '69730', lat: 45.8833, lon: 4.8333, category: 'logistique' },
  { id: 'geodis-roissy', company: 'Geodis', name: 'Roissy CDG', address: 'Zone Cargo', city: 'Roissy-en-France', postalCode: '95700', lat: 49.0167, lon: 2.5500, category: 'logistique' },
  { id: 'geodis-toulouse', company: 'Geodis', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'logistique' },
  { id: 'geodis-bordeaux', company: 'Geodis', name: 'Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'logistique' },
  { id: 'geodis-nantes', company: 'Geodis', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'logistique' },
  { id: 'geodis-lille', company: 'Geodis', name: 'Lille Lesquin', address: 'Zone Industrielle', city: 'Lesquin', postalCode: '59810', lat: 50.5667, lon: 3.1000, category: 'logistique' },
  { id: 'geodis-strasbourg', company: 'Geodis', name: 'Strasbourg', address: 'Zone Portuaire', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'logistique' },
  { id: 'geodis-rennes', company: 'Geodis', name: 'Rennes', address: 'ZI Ouest', city: 'Noyal-Châtillon', postalCode: '35530', lat: 48.0500, lon: -1.7167, category: 'logistique' },
  { id: 'geodis-nice', company: 'Geodis', name: 'Nice', address: 'Zone Industrielle', city: 'Nice', postalCode: '06200', lat: 43.7000, lon: 7.2500, category: 'logistique' },
  { id: 'geodis-le-havre', company: 'Geodis', name: 'Le Havre Port', address: 'Terminal Conteneurs', city: 'Le Havre', postalCode: '76600', lat: 49.4833, lon: 0.1167, category: 'logistique' },

  // =====================================================
  // HEPPNER (Extended)
  // =====================================================
  { id: 'heppner-strasbourg', company: 'Heppner', name: 'Siège Strasbourg', address: '8 Rue de la Station', city: 'Strasbourg', postalCode: '67100', lat: 48.5833, lon: 7.7500, category: 'messagerie' },
  { id: 'heppner-paris', company: 'Heppner', name: 'Paris Nord', address: 'ZA Paris Nord 2', city: 'Villepinte', postalCode: '93420', lat: 48.9667, lon: 2.5500, category: 'messagerie' },
  { id: 'heppner-vitrolles', company: 'Heppner', name: 'Vitrolles', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'messagerie' },
  { id: 'heppner-saint-ouen', company: 'Heppner', name: 'Saint-Ouen-l\'Aumône', address: '30 Avenue du Fief', city: 'Saint-Ouen-l\'Aumône', postalCode: '95310', lat: 49.0500, lon: 2.1167, category: 'messagerie' },
  { id: 'heppner-lyon', company: 'Heppner', name: 'Lyon', address: 'Zone Industrielle', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'messagerie' },
  { id: 'heppner-toulouse', company: 'Heppner', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'messagerie' },
  { id: 'heppner-bordeaux', company: 'Heppner', name: 'Bordeaux', address: 'Zone Industrielle', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'messagerie' },
  { id: 'heppner-nantes', company: 'Heppner', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'messagerie' },
  { id: 'heppner-lille', company: 'Heppner', name: 'Lille', address: 'Zone Industrielle', city: 'Seclin', postalCode: '59113', lat: 50.5500, lon: 3.0333, category: 'messagerie' },
  { id: 'heppner-rennes', company: 'Heppner', name: 'Rennes', address: 'ZI Ouest', city: 'Noyal-Châtillon', postalCode: '35530', lat: 48.0500, lon: -1.7167, category: 'messagerie' },
  { id: 'heppner-mulhouse', company: 'Heppner', name: 'Mulhouse', address: 'Zone Industrielle', city: 'Mulhouse', postalCode: '68100', lat: 47.7500, lon: 7.3333, category: 'messagerie' },
  { id: 'heppner-metz', company: 'Heppner', name: 'Metz', address: 'Zone Industrielle', city: 'Metz', postalCode: '57000', lat: 49.1167, lon: 6.1833, category: 'messagerie' },

  // =====================================================
  // DB SCHENKER (Extended)
  // =====================================================
  { id: 'schenker-paris', company: 'DB Schenker', name: 'Paris CDG', address: 'Rue des Voyelles', city: 'Tremblay-en-France', postalCode: '93290', lat: 48.9833, lon: 2.5167, category: 'logistique' },
  { id: 'schenker-lyon', company: 'DB Schenker', name: 'Lyon Satolas', address: 'ZI de Saint-Exupéry', city: 'Colombier-Saugnieu', postalCode: '69125', lat: 45.7167, lon: 5.0833, category: 'logistique' },
  { id: 'schenker-marseille', company: 'DB Schenker', name: 'Marseille', address: 'Zone Portuaire', city: 'Marseille', postalCode: '13015', lat: 43.3500, lon: 5.3667, category: 'logistique' },
  { id: 'schenker-toulouse', company: 'DB Schenker', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'logistique' },
  { id: 'schenker-bordeaux', company: 'DB Schenker', name: 'Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'logistique' },
  { id: 'schenker-nantes', company: 'DB Schenker', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'logistique' },
  { id: 'schenker-lille', company: 'DB Schenker', name: 'Lille', address: 'Zone Industrielle', city: 'Lesquin', postalCode: '59810', lat: 50.5667, lon: 3.1000, category: 'logistique' },
  { id: 'schenker-strasbourg', company: 'DB Schenker', name: 'Strasbourg', address: 'Zone Portuaire', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'logistique' },
  { id: 'schenker-le-havre', company: 'DB Schenker', name: 'Le Havre', address: 'Terminal Conteneurs', city: 'Le Havre', postalCode: '76600', lat: 49.4833, lon: 0.1167, category: 'logistique' },
  { id: 'schenker-montaigu', company: 'DB Schenker', name: 'Montaigu-Vendée', address: '35 Rue Paul-Henri Goulet', city: 'Montaigu-Vendée', postalCode: '85600', lat: 46.9667, lon: -1.3167, category: 'logistique' },

  // =====================================================
  // DPD FRANCE (Extended)
  // =====================================================
  { id: 'dpd-paris', company: 'DPD France', name: 'Paris Gennevilliers', address: '24 Rue de la Gare des Marchandises', city: 'Gennevilliers', postalCode: '92230', lat: 48.9333, lon: 2.3000, category: 'express' },
  { id: 'dpd-lyon', company: 'DPD France', name: 'Lyon Corbas', address: 'ZA de Corbas Montmartin', city: 'Corbas', postalCode: '69960', lat: 45.6667, lon: 4.9000, category: 'express' },
  { id: 'dpd-marseille', company: 'DPD France', name: 'Marseille Vitrolles', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'express' },
  { id: 'dpd-toulouse', company: 'DPD France', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'express' },
  { id: 'dpd-bordeaux', company: 'DPD France', name: 'Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'express' },
  { id: 'dpd-nantes', company: 'DPD France', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'express' },
  { id: 'dpd-lille', company: 'DPD France', name: 'Lille', address: 'Zone Industrielle', city: 'Seclin', postalCode: '59113', lat: 50.5500, lon: 3.0333, category: 'express' },
  { id: 'dpd-strasbourg', company: 'DPD France', name: 'Strasbourg', address: 'Zone Industrielle', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'express' },
  { id: 'dpd-rennes', company: 'DPD France', name: 'Rennes', address: 'ZI Ouest', city: 'Noyal-Châtillon', postalCode: '35530', lat: 48.0500, lon: -1.7167, category: 'express' },
  { id: 'dpd-nice', company: 'DPD France', name: 'Nice', address: 'Zone Industrielle', city: 'Nice', postalCode: '06200', lat: 43.7000, lon: 7.2500, category: 'express' },

  // =====================================================
  // GLS FRANCE (Extended)
  // =====================================================
  { id: 'gls-paris', company: 'GLS', name: 'Paris Roissy', address: 'ZA des Tulipes', city: 'Roissy-en-France', postalCode: '95700', lat: 49.0000, lon: 2.5167, category: 'express' },
  { id: 'gls-lyon', company: 'GLS', name: 'Lyon Saint-Vulbas', address: 'Parc Industriel de la Plaine de l\'Ain', city: 'Saint-Vulbas', postalCode: '01150', lat: 45.8167, lon: 5.2833, category: 'express' },
  { id: 'gls-marseille', company: 'GLS', name: 'Marseille Vitrolles', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'express' },
  { id: 'gls-toulouse', company: 'GLS', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'express' },
  { id: 'gls-bordeaux', company: 'GLS', name: 'Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'express' },
  { id: 'gls-nantes', company: 'GLS', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'express' },
  { id: 'gls-lille', company: 'GLS', name: 'Lille', address: 'Zone Industrielle', city: 'Seclin', postalCode: '59113', lat: 50.5500, lon: 3.0333, category: 'express' },
  { id: 'gls-strasbourg', company: 'GLS', name: 'Strasbourg', address: 'Zone Industrielle', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'express' },
  { id: 'gls-rennes', company: 'GLS', name: 'Rennes', address: 'ZI Ouest', city: 'Noyal-Châtillon', postalCode: '35530', lat: 48.0500, lon: -1.7167, category: 'express' },
  { id: 'gls-nice', company: 'GLS', name: 'Nice', address: 'Zone Industrielle', city: 'Nice', postalCode: '06200', lat: 43.7000, lon: 7.2500, category: 'express' },
  { id: 'gls-montpellier', company: 'GLS', name: 'Montpellier', address: 'Zone Industrielle', city: 'Montpellier', postalCode: '34000', lat: 43.6000, lon: 3.8833, category: 'express' },
  { id: 'gls-dijon', company: 'GLS', name: 'Dijon', address: 'Zone Industrielle', city: 'Dijon', postalCode: '21000', lat: 47.3167, lon: 5.0167, category: 'express' },

  // =====================================================
  // CHRONOPOST (Extended)
  // =====================================================
  { id: 'chronopost-paris', company: 'Chronopost', name: 'Hub Paris CDG', address: 'Aéroport CDG Zone Cargo', city: 'Roissy-en-France', postalCode: '95700', lat: 49.0167, lon: 2.5500, category: 'express' },
  { id: 'chronopost-lyon', company: 'Chronopost', name: 'Hub Lyon', address: 'Aéroport Lyon Saint-Exupéry', city: 'Colombier-Saugnieu', postalCode: '69125', lat: 45.7333, lon: 5.0833, category: 'express' },
  { id: 'chronopost-marseille', company: 'Chronopost', name: 'Marseille', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'express' },
  { id: 'chronopost-toulouse', company: 'Chronopost', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'express' },
  { id: 'chronopost-bordeaux', company: 'Chronopost', name: 'Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'express' },
  { id: 'chronopost-nantes', company: 'Chronopost', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'express' },
  { id: 'chronopost-lille', company: 'Chronopost', name: 'Lille', address: 'Zone Industrielle', city: 'Lesquin', postalCode: '59810', lat: 50.5667, lon: 3.1000, category: 'express' },
  { id: 'chronopost-strasbourg', company: 'Chronopost', name: 'Strasbourg', address: 'Zone Industrielle', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'express' },
  { id: 'chronopost-rennes', company: 'Chronopost', name: 'Rennes', address: 'ZI Ouest', city: 'Noyal-Châtillon', postalCode: '35530', lat: 48.0500, lon: -1.7167, category: 'express' },
  { id: 'chronopost-nice', company: 'Chronopost', name: 'Nice', address: 'Aéroport Nice Côte d\'Azur', city: 'Nice', postalCode: '06200', lat: 43.6667, lon: 7.2167, category: 'express' },

  // =====================================================
  // FRANCE EXPRESS (Extended)
  // =====================================================
  { id: 'france-express-paris', company: 'France Express', name: 'Paris Roissy', address: 'ZA Paris Nord 2', city: 'Roissy-en-France', postalCode: '95700', lat: 49.0000, lon: 2.5167, category: 'express' },
  { id: 'france-express-paris-ney', company: 'France Express', name: 'Paris 18ème', address: '13 Boulevard Ney', city: 'Paris', postalCode: '75018', lat: 48.8977, lon: 2.3619, category: 'express' },
  { id: 'france-express-lyon', company: 'France Express', name: 'Lyon Corbas', address: '4 Rue Marcel Mérieux', city: 'Corbas', postalCode: '69960', lat: 45.6667, lon: 4.9000, category: 'express' },
  { id: 'france-express-marseille', company: 'France Express', name: 'Marseille', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'express' },
  { id: 'france-express-toulouse', company: 'France Express', name: 'Toulouse', address: 'Zone Eurocentre', city: 'Castelnau-d\'Estrétefonds', postalCode: '31620', lat: 43.7833, lon: 1.3667, category: 'express' },
  { id: 'france-express-bordeaux', company: 'France Express', name: 'Bordeaux', address: 'Zone Logistique', city: 'Cestas', postalCode: '33610', lat: 44.7500, lon: -0.7167, category: 'express' },
  { id: 'france-express-nantes', company: 'France Express', name: 'Nantes', address: 'Zone Industrielle', city: 'Carquefou', postalCode: '44470', lat: 47.2833, lon: -1.4833, category: 'express' },
  { id: 'france-express-lille', company: 'France Express', name: 'Lille', address: 'Zone Industrielle', city: 'Seclin', postalCode: '59113', lat: 50.5500, lon: 3.0333, category: 'express' },
  { id: 'france-express-strasbourg', company: 'France Express', name: 'Strasbourg', address: 'Zone Industrielle', city: 'Strasbourg', postalCode: '67000', lat: 48.5667, lon: 7.7833, category: 'express' },
  { id: 'france-express-rennes', company: 'France Express', name: 'Rennes', address: 'ZI Ouest', city: 'Noyal-Châtillon', postalCode: '35530', lat: 48.0500, lon: -1.7167, category: 'express' },
  { id: 'france-express-nice', company: 'France Express', name: 'Nice', address: 'Zone Industrielle', city: 'Nice', postalCode: '06200', lat: 43.7000, lon: 7.2500, category: 'express' },
  { id: 'france-express-montpellier', company: 'France Express', name: 'Montpellier', address: 'Zone Industrielle', city: 'Montpellier', postalCode: '34000', lat: 43.6000, lon: 3.8833, category: 'express' },

  // =====================================================
  // LA POSTE GENERAL
  // =====================================================
  { id: 'laposte-paris-nord', company: 'La Poste', name: 'Hub Paris Nord', address: '1 Avenue de la Plaine de France', city: 'Tremblay-en-France', postalCode: '93290', lat: 49.0000, lon: 2.5000, category: 'postale' },

  // =====================================================
  // VIA POSTE
  // =====================================================
  { id: 'viapost-paris', company: 'Via Poste', name: 'Paris Gennevilliers', address: '2 Rue des Fossés', city: 'Gennevilliers', postalCode: '92230', lat: 48.9333, lon: 2.3000, category: 'postale' },

  // =====================================================
  // TNT (FedEx)
  // =====================================================
  { id: 'tnt-paris', company: 'TNT (FedEx)', name: 'Paris CDG', address: 'Zone Cargo Aéroport CDG', city: 'Roissy-en-France', postalCode: '95700', lat: 49.0167, lon: 2.5333, category: 'express' },
  { id: 'tnt-lyon', company: 'TNT (FedEx)', name: 'Lyon', address: 'Aéroport Lyon Saint-Exupéry', city: 'Colombier-Saugnieu', postalCode: '69125', lat: 45.7167, lon: 5.0833, category: 'express' },
  { id: 'tnt-marseille', company: 'TNT (FedEx)', name: 'Marseille', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'express' },

  // =====================================================
  // UPS
  // =====================================================
  { id: 'ups-paris', company: 'UPS', name: 'Paris Chilly-Mazarin', address: 'ZI de Chilly-Mazarin', city: 'Chilly-Mazarin', postalCode: '91380', lat: 48.7167, lon: 2.3167, category: 'express' },
  { id: 'ups-lyon', company: 'UPS', name: 'Lyon', address: 'Zone Industrielle', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'express' },
  { id: 'ups-marseille', company: 'UPS', name: 'Marseille', address: 'ZI Les Estroublans', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'express' },

  // =====================================================
  // DHL
  // =====================================================
  { id: 'dhl-paris', company: 'DHL', name: 'Paris CDG Hub', address: 'Aéroport Charles de Gaulle', city: 'Roissy-en-France', postalCode: '95700', lat: 49.0167, lon: 2.5500, category: 'express' },
  { id: 'dhl-lyon', company: 'DHL', name: 'Lyon', address: 'Aéroport Lyon Saint-Exupéry', city: 'Colombier-Saugnieu', postalCode: '69125', lat: 45.7167, lon: 5.0833, category: 'express' },
  { id: 'dhl-marseille', company: 'DHL', name: 'Marseille', address: 'Aéroport Marseille Provence', city: 'Marignane', postalCode: '13700', lat: 43.4333, lon: 5.2167, category: 'express' },

  // =====================================================
  // XPO LOGISTICS
  // =====================================================
  { id: 'xpo-paris', company: 'XPO Logistics', name: 'Paris Nord', address: 'ZI Paris Nord 2', city: 'Villepinte', postalCode: '93420', lat: 48.9667, lon: 2.5500, category: 'logistique' },
  { id: 'xpo-lyon', company: 'XPO Logistics', name: 'Lyon', address: 'Zone Industrielle', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'logistique' },
  { id: 'xpo-marseille', company: 'XPO Logistics', name: 'Marseille', address: 'Zone Portuaire', city: 'Fos-sur-Mer', postalCode: '13270', lat: 43.4333, lon: 4.9500, category: 'logistique' },

  // =====================================================
  // KUEHNE + NAGEL
  // =====================================================
  { id: 'kuehne-paris', company: 'Kuehne + Nagel', name: 'Paris Roissy', address: 'Zone Fret CDG', city: 'Roissy-en-France', postalCode: '95700', lat: 49.0000, lon: 2.5333, category: 'logistique' },
  { id: 'kuehne-lyon', company: 'Kuehne + Nagel', name: 'Lyon', address: 'Zone Industrielle', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'logistique' },
  { id: 'kuehne-marseille', company: 'Kuehne + Nagel', name: 'Marseille', address: 'Port de Fos', city: 'Fos-sur-Mer', postalCode: '13270', lat: 43.4333, lon: 4.9500, category: 'logistique' },

  // =====================================================
  // STEF
  // =====================================================
  { id: 'stef-paris', company: 'STEF', name: 'Paris Rungis', address: 'MIN de Rungis', city: 'Rungis', postalCode: '94150', lat: 48.7500, lon: 2.3500, category: 'logistique' },
  { id: 'stef-lyon', company: 'STEF', name: 'Lyon', address: 'Zone Industrielle', city: 'Corbas', postalCode: '69960', lat: 45.6667, lon: 4.9000, category: 'logistique' },
  { id: 'stef-marseille', company: 'STEF', name: 'Marseille', address: 'Zone Portuaire', city: 'Marseille', postalCode: '13015', lat: 43.3500, lon: 5.3667, category: 'logistique' },

  // =====================================================
  // DACHSER
  // =====================================================
  { id: 'dachser-paris', company: 'Dachser', name: 'Paris Ferrières', address: 'ZA des Hauts de Ferrières', city: 'Ferrières-en-Brie', postalCode: '77164', lat: 48.8167, lon: 2.7000, category: 'messagerie' },
  { id: 'dachser-lyon', company: 'Dachser', name: 'Lyon', address: 'Zone Industrielle', city: 'Saint-Quentin-Fallavier', postalCode: '38070', lat: 45.6333, lon: 5.0833, category: 'messagerie' },
  { id: 'dachser-marseille', company: 'Dachser', name: 'Marseille', address: 'Zone Industrielle', city: 'Vitrolles', postalCode: '13127', lat: 43.4500, lon: 5.2500, category: 'messagerie' },
];

export const COMPANY_CATEGORIES = {
  express: { label: 'Express', color: 'bg-red-500/20 text-red-500' },
  messagerie: { label: 'Messagerie', color: 'bg-blue-500/20 text-blue-500' },
  logistique: { label: 'Logistique', color: 'bg-green-500/20 text-green-500' },
  postale: { label: 'Postale', color: 'bg-yellow-500/20 text-yellow-500' },
  pic: { label: 'PIC La Poste', color: 'bg-amber-500/20 text-amber-500' },
  pfc: { label: 'PFC Colissimo', color: 'bg-orange-500/20 text-orange-500' },
  ceva: { label: 'CEVA', color: 'bg-purple-500/20 text-purple-500' },
  gefco: { label: 'GEFCO', color: 'bg-indigo-500/20 text-indigo-500' },
  mta: { label: 'MTA', color: 'bg-teal-500/20 text-teal-500' },
  besson: { label: 'Besson', color: 'bg-cyan-500/20 text-cyan-500' },
};