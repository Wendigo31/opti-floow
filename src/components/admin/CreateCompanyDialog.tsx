import { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import type { PlanType } from '@/hooks/useLicense';

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getAdminToken: () => string | null;
  onCompanyCreated: () => void;
  // Optional: for editing/syncing SIREN on existing license
  editLicenseId?: string;
  editLicenseData?: {
    companyName?: string;
    siren?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    companyStatus?: string;
    employeeCount?: number;
    email?: string;
    planType?: PlanType;
  };
}

export function CreateCompanyDialog({ 
  open, 
  onOpenChange, 
  getAdminToken,
  onCompanyCreated,
  editLicenseId,
  editLicenseData 
}: CreateCompanyDialogProps) {
  const { lookup, loading: sireneLoading, error: sireneError, company, reset: resetSiren } = useSireneLookup();
  const [sirenInput, setSirenInput] = useState('');
  const [companyIdentifier, setCompanyIdentifier] = useState('');
  const [planType, setPlanType] = useState<PlanType>('start');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerFirstName, setOwnerFirstName] = useState('');
  const [ownerLastName, setOwnerLastName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerPosition, setOwnerPosition] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdLicense, setCreatedLicense] = useState<{ identifier: string; email: string } | null>(null);
  
  // Is this in edit mode (syncing SIREN to existing license)?
  const isEditMode = !!editLicenseId;

  // Prefill form when editing existing license
  useEffect(() => {
    if (open && editLicenseData) {
      setSirenInput(editLicenseData.siren || '');
      setPlanType(editLicenseData.planType || 'start');
      setOwnerEmail(editLicenseData.email || '');
    }
  }, [open, editLicenseData]);

  const handleSirenLookup = async () => {
    if (!sirenInput.trim()) return;
    await lookup(sirenInput);
  };

  // Handle sync SIREN to existing license (edit mode)
  const handleSyncSiren = async () => {
    if (!company) {
      toast.error('Veuillez d\'abord rechercher une entreprise via SIREN');
      return;
    }
    if (!editLicenseId) return;

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: {
          action: 'update-license',
          adminToken: getAdminToken(),
          licenseId: editLicenseId,
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
      if (!data?.success) throw new Error(data?.error || 'Erreur lors de la mise à jour');

      toast.success('Informations SIREN synchronisées avec succès');
      onCompanyCreated();
      handleClose();
    } catch (err: any) {
      console.error('Error syncing SIREN:', err);
      toast.error(err.message || 'Erreur lors de la synchronisation');
    } finally {
      setIsCreating(false);
    }
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
          companyIdentifier: companyIdentifier.trim() || null,
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
        // Create the owner as a company_user (via RPC to bypass RLS)
        const displayName = [ownerFirstName, ownerLastName].filter(Boolean).join(' ') || null;
        const { error: userError } = await supabase
          .rpc('admin_add_company_user', {
            p_license_id: data.license.id,
            p_email: ownerEmail.toLowerCase().trim(),
            p_role: 'direction',
            p_display_name: displayName,
          });

        if (userError) {
          console.error('Error creating owner user:', userError);
        }

        setCreatedLicense({
          identifier: companyIdentifier.trim(),
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
    setCompanyIdentifier('');
    setOwnerEmail('');
    setOwnerFirstName('');
    setOwnerLastName('');
    setOwnerPhone('');
    setOwnerPosition('');
    setPlanType('start');
    setCreatedLicense(null);
    resetSiren();
    onOpenChange(false);
  };

  const copyIdentifier = () => {
    if (createdLicense?.identifier) {
      navigator.clipboard.writeText(createdLicense.identifier);
      toast.success('Identifiant copié');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <RefreshCw className="h-5 w-5" />
                Synchroniser les infos SIREN
              </>
            ) : (
              <>
                <Building2 className="h-5 w-5" />
                Créer une société
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Mettez à jour les informations de l\'entreprise via une nouvelle recherche SIREN'
              : 'Recherchez l\'entreprise via son numéro SIREN/SIRET pour pré-remplir les informations'
            }
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
              <p className="text-sm text-muted-foreground mb-2">Identifiant société</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-lg font-mono font-bold">{createdLicense.identifier}</code>
                <Button variant="ghost" size="sm" onClick={copyIdentifier}>
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

            {/* Owner Information - Only show in create mode */}
            {!isEditMode && (
              <div className="space-y-4 pt-2">
                <h4 className="font-medium">Identifiant société</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="companyIdentifier">Identifiant société <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
                  <Input
                    id="companyIdentifier"
                    placeholder="TRANSPORT-MARTIN, ACME-CORP..."
                    value={companyIdentifier}
                    onChange={(e) => setCompanyIdentifier(e.target.value.toUpperCase())}
                  />
                  <p className="text-xs text-muted-foreground">
                    Peut être défini plus tard. Cet identifiant sera utilisé par les utilisateurs pour se connecter.
                  </p>
                </div>
                
                <h4 className="font-medium pt-2">Propriétaire de la société</h4>
                
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
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              {isEditMode ? (
                <Button 
                  onClick={handleSyncSiren} 
                  disabled={isCreating || !company}
                >
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Synchroniser les infos
                </Button>
              ) : (
                <Button 
                  onClick={handleCreate} 
                  disabled={isCreating || !company || !ownerEmail.trim()}

                >
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Building2 className="h-4 w-4 mr-2" />
                  Créer la société
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
