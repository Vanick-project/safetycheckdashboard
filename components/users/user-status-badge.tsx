import { Badge } from '@/components/ui/badge';
import type { UserStatus } from '@/lib/types';

interface UserStatusBadgeProps {
  status: UserStatus;
}

/**
 * Badge sémantique pour le status d'un user.
 *   ACTIVE  → default (bleu de marque)
 *   PAUSED  → secondary (neutre — état intermédiaire, réversible)
 *   DELETED → destructive (rouge — état terminal)
 */
export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const variant = statusVariant(status);
  const label = statusLabel(status);

  return (
    <Badge variant={variant} className="font-mono text-xs">
      {label}
    </Badge>
  );
}

function statusVariant(
  status: UserStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'ACTIVE':
      return 'default';
    case 'PAUSED':
      return 'secondary';
    case 'DELETED':
      return 'destructive';
  }
}

function statusLabel(status: UserStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Actif';
    case 'PAUSED':
      return 'Suspendu';
    case 'DELETED':
      return 'Supprimé';
  }
}