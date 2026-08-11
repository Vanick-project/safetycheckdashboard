'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  AdminStatsResponse,
  StatsQueryParams,
} from '@/lib/stats-types';

// ─── Query keys ──────────────────────────────────────────────────────────────
//
// Même convention que usersKeys : namespace + factory pour faciliter les
// invalidations groupées et éviter les typos.
//
//   queryClient.invalidateQueries({ queryKey: statsKeys.all });       // tout
//   queryClient.invalidateQueries({ queryKey: statsKeys.admin() });   // /admin
export const statsKeys = {
  all: ['stats'] as const,
  admin: () => [...statsKeys.all, 'admin'] as const,
  byPeriod: (params: StatsQueryParams) =>
    [...statsKeys.admin(), params] as const,
};

// ─── useAdminStats ───────────────────────────────────────────────────────────

/**
 * Hook TanStack Query pour GET /admin/stats.
 *
 * Alignement du cache client sur le cache serveur :
 * - Le backend cache 60s pour les périodes préréglées → staleTime 60_000.
 * - Pour custom, le backend ne cache pas → staleTime 0 (refetch systématique
 *   à chaque changement de dates).
 */
export function useAdminStats(params: StatsQueryParams) {
  return useQuery({
    queryKey: statsKeys.byPeriod(params),
    queryFn: async () => {
      const search = new URLSearchParams();
      search.set('period', params.period);
      if (params.period === 'custom') {
        if (params.from) search.set('from', params.from);
        if (params.to) search.set('to', params.to);
      }
      return apiFetch<AdminStatsResponse>(
        `/admin/stats?${search.toString()}`,
      );
    },
    staleTime: params.period === 'custom' ? 0 : 60_000,
    // Comme sur les autres pages admin : pas de refetch au focus, on offre
    // un bouton "Rafraîchir" explicite dans le header du dashboard.
    refetchOnWindowFocus: false,
  });
}