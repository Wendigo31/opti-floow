import { ThemeModeSwitch } from '@/components/ThemeModeSwitch';
import React, { useEffect, useState } from 'react';
import { Calendar, Crown, Star, Sparkles, Clock, Building2, User, LogOut, Briefcase, RefreshCw, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useLicense, PlanType } from '@/hooks/useLicense';
import { isTauri } from '@/hooks/useTauri';
import { clearDesktopCacheAndReload } from '@/utils/desktopCache';

import { useTeam } from '@/hooks/useTeam';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { CloudStatus } from '@/components/cloud/CloudStatus';
import { NAV_CATEGORIES } from '@/config/appNavigation';
import { NotificationCenter } from '@/components/layout/NotificationCenter';

interface TopBarProps {
  /** Classe Tailwind `left-*` : calculée par MainLayout à partir du même état
   * (sidebar visible ou non, repliée ou non) que la marge du contenu, pour que
   * la barre du haut reste toujours alignée avec la barre latérale. */
  leftOffsetClass: string;
}

const planConfig: Record<PlanType, { label: string; icon: React.ElementType; color: string }> = {
  optiflow: { label: 'OptiFlow', icon: Crown, color: 'bg-primary/15 text-primary border-primary/30' },
};

// Role configuration for display
const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  direction: { label: 'Direction', icon: Crown, color: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
  exploitation: { label: 'Exploitation', icon: Briefcase, color: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  comptabilite: { label: 'Comptabilité', icon: Building2, color: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  rh: { label: 'RH', icon: Users, color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
};

const pageLabel = (path: string) => {
  if (path === '/') return 'Accueil';
  if (path === '/settings') return 'Paramètres';
  for (const c of NAV_CATEGORIES) for (const p of c.pages) if (p.to === path) return p.label;
  return '';
};

export function TopBar({ leftOffsetClass }: TopBarProps) {
  const { planType, licenseData, clearLicense, hasFeature } = useLicense();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { currentUserRole, currentUserInfo } = useTeam();
  const isMobile = useIsMobile();


  // Normalize role for display - seule la source serveur (company_users, via
  // useTeam) fait foi : un repli sur licenseData.userRole (mis en cache dans
  // localStorage) afficherait un badge de rôle faux si cette clé est modifiée
  // à la main (même motif que les 8 autres fichiers corrigés le 24/10).
  const getNormalizedRole = (): string | null => {
    const role = currentUserRole;
    if (!role) return null;
    switch (role.toLowerCase()) {
      case 'direction':
      case 'owner':
        return 'direction';
      case 'comptabilite':
        return 'comptabilite';
      case 'rh':
        return 'rh';
      case 'exploitation':
      case 'admin':
        return 'exploitation';
      case 'membre':
      case 'member':
      default:
        return 'exploitation';
    }
  };

  const normalizedRole = getNormalizedRole();
  const roleInfo = normalizedRole ? roleConfig[normalizedRole] : null;

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const plan = planConfig[planType];
  const PlanIcon = plan.icon;

  // User display name - prioritize user-specific info from company_users over license owner info
  const userName = currentUserInfo.displayName 
    || (currentUserInfo.email ? currentUserInfo.email.split('@')[0] : null)
    || (licenseData?.firstName && licenseData?.lastName 
      ? `${licenseData.firstName} ${licenseData.lastName}`
      : licenseData?.firstName || licenseData?.lastName || null);

  return (
    <>
      <div className={`fixed top-0 right-0 h-14 z-40 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300 ${leftOffsetClass}`}>
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left side - Mobile menu + Time + User info */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Navigation */}
            {isMobile && <MobileNav />}
            {/* Current time */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-medium">{format(currentTime, 'HH:mm')}</span>
            </div>
            
            {/* User name */}
            {userName && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span>{userName}</span>
              </div>
            )}
            
            {/* Company name */}
            {licenseData?.companyName && (
              <div className="hidden md:flex items-center gap-2 text-sm text-foreground font-medium">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <span>{licenseData.companyName}</span>
              </div>
            )}

          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Cloud : synchronisation, hors ligne, collègues connectés (identique dans les 3 logiciels) */}
            <CloudStatus pageLabel={pageLabel} onReconnect={clearLicense} />

            {/* Notification Center */}
            <NotificationCenter />

            {/* Role Badge */}
            {roleInfo && (
              <Badge variant="outline" className={`hidden md:flex items-center gap-1.5 px-3 py-1 ${roleInfo.color}`}>
                <roleInfo.icon className="w-3.5 h-3.5" />
                <span className="font-medium">{roleInfo.label}</span>
              </Badge>
            )}

            {/* Plan Badge */}
            <Badge variant="outline" className={`hidden sm:flex items-center gap-1.5 px-3 py-1 ${plan.color}`}>
              <PlanIcon className="w-3.5 h-3.5" />
              <span className="font-medium">{plan.label}</span>
            </Badge>

            {/* Date */}
            <div className="hidden xl:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              <span className="capitalize">{format(currentTime, 'EEEE d MMMM', { locale: fr })}</span>
            </div>


            {/* Thème jour / nuit : Automatique, Clair ou Sombre */}
            <ThemeModeSwitch />

            {/* Paramètres (hors des 5 catégories métier) */}
            {hasFeature('page_settings') && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                title="Paramètres"
                asChild
              >
                <Link to="/settings">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            )}

            {/* Desktop: Clear cache / Force reload */}
            {isTauri() && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    title="Vider le cache / Forcer rechargement"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Vider le cache et relancer ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cela supprimera les données en cache et forcera un rechargement complet de l'application.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={clearDesktopCacheAndReload}>
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Logout */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:text-destructive"
                  title="Déconnexion"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Déconnexion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez entrer à nouveau votre licence.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearLicense()} className="bg-destructive hover:bg-destructive/90">
                    Se déconnecter
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      
    </>
  );
}
