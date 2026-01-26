import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyUser, CompanyInvitation, TeamRole, TeamMember } from '@/types/team';
import { MAX_USERS_PER_PLAN } from '@/types/team';
import type { PlanType } from '@/hooks/useLicense';
import { useLicense } from '@/hooks/useLicense';

// Current user info for session isolation
interface CurrentUserInfo {
  displayName: string | null;
  email: string | null;
  userId: string | null;
}

interface UseTeamReturn {
  members: TeamMember[];
  pendingInvitations: CompanyInvitation[];
  currentUserRole: TeamRole | null;
  currentUserInfo: CurrentUserInfo; // User-specific info for display
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
  // Get planType from useLicense (already validated via edge function)
  const { planType: validatedPlanType, licenseData } = useLicense();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<CompanyInvitation[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(null);
  const [currentUserInfo, setCurrentUserInfo] = useState<CurrentUserInfo>({
    displayName: null,
    email: null,
    userId: null,
  });
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use planType from useLicense (validated via edge function) - fallback to 'start'
  const licensePlanType: PlanType = validatedPlanType || 'start';
  const licenseMaxUsers = MAX_USERS_PER_PLAN[licensePlanType] || 1;

  const maxUsers = licenseMaxUsers;
  const currentUserCount = members.filter(m => m.is_active).length;
  const pendingCount = pendingInvitations.filter(i => !i.accepted_at).length;
  const canAddMore = (currentUserCount + pendingCount) < maxUsers;

  // Map roles - direction is the admin level
  const isOwner = currentUserRole === 'direction';
  const isAdmin = currentUserRole === 'direction';
  const isDirection = currentUserRole === 'direction';
  // canManageTeam depends on the actual plan type
  const hasMultiUsers = licensePlanType === 'pro' || licensePlanType === 'enterprise';
  const canManageTeam = isDirection && hasMultiUsers;

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

      // Get license ID, role, and display_name from company_users for current user
      const { data: currentUserEntry, error: userError } = await supabase
        .from('company_users')
        .select('license_id, role, display_name, email')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (userError) {
        console.error('Error fetching user entry:', userError);
      }

      if (!currentUserEntry?.license_id) {
        // User not in any company - not an error for users without team
        setCurrentUserRole(null);
        setCurrentUserInfo({ displayName: null, email: user.email || null, userId: user.id });
        setLicenseId(null);
        setIsLoading(false);
        return;
      }

      const currentLicenseId = currentUserEntry.license_id;
      setLicenseId(currentLicenseId);
      setCurrentUserRole(currentUserEntry.role as TeamRole);
      // Set current user info for session isolation
      setCurrentUserInfo({
        displayName: currentUserEntry.display_name || null,
        email: currentUserEntry.email || user.email || null,
        userId: user.id,
      });

      // Note: planType is now obtained from useLicense hook (validated via edge function)
      // This avoids RLS issues with the licenses table

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
    fetchTeam();
  }, [fetchTeam]);

  const inviteMember = useCallback(async (email: string, role: TeamRole, displayName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!canManageTeam) {
      return { success: false, error: 'Vous n\'avez pas les permissions pour inviter des membres' };
    }

    if (!canAddMore) {
      return { success: false, error: `Limite de ${maxUsers} utilisateur(s) atteinte pour votre forfait` };
    }

    // Direction can invite exploitation and membre, but not another direction
    // Only admin panel can create direction users
    if (role === 'direction') {
      return { success: false, error: 'Seul l\'administrateur système peut créer un compte Direction' };
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

    if (role === 'direction') {
      return { success: false, error: 'Impossible de définir comme Direction' };
    }

    try {
      const member = members.find(m => m.id === memberId);
      if (!member) {
        return { success: false, error: 'Membre non trouvé' };
      }

      if (member.role === 'direction') {
        return { success: false, error: 'Impossible de modifier le rôle de la Direction' };
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

      if (member.role === 'direction') {
        return { success: false, error: 'Impossible de supprimer la Direction' };
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
    currentUserInfo,
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
