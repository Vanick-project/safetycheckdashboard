// ─── hooks/use-sessions.ts ────────────────────────────────────────────────────
// Hooks TanStack Query pour les 3 endpoints /admin/me/sessions*.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  MySessionsListResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
} from '@/lib/settings-types';

// ─── Query keys factory ──────────────────────────────────────────────────────

export const sessionsKeys = {
  all: ['me', 'sessions'] as const,
  lists: () => [...sessionsKeys.all, 'list'] as const,
  list: (includeRevoked: boolean) =>
    [...sessionsKeys.lists(), { includeRevoked }] as const,
};

// ─── GET /admin/me/sessions ──────────────────────────────────────────────────

/**
 * Récupère la liste des sessions de l'admin courant.
 *
 * Pas de polling automatique — le briefing backend n'en demande pas et ça
 * générerait du bruit dans la table à cause de la token rotation. L'user
 * clique "Actualiser" s'il veut voir un nouveau device qui vient de se
 * connecter.
 */
export function useSessions(includeRevoked: boolean = false) {
  return useQuery<MySessionsListResponse>({
    queryKey: sessionsKeys.list(includeRevoked),
    queryFn: () =>
      apiFetch<MySessionsListResponse>(
        `/admin/me/sessions?includeRevoked=${includeRevoked}`,
      ),
    // 30s de fraîcheur : cohérent avec la sensibilité de la donnée (sécu)
    // sans refetch agressif à chaque focus.
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

// ─── DELETE /admin/me/sessions/:id ───────────────────────────────────────────

/**
 * Révoque une session spécifique. À gérer côté appelant :
 *  - Si `wasCurrentSession=true` → logout + redirect /login
 *  - Sinon → refetch la liste
 *
 * On invalide toutes les variantes de list() dans onSuccess pour couvrir
 * le cas où la carte a bascule includeRevoked=true entre-temps.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation<RevokeSessionResponse, unknown, { sessionId: string }>({
    mutationFn: ({ sessionId }) =>
      apiFetch<RevokeSessionResponse>(`/admin/me/sessions/${sessionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKeys.lists() });
    },
  });
}

// ─── DELETE /admin/me/sessions (révoque toutes les autres) ───────────────────

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();

  return useMutation<RevokeAllSessionsResponse, unknown, void>({
    mutationFn: () =>
      apiFetch<RevokeAllSessionsResponse>('/admin/me/sessions', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionsKeys.lists() });
    },
  });
}