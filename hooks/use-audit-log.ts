'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { AuditLogQuery, AuditLogResponse } from '@/lib/types';

interface UseAuditLogOptions {
  action?: string;
  actorEmail?: string;
  limit?: number;
}

/**
 * Hook TanStack Query pour l'audit log avec pagination par curseur.
 *
 * Utilise `useInfiniteQuery` : chaque "page" correspond à un appel
 * GET /admin/audit-log?cursor=<nextCursor>&limit=<N>
 * Le backend renvoie `{ items, nextCursor, total }`.
 */
export function useAuditLog(options: UseAuditLogOptions = {}) {
  const { action, actorEmail, limit = 25 } = options;

  return useInfiniteQuery({
    queryKey: ['audit-log', { action, actorEmail, limit }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (action) params.set('action', action);
      if (actorEmail) params.set('actorEmail', actorEmail);
      if (pageParam) params.set('cursor', pageParam);

      return apiFetch<AuditLogResponse>(
        `/admin/audit-log?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Refetch quand l'onglet revient au focus — utile pour un audit log
    refetchOnWindowFocus: true,
  });
}