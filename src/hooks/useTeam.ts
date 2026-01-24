import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLicense } from '@/hooks/useLicense';
import type { CompanyUser, CompanyInvitation, TeamRole, TeamMember } from '@/types/team';
import { MAX_USERS_PER_PLAN } from '@/types/team';

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
  inviteMember: (email: string, role: TeamRole, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (memberId: string, role: TeamRole) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  cancelInvitation: (invitationId: string) => Promise<{ success: boolean; error?: string }>;
  refreshTeam: () => Promise<void>;
}

export function useTeam(): UseTeamReturn {
  const { licenseData, planType, hasFeature } = useLicense();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<CompanyInvitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const maxUsers = MAX_USERS_PER_PLAN[planType] || 1;
  const currentUserCount = members.filter(m => m.is_active).length;
  const pendingCount = pendingInvitations.filter(i => !i.accepted_at).length;
  const canAddMore = (currentUserCount + pendingCount) < maxUsers;

  // Support both legacy (owner/admin) and new (direction/responsable) role names
  const isOwner = currentUserRole === 'owner' || currentUserRole === 'direction';
  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner' || currentUserRole === 'direction' || currentUserRole === 'responsable';
  const isDirection = currentUserRole === 'direction' || currentUserRole === 'owner';
  const canManageTeam = isAdmin && hasFeature('multi_users');

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

      // Get license ID from the current user's company_users entry
      const { data: currentUserEntry } = await supabase
        .from('company_users')
        .select('license_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!currentUserEntry?.license_id) {
        // User not in any company - not an error for users without team
        setCurrentUserRole(null);
        setIsLoading(false);
        return;
      }

      const licenseId = currentUserEntry.license_id;
      setCurrentUserRole(currentUserEntry.role as TeamRole);

      // Fetch team members
      const { data: companyUsers, error: usersError } = await supabase
        .from('company_users')
        .select('*')
        .eq('license_id', licenseId)
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
        .eq('license_id', licenseId)
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
    fetchTeam();
  }, [fetchTeam]);

  const inviteMember = useCallback(async (email: string, role: TeamRole, displayName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!canManageTeam) {
      return { success: false, error: 'Vous n\'avez pas les permissions pour inviter des membres' };
    }

    if (!canAddMore) {
      return { success: false, error: `Limite de ${maxUsers} utilisateur(s) atteinte pour votre forfait` };
    }

    if (role === 'owner') {
      return { success: false, error: 'Impossible d\'inviter un propriétaire' };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Non authentifié' };
      }

      // Get license ID
      const { data: license } = await supabase
        .from('licenses')
        .select('id')
        .eq('license_code', licenseData?.code)
        .maybeSingle();

      if (!license) {
        return { success: false, error: 'Licence non trouvée' };
      }

      // Check if already a member or invited
      const { data: existingMember } = await supabase
        .from('company_users')
        .select('id')
        .eq('license_id', license.id)
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingMember) {
        return { success: false, error: 'Cet utilisateur est déjà membre de l\'équipe' };
      }

      const { data: existingInvite } = await supabase
        .from('company_invitations')
        .select('id')
        .eq('license_id', license.id)
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)
        .maybeSingle();

      if (existingInvite) {
        return { success: false, error: 'Une invitation est déjà en attente pour cet email' };
      }

      // Create invitation and add user to company_users with display_name
      const { error: insertError } = await supabase
        .from('company_invitations')
        .insert({
          license_id: license.id,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        });

      if (insertError) {
        console.error('Error creating invitation:', insertError);
        return { success: false, error: 'Erreur lors de la création de l\'invitation' };
      }

      // Also create company_users entry with display_name so user gets name from start
      const { error: userError } = await supabase
        .from('company_users')
        .insert({
          license_id: license.id,
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
  }, [canManageTeam, canAddMore, maxUsers, licenseData?.code, fetchTeam]);

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

      if (member.role === 'owner') {
        return { success: false, error: 'Impossible de modifier le rôle du propriétaire' };
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
      return { success: false, error: 'Seul le propriétaire peut supprimer des membres' };
    }

    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        return { success: false, error: 'Membre non trouvé' };
      }

      if (member.role === 'owner') {
        return { success: false, error: 'Impossible de supprimer le propriétaire' };
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
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    refreshTeam: fetchTeam,
  };
}
