'use client';

import { useMemo, useState } from 'react';
import { UserPlus, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RequireCapability } from '@/components/auth/require-capability';
import { AdminsFilters } from '@/components/admins/admins-filters';
import type {
  AdminsFiltersState,
  IsActiveFilter,
} from '@/components/admins/admins-filters';
import { AdminsTable, AdminsTableEmpty } from '@/components/admins/admins-table';
import { InviteAdminModal } from '@/components/admins/invite-admin-modal';
import { useAdmins, useUpdateAdminStatus } from '@/hooks/use-admins';
import { useCan } from '@/hooks/use-current-admin';
import { isDeletedEmail } from '@/lib/admin-helpers';
import type { Admin } from '@/lib/admin-types';

// ─── Double-state pattern (input vs applied) ─────────────────────────────────
//
// Le search est saisi dans un input : on ne veut pas fire une query à chaque
// frappe. On sépare l'état "input" (contrôlé, immédiat) de l'état "applied"
// (envoyé à la query TanStack). Bouton "Rechercher" ou Enter → sync.
//
// Les autres filtres (role, isActive, showDeleted) sont appliqués
// immédiatement — pas de risque de flood, choix discrets.

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
  // State input (contrôlé par les inputs)
  const [inputFilters, setInputFilters] =
    useState<AdminsFiltersState>(INITIAL_FILTERS);
  // State applied (envoyé à la query)
  const [appliedFilters, setAppliedFilters] =
    useState<AdminsFiltersState>(INITIAL_FILTERS);

  const canManage = useCan('admins.manage');
  const [inviteOpen, setInviteOpen] = useState(false);

  // ─── Query ────────────────────────────────────────────────────────────
  //
  // Mapping filtres UI → params backend :
  //   isActive 'all'      → undefined (pas de filtre)
  //   isActive 'active'   → true
  //   isActive 'inactive' → false
  //
  // Le toggle "Afficher supprimés" est un filtre CLIENT-SIDE post-fetch,
  // parce que le backend ne distingue pas PAUSED de DELETED via isActive
  // (les 2 sont isActive=false). Voir isDeletedEmail() dans admin-helpers.

  const query = useAdmins({
    search: appliedFilters.search.trim() || undefined,
    role: appliedFilters.role,
    isActive: isActiveToBackend(appliedFilters.isActive),
    limit: 25,
  });

  // Flatten pages + filter client-side selon showDeleted
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

    // Les filtres discrets (role, isActive, showDeleted) s'appliquent
    // immédiatement — pas besoin d'attendre un submit.
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

  const handleSubmitSearch = () => {
    setAppliedFilters(inputFilters);
  };

  const handleReset = () => {
    setInputFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  // ─── Handlers actions row ─────────────────────────────────────────────
  //
  // La modale de role change et l'AlertDialog de status change seront
  // livrés au Checkpoint 5c.3 (page detail). Ici on route juste vers la
  // page detail — l'utilisateur y fera l'action.
  //
  // Décision de design : plutôt que de dupliquer les modales dans la page
  // liste, on centralise les actions dans /settings/admins/[id]. Le
  // dropdown de la row propose donc "Changer le rôle" et "Suspendre" qui
  // ouvriront ces modales sur la page detail.

  const statusMutation = useUpdateAdminStatus();

  const handleRoleChangeRequest = (admin: Admin) => {
    // Sera implémenté au 5c.3 sur la page detail. Pour l'instant on toast
    // + route.
    toast.info(`Ouvre la fiche de ${admin.email} pour changer le rôle.`);
    window.location.href = `/settings/admins/${admin.id}`;
  };

  const handleStatusChangeRequest = (
    admin: Admin,
    action: 'suspend' | 'reactivate' | 'delete',
  ) => {
    // Idem — délégué au 5c.3.
    toast.info(
      `Ouvre la fiche de ${admin.email} pour ${
        action === 'delete' ? 'supprimer' : action === 'suspend' ? 'suspendre' : 'réactiver'
      }.`,
    );
    window.location.href = `/settings/admins/${admin.id}`;
  };

  // Note pour 5c.3 : statusMutation sera utilisé sur la page detail, pas ici.
  void statusMutation;

  // ─── Render ───────────────────────────────────────────────────────────

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

          {/* Bouton Inviter : uniquement pour SUPER_ADMIN (admins.manage) */}
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Inviter un admin
            </Button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <AdminsFilters
        values={inputFilters}
        onChange={handleInputChange}
        onSubmitSearch={handleSubmitSearch}
        onReset={handleReset}
      />

      {/* Contenu */}
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

          {/* Pagination : bouton "Charger plus" cursor-based */}
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
    </div>
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