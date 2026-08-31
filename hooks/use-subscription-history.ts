// ─── hooks/use-subscription-history.ts ───────────────────────────────────────
// Hook TanStack Query pour GET /admin/users/:id/subscription-history.

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  SubscriptionHistoryQueryParams,
  SubscriptionHistoryResponse,
} from '@/lib/subscription-types';

// ─── Query keys factory ──────────────────────────────────────────────────────

export const subscriptionKeys = {
  all: ['subscription'] as const,
  histories: () => [...subscriptionKeys.all, 'history'] as const,
  history: (userId: string, params?: SubscriptionHistoryQueryParams) =>
    [...subscriptionKeys.histories(), userId, params ?? {}] as const,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

interface UseSubscriptionHistoryOptions {
  /** Taille de page. Défaut UI = 25 (chargement rapide, "Charger plus" pour la suite). */
  limit?: number;
  /**
   * SUPER_ADMIN uniquement — expose le champ payload brut du webhook RC.
   * En v1 du UI on laisse toujours false. Un futur toggle debug pourra
   * le passer à true côté SUPER_ADMIN seulement.
   */
  includeRaw?: boolean;
  /**
   * Désactive la fetch (utile si on veut mount le hook conditionnellement
   * sans le monter tout court). Le RBAC gate côté UI gère déjà le rôle
   * ANALYST — cette option est surtout pour du differ-loading côté page.
   */
  enabled?: boolean;
}

/**
 * Récupère l'historique paginé d'abonnement d'un utilisateur.
 *
 * `aggregate` et `user` sont retournés à CHAQUE page mais on affiche
 * ceux de la première page uniquement — ils ne varient pas selon la
 * pagination (le backend recalcule sur toute la table).
 */
export function useSubscriptionHistory(
  userId: string,
  options: UseSubscriptionHistoryOptions = {},
) {
  const { limit = 25, includeRaw = false, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: subscriptionKeys.history(userId, { limit, includeRaw }),
    queryFn: async ({ pageParam }) => {
      const query = new URLSearchParams();
      query.set('limit', String(limit));
      if (pageParam) query.set('cursor', pageParam);
      if (includeRaw) query.set('includeRaw', 'true');

      return apiFetch<SubscriptionHistoryResponse>(
        `/admin/users/${userId}/subscription-history?${query.toString()}`,
      );
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : null,
    enabled: enabled && Boolean(userId),
    // 60s de fraîcheur : les events RC arrivent via webhook, pas besoin de
    // refetch agressif. Cohérent avec le cache des stats admin.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}