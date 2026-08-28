'use client';

import Link from 'next/link';
import {
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
  UserPen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminRoleBadge } from './admin-role-badge';
import { AdminStatusBadge } from './admin-status-badge';
import { useCan } from '@/hooks/use-current-admin';
import { useAuth } from '@/lib/auth-context';
import {
  computeAdminStatus,
  extractOriginalEmail,
  formatAdminDisplayName,
} from '@/lib/admin-helpers';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Admin } from '@/lib/admin-types';

interface AdminsTableProps {
  admins: Admin[];
  /** Callback pour ouvrir la modale de changement de rôle. */
  onRequestRoleChange: (admin: Admin) => void;
  /** Callback pour ouvrir la modale de suspend/reactivate. */
  onRequestStatusChange: (
    admin: Admin,
    action: 'suspend' | 'reactivate' | 'delete',
  ) => void;
}

// ─── Empty state ─────────────────────────────────────────────────────────────
export function AdminsTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShieldCheck className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold">
        {hasFilters
          ? 'Aucun admin ne correspond à vos filtres.'
          : 'Aucun admin trouvé.'}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilters
          ? 'Essayez de modifier ou de réinitialiser vos filtres.'
          : 'Invitez un premier admin pour commencer.'}
      </p>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────

export function AdminsTable({
  admins,
  onRequestRoleChange,
  onRequestStatusChange,
}: AdminsTableProps) {
  const canManage = useCan('admins.manage');
  const { admin: currentAdmin } = useAuth();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Admin</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>2FA</TableHead>
            <TableHead>Dernière connexion</TableHead>
            <TableHead>Créé par</TableHead>
            <TableHead>Créé le</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {admins.map((admin) => (
            <AdminRow
              key={admin.id}
              admin={admin}
              isSelf={currentAdmin?.id === admin.id}
              canManage={canManage}
              onRequestRoleChange={onRequestRoleChange}
              onRequestStatusChange={onRequestStatusChange}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface AdminRowProps {
  admin: Admin;
  isSelf: boolean;
  canManage: boolean;
  onRequestRoleChange: (admin: Admin) => void;
  onRequestStatusChange: (
    admin: Admin,
    action: 'suspend' | 'reactivate' | 'delete',
  ) => void;
}

function AdminRow({
  admin,
  isSelf,
  canManage,
  onRequestRoleChange,
  onRequestStatusChange,
}: AdminRowProps) {
  const status = computeAdminStatus(admin);
  const displayName = formatAdminDisplayName(admin);
  const displayEmail = extractOriginalEmail(admin.email);

  // ─── Actions disponibles ──────────────────────────────────────────────
  // Auto-protection UI (Q1) : jamais d'actions sur soi-même dans le menu.
  // Actions par statut : DELETED = terminal, aucune action possible.
  const canShowActions = canManage && !isSelf && status !== 'DELETED';

  return (
    <TableRow>
      {/* Admin (nom + email) */}
      <TableCell>
        <Link
          href={`/settings/admins/${admin.id}`}
          className="group flex flex-col gap-0.5"
        >
          <span className="font-medium text-foreground group-hover:underline">
            {displayName}
            {isSelf && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (vous)
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">{displayEmail}</span>
        </Link>
      </TableCell>

      {/* Rôle */}
      <TableCell>
        <AdminRoleBadge role={admin.role} />
      </TableCell>

      {/* Statut */}
      <TableCell>
        <AdminStatusBadge status={status} />
      </TableCell>

      {/* 2FA */}
      <TableCell>
        {admin.twoFactorEnabled ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"
            title="2FA activé"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Activé
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
            title="2FA non activé"
          >
            <ShieldOff className="h-3.5 w-3.5" />
            Non activé
          </span>
        )}
      </TableCell>

      {/* Dernière connexion */}
      <TableCell className="text-sm">
        {admin.lastLoginAt ? (
          <span
            title={formatDateTime(admin.lastLoginAt)}
            className="text-muted-foreground"
          >
            {formatRelative(admin.lastLoginAt)}
          </span>
        ) : (
          <span className="text-xs italic text-muted-foreground">
            Jamais connecté
          </span>
        )}
      </TableCell>

      {/* Créé par */}
      <TableCell className="text-sm">
        {admin.createdBy ? (
          <span className="text-muted-foreground" title={admin.createdBy.email}>
            {admin.createdBy.name ?? admin.createdBy.email}
          </span>
        ) : (
          <span className="text-xs italic text-muted-foreground">Système</span>
        )}
      </TableCell>

      {/* Créé le */}
      <TableCell className="text-sm text-muted-foreground">
        <span title={formatDateTime(admin.createdAt)}>
          {formatRelative(admin.createdAt)}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell>
        {canShowActions ? (
          <DropdownMenu>
            {/* Base UI Nova : DropdownMenuTrigger transmet ses props au
                child via le pattern natif Base UI. On lui passe render pour
                remplacer l'élément racine par notre Button.
                
                Note : Base UI Menu.Trigger accepte un prop `render` qui prend
                un élément React et compose les handlers dessus. C'est
                l'équivalent Base UI du asChild Radix. */}
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {/* DropdownMenuItem ne supporte pas asChild.
                  Solution : on met le Link à l'intérieur avec les mêmes
                  styles de layout que l'item par défaut. Le click sur l'item
                  déclenche le click sur le Link nested. */}
              <DropdownMenuItem
                onClick={(e) => {
                  // Prevent double-navigation (click DropdownMenuItem +
                  // click Link nested). On laisse le Link gérer la nav.
                  e.stopPropagation();
                }}
                className="p-0"
              >
                <Link
                  href={`/settings/admins/${admin.id}`}
                  className="flex w-full items-center gap-1.5 px-1.5 py-1"
                >
                  <UserPen className="h-4 w-4" />
                  Voir détail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRequestRoleChange(admin)}>
                Changer le rôle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {status === 'ACTIVE' && (
                <DropdownMenuItem
                  onClick={() => onRequestStatusChange(admin, 'suspend')}
                >
                  Suspendre
                </DropdownMenuItem>
              )}
              {status === 'PAUSED' && (
                <DropdownMenuItem
                  onClick={() => onRequestStatusChange(admin, 'reactivate')}
                >
                  Réactiver
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onRequestStatusChange(admin, 'delete')}
                variant="destructive"
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Fallback sans dropdown : lien simple vers le detail.
          // Button ne supporte pas asChild → on utilise juste un Link
          // stylé en bouton icon.
          <Link
            href={`/settings/admins/${admin.id}`}
            aria-label="Voir détail"
            title="Voir détail"
            className="
              inline-flex h-9 w-9 items-center justify-center
              rounded-md text-muted-foreground
              transition-colors
              hover:bg-accent hover:text-foreground
            "
          >
            <MoreHorizontal className="h-4 w-4" />
          </Link>
        )}
      </TableCell>
    </TableRow>
  );
}