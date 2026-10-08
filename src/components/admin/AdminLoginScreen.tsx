import { useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminLoginScreenProps {
  adminCode: string;
  setAdminCode: (code: string) => void;
  adminLoginError: string;
  adminLoginLoading: boolean;
  handleAdminLogin: () => void;
}

/**
 * Écran de saisie du code secret admin, affiché avant toute authentification.
 * Extrait de src/pages/Admin.tsx pour alléger ce fichier — comportement
 * identique.
 */
export function AdminLoginScreen({
  adminCode,
  setAdminCode,
  adminLoginError,
  adminLoginLoading,
  handleAdminLogin,
}: AdminLoginScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Administration</CardTitle>
          <CardDescription>Entrez le code secret pour accéder</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-code">Code secret</Label>
            <Input
              id="admin-code"
              type="password"
              placeholder="••••••••"
              value={adminCode}
              disabled={adminLoginLoading}
              onChange={(e) => setAdminCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
          </div>
          {adminLoginError && (
            <p className="text-sm text-destructive">{adminLoginError}</p>
          )}
          <Button className="w-full" onClick={handleAdminLogin} disabled={adminLoginLoading || !adminCode.trim()}>
            {adminLoginLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Accéder
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => navigate('/')}>
            Retour
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
