import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, User, Cloud, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SharedDataBadgeProps {
  isShared: boolean;
  createdBy?: string;
  createdByEmail?: string;
  isOwn?: boolean;
  isFormerMember?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Badge to indicate if data is shared (company-level) or personal
 */
export function SharedDataBadge({ 
  isShared, 
  createdBy, 
  createdByEmail,
  isOwn = false,
  isFormerMember = false,
  compact = false,
  className 
}: SharedDataBadgeProps) {
  if (!isShared) {
    // Personal data (not synced with company)
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-xs font-normal cursor-help",
              compact && "px-1.5 py-0",
              className
            )}
          >
            <User className="h-3 w-3" />
            {!compact && "Local"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Donnée locale (non synchronisée)</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isOwn) {
    // Shared data created by current user
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "gap-1 text-xs font-normal cursor-help bg-primary/10 text-primary border-primary/20",
              compact && "px-1.5 py-0",
              className
            )}
          >
            <Cloud className="h-3 w-3" />
            {!compact && "Vous"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Créé par vous et partagé avec l'équipe</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Shared data created by a former member
  if (isFormerMember) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "gap-1 text-xs font-normal cursor-help bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
              compact && "px-1.5 py-0",
              className
            )}
          >
            <UserX className="h-3 w-3" />
            {!compact && (createdBy ? createdBy.split(' ')[0] : "Ancien")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Créé par un ancien membre</p>
          {createdByEmail && (
            <p className="text-xs text-muted-foreground">{createdByEmail}</p>
          )}
          {createdBy && !createdByEmail && (
            <p className="text-xs text-muted-foreground">{createdBy}</p>
          )}
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Cet utilisateur ne fait plus partie de la société
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Shared data created by another team member
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="secondary" 
          className={cn(
            "gap-1 text-xs font-normal cursor-help bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
            compact && "px-1.5 py-0",
            className
          )}
        >
          <Users className="h-3 w-3" />
          {!compact && (createdBy ? createdBy.split(' ')[0] : "Équipe")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">Partagé par l'équipe</p>
        {createdByEmail && (
          <p className="text-xs text-muted-foreground">{createdByEmail}</p>
        )}
        {createdBy && !createdByEmail && (
          <p className="text-xs text-muted-foreground">{createdBy}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Badge to show sync status
interface SyncStatusBadgeProps {
  isSynced: boolean;
  lastSyncAt?: string;
  compact?: boolean;
}

export function SyncStatusBadge({ isSynced, lastSyncAt, compact = false }: SyncStatusBadgeProps) {
  if (!isSynced) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("gap-1 text-xs cursor-help", compact && "px-1.5 py-0")}>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {!compact && "Local"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Donnée locale, non synchronisée avec le cloud</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("gap-1 text-xs text-green-600 cursor-help", compact && "px-1.5 py-0")}>
          <span className="h-2 w-2 rounded-full bg-green-500" />
          {!compact && "Sync"}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Synchronisé avec le cloud</p>
        {lastSyncAt && (
          <p className="text-xs text-muted-foreground">
            {new Date(lastSyncAt).toLocaleString('fr-FR')}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// Company indicator for header
interface CompanyIndicatorProps {
  companyName?: string;
  memberCount?: number;
  className?: string;
}

export function CompanyIndicator({ companyName, memberCount, className }: CompanyIndicatorProps) {
  if (!companyName) return null;

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20", className)}>
      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
        {companyName}
      </span>
      {memberCount && memberCount > 1 && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0">
          {memberCount} utilisateurs
        </Badge>
      )}
    </div>
  );
}
