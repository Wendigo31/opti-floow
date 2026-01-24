import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyUser, CompanyInvitation, TeamRole, TeamMember } from '@/types/team';
import { MAX_USERS_PER_PLAN } from '@/types/team';
import type { PlanType } from '@/hooks/useLicense';

interface UseTeamReturn {
  members: TeamMember[];
  pendingInvitations: CompanyInvitation[];
  currentUserRole: TeamRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isDirection: boolean;
  canManageTeam: boolean;
  maxUsers: number;
  currentUserCount: number;
  canAddMore: boolean;
  isLoading: boolean;
  error: string | null;
  licenseId: string | null;
  licensePlanType: PlanType; // The actual plan type from database
  inviteMember: (email: string, role: TeamRole, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (memberId: string, role: TeamRole) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  cancelInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;
  refreshTeam: () => Promise<void>;
}

export function useTeam(): UseTeamReturn {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<CompanyInvitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [licensePlanType, setLicensePlanType] = useState<PlanType>('start');
  const [licenseMaxUsers, setLicenseMaxUsers] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const maxUsers = licenseMaxUsers || MAX_USERS_PER_PLAN[licensePlanType] || 1;
  const currentUserCount = members.filter(m => m.is_active).length;
  const pendingCount = pendingInvitations.filter(i => !i.accepted_at).length;
  const canAddMore = (currentUserCount + pendingCount) < maxUsers;

  // Support both legacy (owner/admin) and new (direction/responsable) role names
  const isOwner = currentUserRole === 'owner' || currentUserRole === 'direction';
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'direction' || currentUserRole === 'responsable';
  const isDirection = currentUserRole === 'direction' || currentUserRole === 'owner';
  // canManageTeam depends on the actual plan type from DB, not from useLicense hook
  const hasMultiUsers = licensePlanType === 'pro' || licensePlanType === 'enterprise';
  const canManageTeam = isAdmin && hasMultiUsers;

  // Fetch team data
  const fetchTeam = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get license ID and license info from the current user's company_users entry with a join
      // This avoids the RLS issue on the licenses table
      const { data: currentUserEntry, error: userError } = await supabase
        .from('company_users')
        .select(`
          license_id, 
          role,
          licenses!company_users_license_id_fkey (
            plan_type,
            max_users
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user entry:', userError);
      }

      if (!currentUserEntry?.license_id) {
        // User not in any company - not an error for users without team
        setCurrentUserRole(null);
        setLicenseId(null);
        setIsLoading(false);
        return;
      }

      const currentLicenseId = currentUserEntry.license_id;
      setLicenseId(currentLicenseId);
      setCurrentUserRole(currentUserEntry.role as TeamRole);

      // Extract license info from the joined query
      const licenseInfo = currentUserEntry.licenses as { plan_type: string | null; max_users: number | null } | null;
      if (licenseInfo) {
        setLicensePlanType((licenseInfo.plan_type as PlanType) || 'start');
        setLicenseMaxUsers(licenseInfo.max_users || 1);
      }

      // Fetch team members
      const { data: companyUsers, error: usersError } = await supabase
        .from('company_users')
        .select('*')
        .eq('license_id', currentLicenseId)
        .order('created_at', { ascending: true });

      if (usersError) {
        console.error('Error fetching team members:', usersError);
        setError('Erreur lors du chargement de l\'équipe');
      } else {
        const teamMembers: TeamMember[] = (companyUsers || []).map(cu => ({
          ...cu,
          role: cu.role as TeamRole,
          isCurrentUser: cu.user_id === user.id,
        }));
        setMembers(teamMembers);
      }

      // Fetch pending invitations
      const { data: invitations, error: invError } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('license_id', currentLicenseId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (invError) {
        console.error('Error fetching invitations:', invError);
      } else {
        setPendingInvitations((invitations || []).map(inv => ({
          ...inv,
          role: inv.role as TeamRole,
        })));
      }
    } catch (e) {
      console.error('Error in fetchTeam:', e);
      setError('Erreur inattendue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchTeam();
    }
  }, [fetchTeam]);

  const inviteMember = useCallback(async (email: string, role: TeamRole, displayName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!canManageTeam) {
      return { success: false, error: 'Vous n\'avez pas les permissions pour inviter des membres' };
    }

    if (!canAddMore) {
      return { success: false, error: `Limite de ${maxUsers} utilisateur(s) atteinte pour votre forfait` };
    }

    if (role === 'owner' || role === 'direction') {
      return { success: false, error: 'Impossible d\'inviter un membre avec ce rôle' };
    }

    if (!licenseId) {
      return { success: false, error: 'Aucune licence trouvée' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Non authentifié' };
      }

      // Check if already a member or invited
      const { data: existingMember } = await supabase
        .from('company_users')
        .select('id')
        .eq('license_id', licenseId)
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingMember) {
        return { success: false, error: 'Cet utilisateur est déjà membre de l\'équipe' };
      }

      const { data: existingInvite } = await supabase
        .from('company_invitations')
        .select('id')
        .eq('license_id', licenseId)
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)
        .maybeSingle();

      if (existingInvite) {
        return { success: false, error: 'Une invitation est déjà en attente pour cet email' };
      }

      // Create invitation
      const { error: insertError } = await supabase
        .from('company_invitations')
        .insert({
          license_id: licenseId,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        });

      if (insertError) {
        console.error('Error creating invitation:', insertError);
        return { success: false, error: 'Erreur lors de la création de l\'invitation' };
      }

      // Also create company_users entry with display_name
      const { error: userError } = await supabase
        .from('company_users')
        .insert({
          license_id: licenseId,
          email: email.toLowerCase(),
          role,
          display_name: displayName?.trim() || null,
          invited_by: user.id,
          is_active: true,
        });

      if (userError) {
        console.error('Error creating company user:', userError);
        // Don't fail - invitation was created successfully
      }

      await fetchTeam();
      return { success: true };
    } catch (e) {
      console.error('Error in inviteMember:', e);
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [canManageTeam, canAddMore, maxUsers, licenseId, fetchTeam]);

  const updateMemberRole = useCallback(async (memberId: string, role: TeamRole): Promise<{ success: boolean; error?: string }> => {
    if (!canManageTeam) {
      return { success: false, error: 'Vous n\'avez pas les permissions' };
    }

    if (role === 'owner') {
      return { success: false, error: 'Impossible de définir comme propriétaire' };
    }

    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        return { success: false, error: 'Membre non trouvé' };
      }

      if (member.role === 'owner' || member.role === 'direction') {
        return { success: false, error: 'Impossible de modifier le rôle de la direction' };
      }

      const { error: updateError } = await supabase
        .from('company_users')
        .update({ role })
        .eq('id', memberId);

      if (updateError) {
        console.error('Error updating member role:', updateError);
        return { success: false, error: 'Erreur lors de la mise à jour' };
      }

      await fetchTeam();
      return { success: true };
    } catch (e) {
      console.error('Error in updateMemberRole:', e);
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [canManageTeam, members, fetchTeam]);

  const removeMember = useCallback(async (memberId: string): Promise<{ success: boolean; error?: string }> => {
    if (!isOwner) {
      return { success: false, error: 'Seule la direction peut supprimer des membres' };
    }

    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        return { success: false, error: 'Membre non trouvé' };
      }

      if (member.role === 'owner' || member.role === 'direction') {
        return { success: false, error: 'Impossible de supprimer la direction' };
      }

      const { error: deleteError } = await supabase
        .from('company_users')
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        console.error('Error removing member:', deleteError);
        return { success: false, error: 'Erreur lors de la suppression' };
      }

      await fetchTeam();
      return { success: true };
    } catch (e) {
      console.error('Error in removeMember:', e);
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [isOwner, members, fetchTeam]);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    if (!canManageTeam) {
      return { success: false, error: 'Vous n\'avez pas les permissions' };
    }

    try {
      const { error: deleteError } = await supabase
        .from('company_invitations')
        .delete()
        .eq('id', invitationId);

      if (deleteError) {
        console.error('Error canceling invitation:', deleteError);
        return { success: false, error: 'Erreur lors de l\'annulation' };
      }

      await fetchTeam();
      return { success: true };
    } catch (e) {
      console.error('Error in cancelInvitation:', e);
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [canManageTeam, fetchTeam]);

  return {
    members,
    pendingInvitations,
    currentUserRole,
    isOwner,
    isAdmin,
    isDirection,
    canManageTeam,
    maxUsers,
    currentUserCount,
    canAddMore,
    isLoading,
    error,
    licenseId,
    licensePlanType,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    refreshTeam: fetchTeam,
  };
}
