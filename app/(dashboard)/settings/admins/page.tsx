'use client';

import { useMemo, useState } from 'react';
import { UserPlus, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequireCapability } from '@/components/auth/require-capability';
import { AdminsFilters } from '@/components/admins/admins-filters';
import type {
  AdminsFiltersState,
  IsActiveFilter,
} from '@/components/admins/admins-filters';
import { AdminsTable, AdminsTableEmpty } from '@/components/admins/admins-table';
import { InviteAdminModal } from '@/components/admins/invite-admin-modal';
import { AdminRoleChangeDialog } from '@/components/admins/admin-role-change-dialog';
import { useAdmins } from '@/hooks/use-admins';
import { useCan } from '@/hooks/use-current-admin';
import {
  computeAdminStatus,
  formatAdminDisplayName,
  isDeletedEmail,
} from '@/lib/admin-helpers';
import type { Admin, AdminStatus } from '@/lib/admin-types';
// Import du dialog de status actions — extrait de la logique de la page
// detail pour réutilisation ici. Voir note en bas de fichier.
import { useUpdateAdminStatus } from '@/hooks/use-admins';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { adminErrorMessage } from '@/lib/admin-helpers';
import { ApiError } from '@/lib/types';

const INITIAL_FILTERS: AdminsFiltersState = {
  search: '',
  role: undefined,
  isActive: 'all',
  showDeleted: false,
};

export default function AdminsPage() {
  return (
    <RequireCapability capability="admins.view">
      <AdminsPageContent />
    </RequireCapability>
  );
}

