// Local storage types (no Supabase dependency)

export interface LocalClient {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  siret: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalClientAddress {
  id: string;
  client_id: string;
  label: string;
  address: string;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
}

export interface LocalTrip {
  id: string;
  client_id: string | null;
  origin_address: string;
  destination_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  distance_km: number;
  duration_minutes: number | null;
  fuel_cost: number | null;
  toll_cost: number | null;
  driver_cost: number | null;
  adblue_cost: number | null;
  structure_cost: number | null;
  total_cost: number;
  revenue: number | null;
  profit: number | null;
  profit_margin: number | null;
  trip_date: string;
  status: string | null;
  notes: string | null;
  stops: unknown | null;
  vehicle_data: unknown | null;
  driver_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface LocalQuote {
  id: string;
  client_id: string | null;
  quote_number: string;
  origin_address: string;
  destination_address: string;
  distance_km: number;
  total_cost: number;
  margin_percent: number | null;
  tva_rate: number | null;
  price_ht: number;
  price_ttc: number;
  valid_until: string | null;
  notes: string | null;
  status: string | null;
  stops: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface LocalCompanySettings {
  id: string;
  company_name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  siret: string | null;
  logo_url: string | null;
  quote_conditions: string | null;
  quote_footer: string | null;
  created_at: string;
  updated_at: string;
}

export interface LocalClientReport {
  id: string;
  client_id: string;
  report_type: 'itinerary' | 'cost_analysis' | 'trip' | 'quote';
  title: string;
  data: {
    // Itinerary data
    origin_address?: string;
    destination_address?: string;
    distance_km?: number;
    duration_hours?: number;
    toll_cost?: number;
    fuel_cost?: number;
    total_cost?: number;
    route_type?: 'highway' | 'national';
    stops?: { address: string; lat?: number; lon?: number }[];
    // Cost analysis data
    margin_percent?: number;
    price_ht?: number;
    price_ttc?: number;
    profit?: number;
    // Revenue and profit for itineraries
    revenue?: number;
    profit_margin?: number;
    // Trip reference
    trip_id?: string;
    // Quote reference  
    quote_id?: string;
    // Extended itinerary data
    adblue_cost?: number;
    driver_cost?: number;
    structure_cost?: number;
    // Vehicle data
    vehicle?: {
      fuelConsumption?: number;
      fuelPriceHT?: number;
      adBlueConsumption?: number;
      adBluePriceHT?: number;
    };
    vehicle_id?: string;
    vehicle_name?: string;
    // Assigned drivers
    driver_ids?: string[];
  };
  notes: string | null;
  created_at: string;
}

// Helper to generate UUID
export const generateId = (): string => {
  return crypto.randomUUID();
};
