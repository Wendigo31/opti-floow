import { useState, useMemo } from 'react';
import { Building2, Star, Search, MapPin, Check, Truck, Package, Mail, Box, Plus, X, MapPinned, Trash2, Users, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TRANSPORT_COMPANIES, COMPANY_CATEGORIES, type TransportCompanyAddress } from '@/data/transportCompanies';
import { useCloudFavoriteAddresses, type CloudFavoriteAddress } from '@/hooks/useCloudFavoriteAddresses';
import { useAddressAutocomplete } from '@/hooks/useAddressAutocomplete';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
interface AddressSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (address: string, position: { lat: number; lon: number }) => void;
}

const categoryIcons: Record<string, any> = {
  express: Truck,
  messagerie: Package,
  logistique: Box,
  postale: Mail,
  pic: Mail,
  pfc: Package,
  ceva: Truck,
  gefco: Truck,
  mta: Truck,
  besson: Truck,
};

// French regions with their department prefixes
const FRENCH_REGIONS: Record<string, { label: string; departments: string[] }> = {
  'idf': { label: 'Île-de-France', departments: ['75', '77', '78', '91', '92', '93', '94', '95'] },
  'aura': { label: 'Auvergne-Rhône-Alpes', departments: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'] },
  'paca': { label: 'Provence-Alpes-Côte d\'Azur', departments: ['04', '05', '06', '13', '83', '84'] },
  'occitanie': { label: 'Occitanie', departments: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'] },
  'nouvelle-aquitaine': { label: 'Nouvelle-Aquitaine', departments: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'] },
  'bretagne': { label: 'Bretagne', departments: ['22', '29', '35', '56'] },
  'pays-loire': { label: 'Pays de la Loire', departments: ['44', '49', '53', '72', '85'] },
  'normandie': { label: 'Normandie', departments: ['14', '27', '50', '61', '76'] },
  'hauts-france': { label: 'Hauts-de-France', departments: ['02', '59', '60', '62', '80'] },
  'grand-est': { label: 'Grand Est', departments: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'] },
  'bourgogne': { label: 'Bourgogne-Franche-Comté', departments: ['21', '25', '39', '58', '70', '71', '89', '90'] },
  'centre': { label: 'Centre-Val de Loire', departments: ['18', '28', '36', '37', '41', '45'] },
  'corse': { label: 'Corse', departments: ['2A', '2B', '20'] },
};

// Get region from postal code
const getRegionFromPostalCode = (postalCode: string): string | null => {
  const dept = postalCode.substring(0, 2);
  for (const [regionKey, { departments }] of Object.entries(FRENCH_REGIONS)) {
    if (departments.includes(dept)) {
      return regionKey;
    }
  }
  return null;
};

export function AddressSelectorDialog({ open, onOpenChange, onSelect }: AddressSelectorDialogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('companies');
  const { favorites, loading: favoritesLoading, addFavorite, removeFavorite } = useCloudFavoriteAddresses();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // For custom address
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customPostalCode, setCustomPostalCode] = useState('');
  const { suggestions, loading: searchLoading, searchAddress, getPlaceDetails, clearSuggestions } = useAddressAutocomplete();

  // Check if search is a postal code (5 digits)
  const isPostalCodeSearch = /^\d{2,5}$/.test(search.trim());

  // Toggle region selection
  const toggleRegion = (regionKey: string) => {
    setSelectedRegions(prev => 
      prev.includes(regionKey) 
        ? prev.filter(r => r !== regionKey)
        : [...prev, regionKey]
    );
  };

  const filteredCompanies = useMemo(() => {
    return TRANSPORT_COMPANIES.filter(company => {
      const matchesSearch = 
        company.company.toLowerCase().includes(search.toLowerCase()) ||
        company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.city.toLowerCase().includes(search.toLowerCase()) ||
        company.address.toLowerCase().includes(search.toLowerCase()) ||
        company.postalCode.includes(search);
      
      const matchesCategory = !selectedCategory || company.category === selectedCategory;
      
      // Filter by regions (if any selected)
      const companyRegion = getRegionFromPostalCode(company.postalCode);
      const matchesRegion = selectedRegions.length === 0 || (companyRegion && selectedRegions.includes(companyRegion));
      
      return matchesSearch && matchesCategory && matchesRegion;
    });
  }, [search, selectedCategory, selectedRegions]);

  const filteredFavorites = useMemo(() => {
    return favorites.filter(fav => 
      fav.name.toLowerCase().includes(search.toLowerCase()) ||
      fav.address.toLowerCase().includes(search.toLowerCase()) ||
      (fav.city?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (fav.postal_code || '').includes(search)
    );
  }, [favorites, search]);

  const handleSelectCompany = (company: TransportCompanyAddress) => {
    const fullAddress = `${company.address}, ${company.postalCode} ${company.city}`;
    onSelect(fullAddress, { lat: company.lat, lon: company.lon });
    onOpenChange(false);
    setSearch('');
  };

  const handleSelectFavorite = (favorite: CloudFavoriteAddress) => {
    onSelect(favorite.address, { lat: favorite.lat, lon: favorite.lon });
    onOpenChange(false);
    setSearch('');
  };

  const handleDeleteFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await removeFavorite(id);
    setDeletingId(null);
  };

  const handleAddressSearch = async (query: string) => {
    setCustomAddress(query);
    if (query.length >= 3) {
      await searchAddress(query);
    }
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    const details = await getPlaceDetails(suggestion.placeId);
    if (details) {
      setCustomAddress(details.formattedAddress);
      setCustomCity(details.addressComponents.city || '');
      setCustomPostalCode(details.addressComponents.postalCode || '');
      clearSuggestions();
    }
  };

  const handleSaveCustomAddress = async () => {
    if (!customName || !customAddress) {
      toast({ title: "Veuillez remplir le nom et l'adresse", variant: "destructive" });
      return;
    }

    // If the user already selected a suggestion (address has coordinates from getPlaceDetails),
    // we need to geocode the final address
    const searchQuery = customPostalCode && customCity 
      ? `${customAddress}, ${customPostalCode} ${customCity}`
      : customAddress;
    
    try {
      // Direct API call to get place suggestions
      const { data: searchData, error: searchError } = await supabase.functions.invoke('google-places-search', {
        body: { query: searchQuery }
      });

      if (searchError || !searchData?.predictions?.length) {
        toast({ title: "Impossible de géolocaliser l'adresse", variant: "destructive" });
        return;
      }

      const firstPlaceId = searchData.predictions[0].place_id;
      const details = await getPlaceDetails(firstPlaceId);
      
      if (!details) {
        toast({ title: "Impossible de géolocaliser l'adresse", variant: "destructive" });
        return;
      }

      await addFavorite({
        name: customName,
        address: details.formattedAddress,
        lat: details.lat,
        lon: details.lng,
        city: details.addressComponents.city,
        postal_code: details.addressComponents.postalCode,
      });
      
      setCustomName('');
      setCustomAddress('');
      setCustomCity('');
      setCustomPostalCode('');
      clearSuggestions();
      setActiveTab('favorites');
    } catch (error) {
      console.error('Error saving custom address:', error);
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-visible">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Sélectionner une adresse
          </DialogTitle>
          <DialogDescription>Recherchez parmi les transporteurs, vos favoris ou ajoutez une adresse personnalisée.</DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, ville ou code postal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {isPostalCodeSearch && (
            <Badge variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              Code postal
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="w-4 h-4" />
              Transporteurs ({filteredCompanies.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="w-4 h-4" />
              Favoris ({filteredFavorites.length})
            </TabsTrigger>
            <TabsTrigger value="custom" className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="flex-1 mt-4">
            {/* Region filter - Multi-select */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <MapPinned className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtrer par régions :</span>
                {selectedRegions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRegions([])}
                    className="h-6 px-2 text-xs"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(FRENCH_REGIONS).map(([key, { label }]) => {
                  const isSelected = selectedRegions.includes(key);
                  const count = TRANSPORT_COMPANIES.filter(c => getRegionFromPostalCode(c.postalCode) === key).length;
                  return (
                    <Button
                      key={key}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleRegion(key)}
                      className={cn(
                        "h-7 text-xs gap-1",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                    >
                      {label}
                      <Badge variant="secondary" className={cn(
                        "ml-1 h-4 px-1 text-[10px]",
                        isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted"
                      )}>
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
              {selectedRegions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs text-muted-foreground">Sélection :</span>
                  {selectedRegions.map(key => (
                    <Badge key={key} variant="secondary" className="text-xs gap-1">
                      {FRENCH_REGIONS[key].label}
                      <button onClick={() => toggleRegion(key)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Tous
              </Button>
              {Object.entries(COMPANY_CATEGORIES).map(([key, { label, color }]) => {
                const Icon = categoryIcons[key as keyof typeof categoryIcons];
                return (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(key)}
                    className="gap-1"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </Button>
                );
              })}
            </div>

            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-2">
                {filteredCompanies.map((company) => {
                  const categoryConfig = COMPANY_CATEGORIES[company.category];
                  const Icon = categoryIcons[company.category];
                  
                  return (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className="w-full p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 text-left transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">{company.company}</span>
                            <Badge variant="secondary" className={cn("text-xs", categoryConfig.color)}>
                              <Icon className="w-3 h-3 mr-1" />
                              {categoryConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{company.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">{company.postalCode}</span> - {company.address}, {company.city}
                          </p>
                        </div>
                        <Check className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  );
                })}
                {filteredCompanies.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {isPostalCodeSearch 
                      ? `Aucune entreprise trouvée dans le ${search}` 
                      : 'Aucune entreprise trouvée'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="favorites" className="flex-1 mt-4">
            {favoritesLoading ? (
              <div className="flex items-center justify-center h-[370px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[370px] pr-4">
                <div className="space-y-2">
                  {filteredFavorites.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span>Adresses partagées avec toute l'équipe</span>
                    </div>
                  )}
                  {filteredFavorites.map((favorite) => (
                    <div
                      key={favorite.id}
                      className="group relative w-full p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 text-left transition-colors cursor-pointer"
                      onClick={() => handleSelectFavorite(favorite)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium text-foreground">{favorite.name}</span>
                            {favorite.created_by_name && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {favorite.created_by_name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{favorite.address}</p>
                          {(favorite.postal_code || favorite.city) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">{favorite.postal_code}</span> {favorite.city}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteFavorite(e, favorite.id)}
                          disabled={deletingId === favorite.id}
                        >
                          {deletingId === favorite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredFavorites.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Aucune adresse favorite</p>
                      <p className="text-sm mt-1">
                        Ajoutez des adresses via l'onglet "Ajouter"
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="custom" className="flex-1 mt-4">
            <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Ajouter une adresse personnalisée</h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="customName">Nom / Libellé *</Label>
                  <Input
                    id="customName"
                    placeholder="Ex: Dépôt Lyon, Client ABC..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="customPostalCode">Code postal</Label>
                    <Input
                      id="customPostalCode"
                      placeholder="Ex: 69000"
                      value={customPostalCode}
                      onChange={(e) => setCustomPostalCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="customCity">Ville</Label>
                    <Input
                      id="customCity"
                      placeholder="Ex: Lyon"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-1 relative">
                  <Label htmlFor="customAddress">Adresse complète *</Label>
                  <Input
                    id="customAddress"
                    placeholder="Ex: 15 rue de la République"
                    value={customAddress}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-auto">
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50 border-b border-border/50 last:border-0"
                        >
                          {suggestion.address}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <Button variant="gradient" onClick={handleSaveCustomAddress} className="w-full gap-2">
                <Star className="w-4 h-4" />
                Enregistrer dans les favoris
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
