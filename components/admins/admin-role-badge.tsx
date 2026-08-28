'use client';

import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/lib/rbac';
import type { AdminRole } from '@/lib/types';

interface AdminRoleBadgeProps {
  role: AdminRole;
}

// ─── Style par rôle ──────────────────────────────────────────────────────────
//
// SUPER_ADMIN = primaire (couleur brand) — c'est le rôle le plus élevé.
// ADMIN       = bleu foncé — pouvoir CRUD complet sauf gestion admins.
// FINANCE     = vert — lié à la facturation.
// SUPPORT     = orange — action-oriented, opérations.
// ANALYST     = violet — read-only, focus données.
// ORG_*       = gris — pas encore activés en prod, style neutre.

const ROLE_CLASSES: Record<AdminRole, string> = {
  SUPER_ADMIN:
    'border-primary/40 bg-primary/10 text-primary dark:bg-primary/20',
  ADMIN:
    'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-200',
  FINANCE:
    'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200',
  SUPPORT:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200',
  ANALYST:
    'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-200',
  ORG_OWNER:
    'border-border bg-muted text-muted-foreground',
  ORG_ADMIN:
    'border-border bg-muted text-muted-foreground',
  ORG_VIEWER:
    'border-border bg-muted text-muted-foreground',
};

export function AdminRoleBadge({ role }: AdminRoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`font-medium ${ROLE_CLASSES[role] ?? ''}`}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}