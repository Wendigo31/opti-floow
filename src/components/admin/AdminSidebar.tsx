import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ADMIN_NAV, type AdminTab } from '@/types/admin';

const ADMIN_AUTH_STORAGE_KEY = 'optiflow_admin_auth_v2';
const ADMIN_TOKEN_STORAGE_KEY = 'optiflow_admin_token_v2';

interface AdminSidebarProps {
  adminActiveTab: AdminTab;
  setAdminActiveTab: (tab: AdminTab) => void;
  setIsAdminAuthenticated: (authenticated: boolean) => void;
}

/**
 * Barre latérale de navigation entre les onglets admin, et actions de
 * déconnexion (admin seule, ou toutes les sessions). Extrait de
 * src/pages/Admin.tsx pour alléger ce fichier — comportement identique.
 */
export function AdminSidebar({ adminActiveTab, setAdminActiveTab, setIsAdminAuthenticated }: AdminSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">Admin</h1>
            <p className="text-xs text-muted-foreground">Panneau de contrôle</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        <nav className="space-y-1">
          {ADMIN_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setAdminActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                adminActiveTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
              </div>
            </button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              setIsAdminAuthenticated(false);
              // Admin session is stored in sessionStorage
              sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
              sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
              toast.success('Déconnexion admin réussie');
              navigate('/');
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion admin
          </Button>

          {/* Logout ALL local sessions (admin + user license + auth) */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnecter toutes les sessions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Déconnecter toutes les sessions ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cela supprimera la session d'authentification, la session admin et le cache licence sur cet appareil, puis retournera à l'écran de connexion.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      // Clear admin session
                      setIsAdminAuthenticated(false);
                      sessionStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
                      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);

                      // Clear license + offline cache
                      localStorage.removeItem('optiflow-license');
                      localStorage.removeItem('optiflow-license-cache');

                      // Clear auth session
                      await supabase.auth.signOut();
                    } catch (e) {
                      console.error('Logout all sessions failed:', e);
                    } finally {
                      // Hard reload ensures all in-memory state is reset
                      window.location.href = '/';
                    }
                  }}
                >
                  Confirmer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </aside>
  );
}
