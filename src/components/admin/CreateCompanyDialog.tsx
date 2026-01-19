import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSireneLookup } from '@/hooks/useSireneLookup';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, 
  Search, 
  Loader2, 
  CheckCircle, 
  MapPin,
  Users,
  FileText,
  Briefcase,
  Phone
} from 'lucide-react';
import type { PlanType } from '@/hooks/useLicense';

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAdminToken: () => string | null;
  onCompanyCreated: () => void;
}

export function CreateCompanyDialog({ 
  open, 
  onOpenChange, 
  getAdminToken,
  onCompanyCreated 
}: CreateCompanyDialogProps) {
  const { lookup, loading: sireneLoading, error: sireneError, company } = useSireneLookup();
  const [sirenInput, setSirenInput] = useState('');
  const [planType, setPlanType] = useState<PlanType>('start');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPosition, setOwnerPosition] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdLicense, setCreatedLicense] = useState<{ code: string; email: string } | null>(null);

  const handleSirenLookup = async () => {
    if (!sirenInput.trim()) return;
    await lookup(sirenInput);
  };

  const handleCreate = async () => {
    if (!company) {
      toast.error('Veuillez d\'abord rechercher une entreprise via SIREN');
      return;
    }
    if (!ownerEmail.trim()) {
      toast.error('Email du propriétaire requis');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: {
          action: 'create-license',
          adminToken: getAdminToken(),
          email: ownerEmail.toLowerCase().trim(),
          planType,
          firstName: ownerFirstName.trim() || null,
          lastName: ownerLastName.trim() || null,
          companyName: company.companyName,
          siren: company.siren,
          address: company.address,
          city: company.city,
          postalCode: company.postalCode,
          employeeCount: company.employeeCount,
          companyStatus: company.legalStatus,
        },
      });

      if (error) throw error;

      if (data?.license) {
        // Create the owner as a company_user with phone and position
        const displayName = [ownerFirstName, ownerLastName].filter(Boolean).join(' ') || null;
        const { error: userError } = await supabase
          .from('company_users')
          .insert({
            license_id: data.license.id,
            user_id: crypto.randomUUID(), // Will be updated on first login
            email: ownerEmail.toLowerCase().trim(),
            role: 'owner',
            display_name: displayName,
            is_active: true,
            accepted_at: new Date().toISOString(),
          });

        if (userError) {
          console.error('Error creating owner user:', userError);
        }

        // Also create company_settings with owner contact info
        const { error: settingsError } = await supabase
          .from('company_settings')
          .insert({
            user_id: data.license.id, // Using license ID as a reference
            company_name: company.companyName,
            address: company.address,
            city: company.city,
            postal_code: company.postalCode,
            email: ownerEmail.toLowerCase().trim(),
            phone: ownerPhone.trim() || null,
            siret: company.siret || company.siren,
          });

        if (settingsError) {
          console.error('Error creating company settings:', settingsError);
        }

        setCreatedLicense({
          code: data.license.license_code,
          email: ownerEmail,
        });
        toast.success('Société créée avec succès');
        onCompanyCreated();
      }
    } catch (err: any) {
      console.error('Error creating company:', err);
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setSirenInput('');
    setOwnerEmail('');
    setOwnerFirstName('');
    setOwnerLastName('');
    setOwnerPhone('');
    setOwnerPosition('');
    setPlanType('start');
    setCreatedLicense(null);
    onOpenChange(false);
  };

  const copyLicenseCode = () => {
    if (createdLicense?.code) {
      navigator.clipboard.writeText(createdLicense.code);
      toast.success('Code licence copié');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Créer une société
          </DialogTitle>
          <DialogDescription>
            Recherchez l'entreprise via son numéro SIREN/SIRET pour pré-remplir les informations
          </DialogDescription>
        </DialogHeader>

        {createdLicense ? (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Société créée avec succès !</h3>
              <p className="text-muted-foreground">
                Un email a été envoyé à {createdLicense.email}
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Code de licence</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono font-bold">{createdLicense.code}</code>
                <Button variant="ghost" size="sm" onClick={copyLicenseCode}>
                  Copier
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {/* SIREN Search Section */}
            <div className="space-y-4 border-b pb-4">
              <div className="space-y-2">
                <Label htmlFor="siren">Numéro SIREN ou SIRET</Label>
                <div className="flex gap-2">
                  <Input
                    id="siren"
                    placeholder="123 456 789 ou 123 456 789 00012"
                    value={sirenInput}
                    onChange={(e) => setSirenInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSirenLookup()}
                  />
                  <Button 
                    onClick={handleSirenLookup} 
                    disabled={sireneLoading || !sirenInput.trim()}
                  >
                    {sireneLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2">Rechercher</span>
                  </Button>
                </div>
                {sireneError && (
                  <p className="text-sm text-destructive">{sireneError}</p>
                )}
              </div>

              {/* Company Info from SIREN */}
              {company && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{company.companyName}</h4>
                      <p className="text-sm text-muted-foreground">SIREN: {company.siren}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Vérifié
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Adresse</p>
                        <p className="text-muted-foreground">
                          {company.address}<br />
                          {company.postalCode} {company.city}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Effectif</p>
                        <p className="text-muted-foreground">
                          {company.employeeRange || 'Non renseigné'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Code NAF</p>
                        <p className="text-muted-foreground">
                          {company.naf} {company.nafLabel && `- ${company.nafLabel}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Forme juridique</p>
                        <p className="text-muted-foreground">
                          {company.legalStatus || 'Non renseigné'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Owner Information */}
            <div className="space-y-4 pt-2">
              <h4 className="font-medium">Propriétaire de la société</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    value={ownerFirstName}
                    onChange={(e) => setOwnerFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    value={ownerLastName}
                    onChange={(e) => setOwnerLastName(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email du propriétaire *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@entreprise.fr"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Poste / Fonction</Label>
                  <Input
                    id="position"
                    placeholder="Gérant, Directeur..."
                    value={ownerPosition}
                    onChange={(e) => setOwnerPosition(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Forfait</Label>
                <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="start">Start</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={isCreating || !company || !ownerEmail.trim()}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Building2 className="h-4 w-4 mr-2" />
                Créer la société
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
