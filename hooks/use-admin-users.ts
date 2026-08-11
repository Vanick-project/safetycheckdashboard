'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  Plan,
  UpdateUserStatusBody,
  UpdateUserStatusResponse,
  User,
  UserDetailResponse,
  UserStatus,
  UsersListResponse,
} from '@/lib/types';

// ─── Query keys ──────────────────────────────────────────────────────────────
//
// Convention : ['users', ...] est le namespace. La factory centralise pour
// éviter les typos et faciliter les invalidations groupées :
//
//   queryClient.invalidateQueries({ queryKey: usersKeys.all });     // tout
//   queryClient.invalidateQueries({ queryKey: usersKeys.lists() }); // listes
//   queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) }); // 1 user
export const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (filters: UseAdminUsersOptions) =>
    [...usersKeys.lists(), filters] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
};

// ─── useAdminUsers (liste paginée) ───────────────────────────────────────────

export interface UseAdminUsersOptions {
  search?: string;
  status?: UserStatus;
  plan?: Plan;
  organizationId?: string;
  limit?: number;
}

/**
 * Hook TanStack Query pour la liste des users avec pagination par curseur.
 * Calqué sur useAuditLog — même pattern useInfiniteQuery.
 */
export function useAdminUsers(options: UseAdminUsersOptions = {}) {
  const { search, status, plan, organizationId, limit = 25 } = options;

  return useInfiniteQuery({
    queryKey: usersKeys.list({ search, status, plan, organizationId, limit }),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (plan) params.set('plan', plan);
      if (organizationId) params.set('organizationId', organizationId);
      if (pageParam) params.set('cursor', pageParam);

      return apiFetch<UsersListResponse>(
        `/admin/users?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Pas de refetch au focus : la liste peut être longue et le contenu
    // ne bouge pas assez souvent pour justifier des round-trips. On offre
    // un bouton "Rafraîchir" comme sur /audit-log.
    refetchOnWindowFocus: false,
  });
}

// ─── useAdminUser (détail) ────────────────────────────────────────────────────

/**
 * Récupère le détail complet d'un user (profil + contacts + check-ins + alerts).
 *
 * `enabled` : n'exécute la query que si `id` est défini — utile quand le hook
 * est appelé depuis une page qui lit `id` d'un route param potentiellement
 * indéfini au premier render.
 */
export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: id ? usersKeys.detail(id) : usersKeys.details(),
    queryFn: async () => {
      const res = await apiFetch<UserDetailResponse>(`/admin/users/${id}`);
      return res.user;
    },
    enabled: !!id,
    // Le détail contient beaucoup de données mais elles bougent peu.
    // 30s de staleTime évite les refetch inutiles pendant qu'on navigue.
    staleTime: 30_000,
  });
}

// ─── useUpdateUserStatus (mutation avec optimistic update) ────────────────────

interface UpdateStatusVariables {
  id: string;
  body: UpdateUserStatusBody;
}

/**
 * Mutation pour changer le status d'un user (suspend / reactivate / delete).
 *
 * Comportement :
 *   1. On snapshot le détail user en cache AVANT la mutation.
 *   2. On patch localement le status → l'UI répond instantanément.
 *   3. Sur success : on invalide toutes les listes (les compteurs et les
 *      filtres par status peuvent avoir changé).
 *   4. Sur error : on restaure le snapshot → l'UI redevient cohérente.
 *
 * L'appelant peut brancher `onSuccess` / `onError` pour toast + redirect,
 * ce hook se limite à la synchro cache.
 */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: UpdateStatusVariables) => {
      return apiFetch<UpdateUserStatusResponse>(
        `/admin/users/${id}/status`,
        {
          method: 'PATCH',
          body,
        },
      );
    },

    onMutate: async ({ id, body }) => {
      // Empêche un refetch en cours d'écraser notre update optimiste.
      await queryClient.cancelQueries({ queryKey: usersKeys.detail(id) });

      const previousDetail = queryClient.getQueryData<User>(
        usersKeys.detail(id),
      );

      // Patch optimiste sur le détail si présent en cache.
      if (previousDetail) {
        queryClient.setQueryData<User>(usersKeys.detail(id), {
          ...previousDetail,
          status: body.status,
          updatedAt: new Date().toISOString(),
        });
      }

      // On retourne le snapshot au contexte pour rollback éventuel.
      return { previousDetail };
    },

    onError: (_err, { id }, context) => {
      // Rollback : restaure la valeur d'avant si on l'avait snapshottée.
      if (context?.previousDetail) {
        queryClient.setQueryData(
          usersKeys.detail(id),
          context.previousDetail,
        );
      }
    },

    onSettled: (_data, _err, { id }) => {
      // Invalidation systématique après réponse serveur (succès ou échec) :
      //   - détail user → re-sync avec la vérité serveur
      //   - toutes les listes → les compteurs par status peuvent changer,
      //     et le user peut disparaître d'une vue filtrée
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}