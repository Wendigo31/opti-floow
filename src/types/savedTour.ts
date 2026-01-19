// Types for saved tours/calculations
export interface SavedTour {
  id: string;
  user_id: string;
  license_id?: string | null;
  client_id: string | null;
  
  // Tour details
  name: string;
  origin_address: string;
  destination_address: string;
  stops: TourStop[];
  
  // Calculated values
  distance_km: number;
  duration_minutes: number;
  toll_cost: number;
  fuel_cost: number;
  adblue_cost: number;
  driver_cost: number;
  structure_cost: number;
  vehicle_cost: number;
  total_cost: number;
  
  // Pricing
  pricing_mode: 'km' | 'fixed' | 'auto';
  price_per_km: number;
  fixed_price: number;
  target_margin: number;
  revenue: number;
  profit: number;
  profit_margin: number;
  
  // Vehicle, trailer and drivers info
  vehicle_id: string | null;
  vehicle_data: any | null;
  trailer_id: string | null;
  trailer_data: any | null;
  driver_ids: string[];
  drivers_data: any[];
  
  // Metadata
  notes: string | null;
  tags: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface TourStop {
  address: string;
  lat?: number;
  lng?: number;
}

export interface SaveTourInput {
  name: string;
  client_id?: string | null;
  origin_address: string;
  destination_address: string;
  stops?: TourStop[];
  distance_km: number;
  duration_minutes?: number;
  toll_cost: number;
  fuel_cost: number;
  adblue_cost: number;
  driver_cost: number;
  structure_cost: number;
  vehicle_cost: number;
  total_cost: number;
  pricing_mode: 'km' | 'fixed' | 'auto';
  price_per_km?: number;
  fixed_price?: number;
  target_margin?: number;
  revenue: number;
  profit: number;
  profit_margin: number;
  vehicle_id?: string | null;
  vehicle_data?: any;
  trailer_id?: string | null;
  trailer_data?: any;
  driver_ids?: string[];
  drivers_data?: any[];
  notes?: string;
  tags?: string[];
}
