import { saveJSONWithPicker, saveFileWithPicker } from './fileSave';
import type { LocalClient, LocalClientAddress, LocalTrip, LocalQuote, LocalCompanySettings } from '@/types/local';

export interface ExportData {
  version: string;
  exportDate: string;
  clients: LocalClient[];
  clientAddresses: LocalClientAddress[];
  trips: LocalTrip[];
  quotes: LocalQuote[];
  companySettings: LocalCompanySettings | null;
}

export async function exportAllData(): Promise<boolean> {
  // Get data from localStorage
  const clients = JSON.parse(localStorage.getItem('optiflow_clients') || '[]');
  const clientAddresses = JSON.parse(localStorage.getItem('optiflow_client_addresses') || '[]');
  const trips = JSON.parse(localStorage.getItem('optiflow_trips') || '[]');
  const quotes = JSON.parse(localStorage.getItem('optiflow_quotes') || '[]');
  const companySettings = JSON.parse(localStorage.getItem('optiflow_company_settings') || 'null');

  const exportData: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    clients,
    clientAddresses,
    trips,
    quotes,
    companySettings,
  };

  return await saveJSONWithPicker(exportData, `optiflow-export-${new Date().toISOString().split('T')[0]}.json`);
}

export function importAllData(jsonString: string): { success: boolean; message: string; counts?: { clients: number; trips: number; quotes: number } } {
  try {
    const data: ExportData = JSON.parse(jsonString);

    // Validate structure
    if (!data.version || !data.exportDate) {
      return { success: false, message: 'Format de fichier invalide' };
    }

    // Import data - merge with existing or replace
    if (data.clients && Array.isArray(data.clients)) {
      const existingClients = JSON.parse(localStorage.getItem('optiflow_clients') || '[]');
      const existingIds = new Set(existingClients.map((c: LocalClient) => c.id));
      const newClients = data.clients.filter(c => !existingIds.has(c.id));
      localStorage.setItem('optiflow_clients', JSON.stringify([...existingClients, ...newClients]));
    }

    if (data.clientAddresses && Array.isArray(data.clientAddresses)) {
      const existingAddresses = JSON.parse(localStorage.getItem('optiflow_client_addresses') || '[]');
      const existingIds = new Set(existingAddresses.map((a: LocalClientAddress) => a.id));
      const newAddresses = data.clientAddresses.filter(a => !existingIds.has(a.id));
      localStorage.setItem('optiflow_client_addresses', JSON.stringify([...existingAddresses, ...newAddresses]));
    }

    if (data.trips && Array.isArray(data.trips)) {
      const existingTrips = JSON.parse(localStorage.getItem('optiflow_trips') || '[]');
      const existingIds = new Set(existingTrips.map((t: LocalTrip) => t.id));
      const newTrips = data.trips.filter(t => !existingIds.has(t.id));
      localStorage.setItem('optiflow_trips', JSON.stringify([...existingTrips, ...newTrips]));
    }

    if (data.quotes && Array.isArray(data.quotes)) {
      const existingQuotes = JSON.parse(localStorage.getItem('optiflow_quotes') || '[]');
      const existingIds = new Set(existingQuotes.map((q: LocalQuote) => q.id));
      const newQuotes = data.quotes.filter(q => !existingIds.has(q.id));
      localStorage.setItem('optiflow_quotes', JSON.stringify([...existingQuotes, ...newQuotes]));
    }

    if (data.companySettings) {
      localStorage.setItem('optiflow_company_settings', JSON.stringify(data.companySettings));
    }

    return {
      success: true,
      message: 'Données importées avec succès',
      counts: {
        clients: data.clients?.length || 0,
        trips: data.trips?.length || 0,
        quotes: data.quotes?.length || 0,
      }
    };
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, message: 'Erreur lors de la lecture du fichier' };
  }
}
