'use client';

import { Badge } from '@/components/ui/badge';
import type { AdminStatus } from '@/lib/admin-types';

interface AdminStatusBadgeProps {
  status: AdminStatus;
}

// ─── Style par statut ────────────────────────────────────────────────────────
//
// Vert / orange / gris — cohérent avec UserStatusBadge côté /users.
// On garde une nuance visuelle explicite pour DELETED (barré + gris terne)
// puisque cet état empêche toute action.

// Extrait dans un type alias : Record<Enum, { ... }> écrit sur plusieurs lignes
// dans un fichier .tsx trouble le parser JSX (il essaie de parser l'inline
// object type comme un object literal). Le type alias résout l'ambiguïté.
type StatusConfig = {
  label: string;
  className: string;
};

const STATUS_CONFIG: Record<AdminStatus, StatusConfig> = {
  ACTIVE: {
    label: 'Actif',
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200',
  },
  PAUSED: {
    label: 'Suspendu',
    className:
      'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200',
  },
  DELETED: {
    label: 'Supprimé',
    className:
      'border-rose-300 bg-rose-50 text-rose-800 line-through dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200',
  },
};

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={`font-medium ${className}`}>
      {label}
    </Badge>
  );
}