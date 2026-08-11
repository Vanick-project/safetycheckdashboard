import { Badge } from '@/components/ui/badge';
import type { Plan } from '@/lib/types';

interface UserPlanBadgeProps {
  plan: Plan;
}

/**
 * Badge pour le plan d'abonnement.
 *   FREE  → outline (neutre, minimal)
 *   BASIC → default (mis en avant — c'est le plan payant qu'on veut visualiser)
 */
export function UserPlanBadge({ plan }: UserPlanBadgeProps) {
  return (
    <Badge
      variant={plan === 'BASIC' ? 'default' : 'outline'}
      className="font-mono text-xs"
    >
      {plan}
    </Badge>
  );
}