function AdminsPageContent() {
  const [inputFilters, setInputFilters] =
    useState<AdminsFiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AdminsFiltersState>(INITIAL_FILTERS);

  const canManage = useCan('admins.manage');
  const [inviteOpen, setInviteOpen] = useState(false);

  // ─── State pour les modales d'action depuis la row dropdown ───────────
  //
  // On stocke l'admin cible pour partager avec les 2 modales. Une modale
  // par action ouverte à la fois — pas de conflit possible.
  const [roleChangeTarget, setRoleChangeTarget] = useState<Admin | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    admin: Admin;
    action: 'suspend' | 'reactivate' | 'delete';
  } | null>(null);

  // ─── Query ────────────────────────────────────────────────────────────
  const query = useAdmins({
    search: appliedFilters.search.trim() || undefined,
    role: appliedFilters.role,
    isActive: isActiveToBackend(appliedFilters.isActive),
    limit: 25,
  });

  const admins: Admin[] = useMemo(() => {
    const flat = query.data?.pages.flatMap((p) => p.items) ?? [];
    if (appliedFilters.showDeleted) return flat;
    return flat.filter((a) => !isDeletedEmail(a.email));
  }, [query.data, appliedFilters.showDeleted]);

  const total = query.data?.pages[0]?.total ?? 0;
  const hasActiveFilters =
    appliedFilters.search.trim().length > 0 ||
    appliedFilters.role !== undefined ||
    appliedFilters.isActive !== 'all' ||
    appliedFilters.showDeleted;

  // ─── Handlers filtres ─────────────────────────────────────────────────
  const handleInputChange = (patch: Partial<AdminsFiltersState>) => {
    setInputFilters((prev) => ({ ...prev, ...patch }));

    const immediateKeys: Array<keyof AdminsFiltersState> = [
      'role',
      'isActive',
      'showDeleted',
    ];
    const hasImmediate = immediateKeys.some((k) => k in patch);
    if (hasImmediate) {
      setAppliedFilters((prev) => ({ ...prev, ...patch }));
    }
  };

  const handleSubmitSearch = () => setAppliedFilters(inputFilters);
  const handleReset = () => {
    setInputFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  // ─── Handlers row actions ─────────────────────────────────────────────
  const handleRoleChangeRequest = (admin: Admin) => {
    setRoleChangeTarget(admin);
  };

  const handleStatusChangeRequest = (
    admin: Admin,
    action: 'suspend' | 'reactivate' | 'delete',
  ) => {
    setStatusChangeTarget({ admin, action });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admins</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les comptes admin du dashboard.
            {query.isSuccess && total > 0 && (
              <>
                {' · '}
                <span className="font-medium text-foreground">
                  {total} admin{total > 1 ? 's' : ''}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            aria-label="Rafraîchir"
            title="Rafraîchir"
          >
            <RefreshCw
              className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`}
            />
          </Button>

          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Inviter un admin
            </Button>
          )}
        </div>
      </div>

      <AdminsFilters
        values={inputFilters}
        onChange={handleInputChange}
        onSubmitSearch={handleSubmitSearch}
        onReset={handleReset}
      />

      {query.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : query.isError ? (
        <ErrorBanner
          message={
            query.error instanceof Error
              ? query.error.message
              : 'Impossible de charger les admins.'
          }
          onRetry={() => query.refetch()}
        />
      ) : admins.length === 0 ? (
        <AdminsTableEmpty hasFilters={hasActiveFilters} />
      ) : (
        <>
          <AdminsTable
            admins={admins}
            onRequestRoleChange={handleRoleChangeRequest}
            onRequestStatusChange={handleStatusChangeRequest}
          />

          {query.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Charger plus
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modale d'invitation */}
      <InviteAdminModal open={inviteOpen} onOpenChange={setInviteOpen} />

      {/* Modale de changement de rôle depuis la row */}
      {roleChangeTarget && (
        <AdminRoleChangeDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setRoleChangeTarget(null);
          }}
          adminId={roleChangeTarget.id}
          adminDisplayName={formatAdminDisplayName(roleChangeTarget)}
          currentRole={roleChangeTarget.role}
        />
      )}

      {/* AlertDialog de changement de status depuis la row (inline) */}
      {statusChangeTarget && (
        <StatusChangeInlineDialog
          admin={statusChangeTarget.admin}
          action={statusChangeTarget.action}
          onClose={() => setStatusChangeTarget(null)}
        />
      )}
    </div>
  );
}

// ─── StatusChangeInlineDialog ────────────────────────────────────────────────
//
// Version "inline dans la liste" de l'AlertDialog de suspend/reactivate/delete.
// Utilise la même logique que AdminStatusActions (page detail) mais adaptée
// pour recevoir l'admin en prop plutôt que via state interne.
//
// Design decision : on ne réutilise pas AdminStatusActions directement parce
// que ce composant rend un panneau "Actions" avec boutons + AlertDialog. Ici
// on veut juste l'AlertDialog déclenché depuis l'extérieur. Faire un split
// entre le panneau et le dialog compliquerait le composant pour un seul
// usage — on duplique ~40 lignes de dialog logic, acceptable.

interface StatusChangeInlineDialogProps {
  admin: Admin;
  action: 'suspend' | 'reactivate' | 'delete';
  onClose: () => void;
}

function StatusChangeInlineDialog({
  admin,
  action,
  onClose,
}: StatusChangeInlineDialogProps) {
  const mutation = useUpdateAdminStatus();
  const [reason, setReason] = useState('');
  const displayName = formatAdminDisplayName(admin);
  const isPending = mutation.isPending;

  const runAction = async () => {
    if (action === 'delete' && reason.trim().length === 0) {
      toast.error('La raison de la suppression est obligatoire.');
      return;
    }

    const targetStatus: AdminStatus =
      action === 'suspend'
        ? 'PAUSED'
        : action === 'reactivate'
          ? 'ACTIVE'
          : 'DELETED';

    try {
      await mutation.mutateAsync({
        id: admin.id,
        body: {
          status: targetStatus,
          ...(reason.trim().length > 0 && { reason: reason.trim() }),
        },
      });
      toast.success(
        action === 'delete'
          ? `${displayName} a été supprimé.`
          : action === 'suspend'
            ? `${displayName} a été suspendu.`
            : `${displayName} a été réactivé.`,
      );
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(adminErrorMessage(err.code));
      } else {
        toast.error('Erreur inattendue.');
      }
    }
  };

  return (
    <AlertDialog
      open={true}
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === 'suspend' && 'Suspendre cet admin ?'}
            {action === 'reactivate' && 'Réactiver cet admin ?'}
            {action === 'delete' && 'Supprimer cet admin ?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === 'suspend' &&
              `${displayName} ne pourra plus se connecter au dashboard tant qu'il n'est pas réactivé.`}
            {action === 'reactivate' &&
              `${displayName} pourra de nouveau se connecter au dashboard.`}
            {action === 'delete' && (
              <>
                <strong>Action irréversible.</strong> {displayName} sera
                supprimé et toutes ses sessions révoquées.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {action !== 'reactivate' && (
          <div className="space-y-2">
            <Label htmlFor="inline-action-reason">
              Raison{' '}
              {action === 'delete' ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(optionnel)</span>
              )}
            </Label>
            <Textarea
              id="inline-action-reason"
              placeholder={
                action === 'delete'
                  ? 'Ex : départ de la société, compte compromis…'
                  : 'Ex : suspension temporaire pour investigation…'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={isPending}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              runAction();
            }}
            disabled={isPending}
            className={
              action === 'delete'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {action === 'suspend' && 'Suspendre'}
            {action === 'reactivate' && 'Réactiver'}
            {action === 'delete' && 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Helpers locaux ──────────────────────────────────────────────────────────

function isActiveToBackend(v: IsActiveFilter): boolean | undefined {
  if (v === 'all') return undefined;
  return v === 'active';
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-100"
    >
      <div>
        <div className="font-medium">Impossible de charger les admins</div>
        <div className="mt-1 text-sm opacity-90">{message}</div>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}