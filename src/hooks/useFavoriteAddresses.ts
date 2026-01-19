import { useLocalStorage } from './useLocalStorage';

export interface FavoriteAddress {
  id: string;
  name: string;
  address: string;
  city?: string;
  postalCode?: string;
  lat: number;
  lon: number;
  createdAt: string;
}

export function useFavoriteAddresses() {
  const [favorites, setFavorites] = useLocalStorage<FavoriteAddress[]>('optiflow_favorite_addresses', []);

  const addFavorite = (address: Omit<FavoriteAddress, 'id' | 'createdAt'>) => {
    const newFavorite: FavoriteAddress = {
      ...address,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setFavorites(prev => [...prev, newFavorite]);
    return newFavorite;
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const updateFavorite = (id: string, updates: Partial<Omit<FavoriteAddress, 'id' | 'createdAt'>>) => {
    setFavorites(prev => prev.map(f => 
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const isFavorite = (lat: number, lon: number) => {
    return favorites.some(f => 
      Math.abs(f.lat - lat) < 0.0001 && 
      Math.abs(f.lon - lon) < 0.0001
    );
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    updateFavorite,
    isFavorite,
  };
}
