import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CompanyUser, TeamRole, TeamMember } from '@/types/team';
import { MAX_USERS_PER_PLAN } from '@/types/team';
import type { PlanType } from '@/hooks/useLicense';
import { useLicense } from '@/hooks/useLicense';
import { useLicenseContext } from '@/context/LicenseContext';

// Current user info for session isolation
interface CurrentUserInfo {
  displayName: string | null;
  email: string | null;
  userId: string | null;
}

interface UseTeamReturn {
  members: TeamMember[];
  currentUserRole: TeamRole | null;
  currentUserInfo: CurrentUserInfo;
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
  licensePlanType: PlanType;
  addMember: (email: string, role: TeamRole, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  updateMemberRole: (memberId: string, role: TeamRole) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  refreshTeam: () => Promise<void>;
}

export function useTeam(): UseTeamReturn {
  const { planType: validatedPlanType, isLoading: isLicenseLoading } = useLicense();
  const { licenseId: contextLicenseId, authUserId, userRole: contextUserRole } = useLicenseContext();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<TeamRole | null>(contextUserRole);
  const [currentUserInfo, setCurrentUserInfo] = useState<CurrentUserInfo>({
    displayName: null,
    email: null,
    userId: null,
  });
  const [licenseId, setLicenseId] = useState<string | null>(contextLicenseId);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const licensePlanType: PlanType = validatedPlanType || 'start';
  const licenseMaxUsers = MAX_USERS_PER_PLAN[licensePlanType] || 1;

  // Only consider team loading, license loading shouldn't block team page
  const isLoading = isTeamLoading;

  const maxUsers = licenseMaxUsers;
  const currentUserCount = members.filter(m => m.is_active).length;
  const canAddMore = currentUserCount < maxUsers;

  // Use context role as primary source, fallback to fetched role
  const effectiveRole = currentUserRole || contextUserRole;
  const isOwner = effectiveRole === 'direction';
  const isAdmin = effectiveRole === 'direction';
  const isDirection = effectiveRole === 'direction';
  const hasMultiUsers = licensePlanType === 'pro' || licensePlanType === 'enterprise';
  const canManageTeam = isDirection && hasMultiUsers;

  // Sync with context when it becomes available
  useEffect(() => {
    if (contextUserRole && !currentUserRole) {
      setCurrentUserRole(contextUserRole);
    }
    if (contextLicenseId && !licenseId) {
      setLicenseId(contextLicenseId);
    }
  }, [contextUserRole, contextLicenseId, currentUserRole, licenseId]);

  // Fetch team data
  const fetchTeam = useCallback(async (): Promise<void> => {
    // Wait for context to be ready
    if (!authUserId) {
      setIsTeamLoading(false);
      return;
    }

    try {
      setIsTeamLoading(true);
      setError(null);

      // Fetch current user entry
      const { data: currentUserEntry, error: userEntryError } = await supabase
        .from('company_users')
        .select('license_id, role, display_name, email')
        .eq('user_id', authUserId)
        .eq('is_active', true)
        .maybeSingle();

      if (userEntryError) {
        console.error('Error fetching user entry:', userEntryError);
      }

      if (!currentUserEntry?.license_id) {
        setCurrentUserRole(null);
        setCurrentUserInfo({ displayName: null, email: null, userId: authUserId });
        setLicenseId(null);
        setIsTeamLoading(false);
        return;
      }

      const currentLicenseId = currentUserEntry.license_id;
      setLicenseId(currentLicenseId);
      setCurrentUserRole(currentUserEntry.role as TeamRole);
      setCurrentUserInfo({
        displayName: currentUserEntry.display_name || null,
        email: currentUserEntry.email || null,
        userId: authUserId,
      });

      // Now fetch all team members for the license
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
          isCurrentUser: cu.user_id === authUserId,
        }));
        setMembers(teamMembers);
      }
    } catch (e) {
      console.error('Error in fetchTeam:', e);
      setError('Erreur inattendue');
    } finally {
      setIsTeamLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    if (authUserId) {
      fetchTeam();
    }
  }, [authUserId, fetchTeam]);

  // Add member directly (no invitation flow)
  const addMember = useCallback(async (email: string, role: TeamRole, displayName?: string): Promise<{ success: boolean; error?: string }> => {
    if (!canManageTeam) {
      return { success: false, error: 'Vous n\'avez pas les permissions pour ajouter des membres' };
    }

    if (!canAddMore) {
      return { success: false, error: `Limite de ${maxUsers} utilisateur(s) atteinte pour votre forfait` };
    }

    // Direction can add exploitation and membre, but not another direction
    if (role === 'direction') {
      return { success: false, error: 'Seul l\'administrateur système peut créer un compte Direction' };
    }

    if (!licenseId) {
      return { success: false, error: 'Aucune licence trouvée' };
    }

    if (!authUserId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('company_users')
        .select('id')
        .eq('license_id', licenseId)
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingMember) {
        return { success: false, error: 'Cet utilisateur est déjà membre de l\'équipe' };
      }

      // Create company_users entry directly
      const { error: userError } = await supabase
        .from('company_users')
        .insert({
          license_id: licenseId,
          email: email.toLowerCase(),
          role,
          display_name: displayName?.trim() || null,
          invited_by: authUserId,
          invited_at: new Date().toISOString(),
          is_active: true,
        });

      if (userError) {
        console.error('Error creating company user:', userError);
        return { success: false, error: 'Erreur lors de l\'ajout du membre' };
      }

      await fetchTeam();
      return { success: true };
    } catch (e) {
      console.error('Error in addMember:', e);
      return { success: false, error: 'Erreur inattendue' };
    }
  }, [authUserId, canManageTeam, canAddMore, maxUsers, licenseId, fetchTeam]);

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

  return {
    members,
    currentUserRole: effectiveRole,
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
    addMember,
    updateMemberRole,
    removeMember,
    refreshTeam: fetchTeam,
  };
}
