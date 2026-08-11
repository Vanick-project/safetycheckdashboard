'use client';

import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  UsersFilters,
  type PlanFilter,
  type StatusFilter,
} from '@/components/users/users-filters';
import { UsersTable } from '@/components/users/users-table';
import { useAdminUsers } from '@/hooks/use-admin-users';
import type { Plan, UserStatus } from '@/lib/types';

export default function UsersPage() {
  // ─── État "en cours d'édition" ─────────────────────────────────────────
  // Initialisés à 'ALL' pour que les Selects affichent "Tous status" et
  // "Tous plans" au premier render, sans filtre appliqué.
  const [searchInput, setSearchInput] = useState('');
  const [statusInput, setStatusInput] = useState<StatusFilter>('ALL');
  const [planInput, setPlanInput] = useState<PlanFilter>('ALL');

  // ─── État "appliqué" (envoyé au serveur) ───────────────────────────────
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>('ALL');
  const [appliedPlan, setAppliedPlan] = useState<PlanFilter>('ALL');

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useAdminUsers({
    search: appliedSearch || undefined,
    // Conversion 'ALL' → undefined uniquement ici, au point d'appel API.
    // Le reste du code garde des types stricts sans nullable.
    status:
      appliedStatus === 'ALL' ? undefined : (appliedStatus as UserStatus),
    plan: appliedPlan === 'ALL' ? undefined : (appliedPlan as Plan),
    limit: 25,
  });

  const applyFilters = () => {
    setAppliedSearch(searchInput);
    setAppliedStatus(statusInput);
    setAppliedPlan(planInput);
  };

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground">
            {total > 0
              ? `${total.toLocaleString('fr-CA')} utilisateur${
                  total > 1 ? 's' : ''
                } au total`
              : 'Gestion des utilisateurs de l\u2019app'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
          />
          Rafraîchir
        </Button>
      </div>

      <UsersFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        status={statusInput}
        onStatusChange={setStatusInput}
        plan={planInput}
        onPlanChange={setPlanInput}
        onApply={applyFilters}
      />

      <UsersTable items={items} isLoading={isLoading} />

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Charger plus
          </Button>
        </div>
      )}
    </div>
  );
}