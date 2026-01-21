import React, { useEffect, useState } from 'react';
import { Moon, Sun, Calendar, Mail, Crown, Star, Sparkles, WifiOff, Lock, Clock, Building2, User, LogOut, RefreshCw, Check, AlertTriangle, Truck, Users, Coins, Container, X } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr, enUS, es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContactDialog } from '@/components/ContactDialog';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useLicense, PlanType } from '@/hooks/useLicense';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { isTauri } from '@/hooks/useTauri';
import { useLanguage } from '@/i18n/LanguageContext';
import { clearDesktopCacheAndReload } from '@/utils/desktopCache';
import { useDataSyncActions } from '@/components/DataSyncProvider';

interface TopBarProps {
  isDark: boolean | null;
  onToggleTheme: () => void;
}

const planConfig: Record<PlanType, { label: string; icon: React.ElementType; color: string }> = {
  start: { label: 'Start', icon: Sparkles, color: 'bg-blue-500/20 text-blue-500 border-blue-500/30' },
  pro: { label: 'Pro', icon: Star, color: 'bg-orange-500/20 text-orange-500 border-orange-500/30' },
  enterprise: { label: 'Enterprise', icon: Crown, color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
};

export function TopBar({ isDark, onToggleTheme }: TopBarProps) {
  const { planType, licenseData, isOffline, clearLicense } = useLicense();
  const [contactOpen, setContactOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const isOnline = useNetworkStatus();
  const { language, t } = useLanguage();
  const { forceSync, isSyncing, lastSyncAt, syncErrors, clearErrors, stats } = useDataSyncActions();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const plan = planConfig[planType];
  const PlanIcon = plan.icon;

  // Locale pour date-fns
  const dateLocale = language === 'en' ? enUS : language === 'es' ? es : fr;

  // User display name
  const userName = licenseData?.firstName && licenseData?.lastName 
    ? `${licenseData.firstName} ${licenseData.lastName}`
    : licenseData?.firstName || licenseData?.lastName || null;

  // Blocage pour forfait Start hors-ligne
  const isStartOfflineBlocked = planType === 'start' && (!isOnline || isOffline);

  const getLogoutText = () => {
    if (language === 'en') return { title: 'Sign out', description: 'Are you sure you want to sign out? You will need to enter your license again.' };
    if (language === 'es') return { title: 'Cerrar sesión', description: '¿Estás seguro de que quieres cerrar sesión? Deberás ingresar tu licencia nuevamente.' };
    return { title: 'Déconnexion', description: 'Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez entrer à nouveau votre licence.' };
  };

  const logoutText = getLogoutText();

  return (
    <>
      {/* Overlay de blocage pour Start hors-ligne */}
      {isStartOfflineBlocked && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4 p-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <Lock className="w-10 h-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {language === 'en' ? 'Offline mode unavailable' : language === 'es' ? 'Modo offline no disponible' : 'Mode hors-ligne indisponible'}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {language === 'en' 
                ? 'The Start plan requires an internet connection to work. Upgrade to Pro to benefit from offline mode.' 
                : language === 'es' 
                ? 'El plan Start requiere conexión a internet. Pase al plan Pro para beneficiarse del modo offline.'
                : 'Le forfait Start nécessite une connexion internet pour fonctionner. Passez au forfait Pro pour bénéficier du mode hors-ligne.'}
            </p>
            <div className="flex items-center justify-center gap-2 text-destructive">
              <WifiOff className="w-5 h-5" />
              <span>{t.network.offline}</span>
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-20 lg:left-64 right-0 h-14 z-40 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left side - Time + User info */}
          <div className="flex items-center gap-4">
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

            {/* Indicateur hors-ligne */}
            {(!isOnline || isOffline) && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/20 text-destructive animate-pulse">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">{t.network.offline}</span>
              </div>
            )}
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Plan Badge */}
            <Badge variant="outline" className={`flex items-center gap-1.5 px-3 py-1 ${plan.color}`}>
              <PlanIcon className="w-3.5 h-3.5" />
              <span className="font-medium">{t.plans[planType as keyof typeof t.plans] || plan.label}</span>
            </Badge>

            {/* Date */}
            <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              <span className="capitalize">{format(currentTime, 'EEEE d MMMM', { locale: dateLocale })}</span>
            </div>

            {/* Contact button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContactOpen(true)}
              className="hidden md:flex gap-2"
            >
              <Mail className="w-4 h-4" />
              <span className="hidden lg:inline">{t.support.title}</span>
            </Button>

            {/* Sync status with popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex gap-2"
                  title={language === 'en' ? 'Sync status' : language === 'es' ? 'Estado de sincronización' : 'État de synchronisation'}
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  ) : syncErrors.length > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  ) : lastSyncAt ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="hidden lg:inline">
                    {isSyncing 
                      ? (language === 'en' ? 'Syncing...' : language === 'es' ? 'Sincronizando...' : 'Synchro...')
                      : 'Sync'}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      {language === 'en' ? 'Sync Status' : language === 'es' ? 'Estado de sincronización' : 'État de synchronisation'}
                    </h4>
                    {isSyncing ? (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {language === 'en' ? 'In progress' : language === 'es' ? 'En progreso' : 'En cours'}
                      </Badge>
                    ) : syncErrors.length > 0 ? (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {language === 'en' ? 'Errors' : language === 'es' ? 'Errores' : 'Erreurs'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1 border-green-500/50 text-green-600">
                        <Check className="w-3 h-3" />
                        OK
                      </Badge>
                    )}
                  </div>

                  {/* Last sync */}
                  {lastSyncAt && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        {language === 'en' ? 'Last sync: ' : language === 'es' ? 'Última sincr.: ' : 'Dernière synchro : '}
                        {formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: dateLocale })}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{stats.vehicleCount} véhicule{stats.vehicleCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{stats.driverCount} conducteur{stats.driverCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                      <Coins className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{stats.chargeCount} charge{stats.chargeCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2 py-1.5">
                      <Container className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{stats.trailerCount} remorque{stats.trailerCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Errors */}
                  {syncErrors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-destructive">
                          {language === 'en' ? 'Recent errors' : language === 'es' ? 'Errores recientes' : 'Erreurs récentes'}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearErrors}>
                          <X className="w-3 h-3 mr-1" />
                          {language === 'en' ? 'Clear' : language === 'es' ? 'Borrar' : 'Effacer'}
                        </Button>
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {syncErrors.map((err, i) => (
                          <div key={i} className="text-xs bg-destructive/10 text-destructive rounded px-2 py-1 flex items-start gap-2">
                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{err.table}:</span>{' '}
                              <span className="break-words">{err.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Force sync button */}
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => void forceSync()}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={isSyncing ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
                    {language === 'en' ? 'Force sync now' : language === 'es' ? 'Forzar sincronización' : 'Forcer la synchronisation'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Force sync (mobile icon) */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden rounded-full"
                  title={language === 'en' ? 'Sync status' : language === 'es' ? 'Estado de sincronización' : 'État de synchronisation'}
                >
                  {isSyncing ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  ) : syncErrors.length > 0 ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Sync</span>
                    <Button size="sm" onClick={() => void forceSync()} disabled={isSyncing}>
                      <RefreshCw className={isSyncing ? 'w-3 h-3 animate-spin mr-1' : 'w-3 h-3 mr-1'} />
                      Sync
                    </Button>
                  </div>
                  {lastSyncAt && (
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(lastSyncAt, { addSuffix: true, locale: dateLocale })}
                    </p>
                  )}
                  {syncErrors.length > 0 && (
                    <div className="text-xs text-destructive">
                      {syncErrors.length} erreur{syncErrors.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Theme toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={onToggleTheme}
              className="rounded-full"
              title={isDark === null ? t.theme.auto : isDark ? t.theme.dark : t.theme.light}
            >
              {isDark === null ? (
                <div className="relative">
                  <Sun className="h-4 w-4 absolute opacity-50" />
                  <Moon className="h-4 w-4 opacity-50" />
                </div>
              ) : isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Desktop: Clear cache / Force reload */}
            {isTauri() && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    title={
                      language === 'en'
                        ? 'Clear cache / Force reload'
                        : language === 'es'
                          ? 'Vaciar caché / Forzar recarga'
                          : 'Vider le cache / Forcer rechargement'
                    }
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {language === 'en'
                        ? 'Clear cache and reload?'
                        : language === 'es'
                          ? '¿Vaciar caché y recargar?'
                          : 'Vider le cache et relancer ?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {language === 'en'
                        ? 'This clears any cached files/service worker and restarts the app to ensure the latest UI is loaded.'
                        : language === 'es'
                          ? 'Esto borra archivos en caché/service worker y reinicia la app para cargar la última interfaz.'
                          : "Cela supprime les fichiers en cache / service worker puis relance l'app pour charger la dernière interface."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {language === 'en' ? 'Cancel' : language === 'es' ? 'Cancelar' : 'Annuler'}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={() => void clearDesktopCacheAndReload()}>
                      {language === 'en'
                        ? 'Clear & reload'
                        : language === 'es'
                          ? 'Vaciar y recargar'
                          : 'Vider & relancer'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Logout button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title={logoutText.title}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{logoutText.title}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {logoutText.description}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {language === 'en' ? 'Cancel' : language === 'es' ? 'Cancelar' : 'Annuler'}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={() => { clearLicense(); window.location.reload(); }} className="bg-destructive hover:bg-destructive/90">
                    {logoutText.title}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <ContactDialog open={contactOpen} onOpenChange={setContactOpen} />
    </>
  );
}
