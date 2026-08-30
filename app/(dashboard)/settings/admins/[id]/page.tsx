'use client';

import { use, useState } from 'react';
import { AlertCircle, Loader2, ShieldOff } from 'lucide-react';
import { RequireCapability } from '@/components/auth/require-capability';
import { AdminDetailHeader } from '@/components/admins/admin-detail-header';
import { AdminSessionsList } from '@/components/admins/admin-sessions-list';
import { AdminStatusActions } from '@/components/admins/admin-status-actions';
import { AdminRoleChangeDialog } from '@/components/admins/admin-role-change-dialog';
import { useAdmin } from '@/hooks/use-admins';
import { useCan } from '@/hooks/use-current-admin';
import { useAuth } from '@/lib/auth-context';
import {
  computeAdminStatus,
  formatAdminDisplayName,
} from '@/lib/admin-helpers';
import { ApiError } from '@/lib/types';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

// Next.js 15+ pattern : les params sont wrappés dans une Promise, il faut
// les unwrap avec use() dans un client component.
interface AdminDetailPageProps {
  params: Promise<{ id: string }>;
}

// ─── Wrapper avec RequireCapability ──────────────────────────────────────────

export default function AdminDetailPage({ params }: AdminDetailPageProps) {
  return (
    <RequireCapability capability="admins.view">
      <AdminDetailPageContent params={params} />
    </RequireCapability>
  );
}

// ─── Contenu ─────────────────────────────────────────────────────────────────

function AdminDetailPageContent({ params }: AdminDetailPageProps) {
  const { id } = use(params);
  const query = useAdmin(id);

  const canManage = useCan('admins.manage');
  const { admin: currentAdmin } = useAuth();

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  // ─── Loading / Error states ──────────────────────────────────────────
  if (query.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (query.isError) {
    const isNotFound =
      query.error instanceof ApiError && query.error.code === 'admin_not_found';
    return (
      <div className="p-6">
        <div
          role="alert"
          className="mx-auto max-w-md rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/50"
        >
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600 dark:text-rose-500" />
          <h2 className="mt-3 text-lg font-semibold text-rose-900 dark:text-rose-100">
            {isNotFound ? 'Admin introuvable' : 'Impossible de charger'}
          </h2>
          <p className="mt-1 text-sm text-rose-900/80 dark:text-rose-100/80">
            {isNotFound
              ? "Cet admin n'existe pas ou a été supprimé de la base de données."
              : query.error instanceof Error
                ? query.error.message
                : 'Erreur inconnue.'}
          </p>
        </div>
      </div>
    );
  }

  const admin = query.data;
  if (!admin) return null;

  const isSelf = currentAdmin?.id === admin.id;
  const status = computeAdminStatus(admin);
  const displayName = formatAdminDisplayName(admin);

  // ─── Peut-on afficher les actions ? ───────────────────────────────────
  //
  // 3 conditions cumulatives :
  //   1. Le rôle courant a bien admins.manage (SUPER_ADMIN uniquement)
  //   2. Ce n'est pas soi-même (auto-protection UI Q1)
  //   3. L'admin n'est pas DELETED (état terminal côté backend)
  //
  // Note : même si canShowActions est false, on affiche le detail complet
  // (header, sessions) — juste pas les boutons.
  const canShowActions = canManage && !isSelf && status !== 'DELETED';

  return (
    <div className="space-y-6 p-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <AdminDetailHeader admin={admin} isSelf={isSelf} />

      {/* ─── Layout 2 colonnes (sessions + actions) ─────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche : sessions (2 tiers) */}
        <div className="lg:col-span-2">
          <AdminSessionsList sessions={admin.sessions} />
        </div>

        {/* Colonne droite : actions (1 tiers) */}
        <div className="space-y-4">
          {canShowActions ? (
            <AdminStatusActions
              adminId={admin.id}
              currentStatus={status}
              adminDisplayName={displayName}
              onRequestRoleChange={() => setRoleDialogOpen(true)}
            />
          ) : (
            <NoActionsPanel
              isSelf={isSelf}
              canManage={canManage}
              status={status}
            />
          )}
        </div>
      </div>

      {/* ─── Modale changement de rôle ──────────────────────────────── */}
      {canShowActions && (
        <AdminRoleChangeDialog
          open={roleDialogOpen}
          onOpenChange={setRoleDialogOpen}
          adminId={admin.id}
          adminDisplayName={displayName}
          currentRole={admin.role}
        />
      )}
    </div>
  );
}

// ─── Panneau "pas d'actions disponibles" ─────────────────────────────────────
//
// Explicite la raison pour laquelle l'admin voit un panneau vide, plutôt que
// de le laisser deviner. 3 raisons possibles :
//   - C'est soi-même
//   - Le rôle courant n'a pas admins.manage
//   - L'admin est DELETED (état terminal)

function NoActionsPanel({
  isSelf,
  canManage,
  status,
}: {
  isSelf: boolean;
  canManage: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'DELETED';
}) {
  let message: React.ReactNode;

  if (isSelf) {
    message = (
      <>
        Vous ne pouvez pas modifier votre propre compte via cette page. Pour
        changer votre mot de passe ou votre 2FA, utilisez la page{' '}
        <Link
          href="/settings"
          className="font-medium text-primary hover:underline"
        >
          Paramètres
        </Link>
        .
      </>
    );
  } else if (!canManage) {
    message =
      "Votre rôle ne permet pas de modifier les comptes admin. Consultation seule.";
  } else if (status === 'DELETED') {
    message =
      "Cet admin a été supprimé. Aucune action n'est possible via le dashboard.";
  } else {
    message = 'Aucune action disponible.';
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
      <div className="mb-2 flex items-center gap-2">
        <ShieldOff className="h-4 w-4" />
        <span className="font-medium">Consultation seule</span>
      </div>
      <p>{message}</p>
    </div>
  );
}