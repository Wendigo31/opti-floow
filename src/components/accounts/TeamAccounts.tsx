import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, Loader2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ROLE_NAMES,
  companyTeam,
  createCompanyUser,
  resetUserPassword,
  setUserActive,
  type TeamUser,
} from '@/lib/accounts';

/**
 * Accès de la société — identique dans OptiFlow, OptiFret et OptiXpress.
 * La Direction et les RH créent les accès (email ou identifiant + mot de passe
 * provisoire), redonnent un mot de passe provisoire et désactivent un accès.
 * Les autres rôles voient la liste.
 */
export function TeamAccounts({ licenseId }: { licenseId: string }) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [maxUsers, setMaxUsers] = useState<number | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', displayName: '', role: 'exploitation', loginId: '' });
  const [busy, setBusy] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ who: string; login: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await companyTeam(licenseId);
      setUsers(t.users);
      setMaxUsers(t.max_users);
      setMyRole(t.my_role);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [licenseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = myRole === 'direction' || myRole === 'rh';
  const activeCount = users.filter((u) => u.is_active).length;
  const full = !!maxUsers && maxUsers > 0 && activeCount >= maxUsers;
  const roles = myRole === 'direction' ? ['direction', 'exploitation', 'comptabilite', 'rh'] : ['exploitation', 'comptabilite', 'rh'];

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setBusy(null);
    }
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    void run('create', async () => {
      const r = await createCompanyUser({ licenseId, ...form });
      setSecret({ who: form.displayName || form.email, login: form.loginId || form.email, password: r.password });
      setCopied(false);
      setForm({ email: '', displayName: '', role: 'exploitation', loginId: '' });
    });
  };

  const reset = (u: TeamUser) =>
    void run(u.id, async () => {
      const password = await resetUserPassword(u.id);
      setSecret({ who: u.display_name || u.email, login: u.login_id || u.email, password });
      setCopied(false);
    });

  const canTouch = (u: TeamUser) => canManage && (u.role !== 'direction' || myRole === 'direction');

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5 md:col-span-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-semibold">Accès de la société</h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} accès actif{activeCount > 1 ? 's' : ''}
            {maxUsers && maxUsers < 999 ? ` sur ${maxUsers} prévus par votre forfait` : ''}
          </p>
        </div>
      </div>

      {secret && (
        <div className="space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
          <p>
            <strong>Mot de passe provisoire de {secret.who}</strong> — à lui transmettre maintenant, il ne sera plus affiché.
            Il devra choisir son propre mot de passe à sa première connexion.
          </p>
          <p>
            Identifiant : <span className="font-mono">{secret.login}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-background px-3 py-1.5 font-mono text-base tracking-wider">{secret.password}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(`Identifiant : ${secret.login}\nMot de passe provisoire : ${secret.password}`);
                setCopied(true);
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" /> {copied ? 'Copié' : 'Copier'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSecret(null)}>
              Fermer
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {users.map((u) => (
            <li key={u.id} className={`flex flex-col gap-2 p-3 sm:flex-row sm:items-center ${u.is_active ? '' : 'opacity-60'}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium">{u.display_name || u.email}</span>
                  <Badge variant="secondary" className="text-[10px]">{ROLE_NAMES[u.role] ?? u.role}</Badge>
                  {!u.is_active && <Badge variant="outline" className="text-[10px]">Désactivé</Badge>}
                  {u.must_change_password && u.is_active && (
                    <Badge variant="outline" className="text-[10px]">Mot de passe provisoire</Badge>
                  )}
                </div>
                <span className="block truncate text-xs text-muted-foreground">
                  {u.email}
                  {u.login_id ? ` · identifiant ${u.login_id}` : ''}
                </span>
              </div>
              {canTouch(u) && (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => reset(u)}>
                    {busy === u.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <KeyRound className="mr-1 h-3.5 w-3.5" />}
                    Mot de passe provisoire
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy !== null}
                    onClick={() => void run(u.id + ':a', () => setUserActive(u.id, !u.is_active).then(() => undefined))}
                  >
                    {u.is_active ? 'Désactiver' : 'Réactiver'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={create} className="space-y-3 rounded-lg border border-dashed p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <UserPlus className="h-4 w-4" /> Créer un accès
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Email *" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="Nom affiché" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <Input
              placeholder="Identifiant personnel (facultatif)"
              value={form.loginId}
              onChange={(e) => setForm({ ...form, loginId: e.target.value })}
            />
            <select
              aria-label="Rôle"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_NAMES[r]}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Un mot de passe provisoire est généré : la personne se connecte avec son email (ou son identifiant) et le
            remplace à sa première connexion.
          </p>
          <Button type="submit" disabled={busy !== null || full}>
            {busy === 'create' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {full ? 'Limite du forfait atteinte' : "Créer l'accès"}
          </Button>
        </form>
      )}
    </div>
  );
}
