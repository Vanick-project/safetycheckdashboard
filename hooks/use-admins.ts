'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  Admin,
  AdminDetail,
  AdminDetailResponse,
  AdminsListResponse,
  InviteAdminBody,
  InviteAdminResponse,
  UpdateAdminResponse,
  UpdateAdminRoleBody,
  UpdateAdminStatusBody,
} from '@/lib/admin-types';
import type { AdminRole } from '@/lib/types';

// ─── Query keys ──────────────────────────────────────────────────────────────
//
// Convention identique à usersKeys / statsKeys — factory pour éviter
// les typos et faciliter les invalidations groupées.
//
//   queryClient.invalidateQueries({ queryKey: adminsKeys.all });         // tout
//   queryClient.invalidateQueries({ queryKey: adminsKeys.lists() });     // listes
//   queryClient.invalidateQueries({ queryKey: adminsKeys.detail(id) });  // 1 admin
export const adminsKeys = {
  all: ['admins'] as const,
  lists: () => [...adminsKeys.all, 'list'] as const,
  list: (filters: UseAdminsOptions) =>
    [...adminsKeys.lists(), filters] as const,
  details: () => [...adminsKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminsKeys.details(), id] as const,
};

// ─── useAdmins (liste paginée) ───────────────────────────────────────────────

export interface UseAdminsOptions {
  search?: string;
  role?: AdminRole;
  /** true = actifs seulement, false = inactifs (suspendus + supprimés).
   *  undefined = pas de filtre. */
  isActive?: boolean;
  /** 'none' pour filtrer les admins sans org, ou un ID d'org spécifique. */
  organizationId?: string;
  limit?: number;
}

/**
 * Liste paginée des admins. Cursor-based sur createdAt DESC.
 * Calqué sur useAdminUsers — même pattern useInfiniteQuery.
 */
export function useAdmins(options: UseAdminsOptions = {}) {
  const { search, role, isActive, organizationId, limit = 25 } = options;

  return useInfiniteQuery({
    queryKey: adminsKeys.list({ search, role, isActive, organizationId, limit }),
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (role) params.set('role', role);
      if (isActive !== undefined) {
        params.set('isActive', isActive ? 'true' : 'false');
      }
      if (organizationId) params.set('organizationId', organizationId);
      if (pageParam) params.set('cursor', pageParam);

      return apiFetch<AdminsListResponse>(
        `/admin/admins?${params.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // La liste des admins bouge très peu (créations rares, changements
    // rares). Pas de refetch au focus, l'utilisateur cliquera "Rafraîchir"
    // s'il vient d'inviter quelqu'un depuis un autre onglet.
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

// ─── useAdmin (détail) ────────────────────────────────────────────────────────

/**
 * Détail complet d'un admin (profil + sessions + createdBy + organization).
 * `enabled: !!id` — sécurité contre les appels avec id undefined.
 */
export function useAdmin(id: string | undefined) {
  return useQuery({
    queryKey: id ? adminsKeys.detail(id) : adminsKeys.details(),
    queryFn: async () => {
      const res = await apiFetch<AdminDetailResponse>(`/admin/admins/${id}`);
      return res.admin;
    },
    enabled: !!id,
    // Le detail a des sessions récentes qu'on veut voir se rafraîchir si
    // on revient sur la page après un peu de temps. 30s de staleTime est
    // un bon compromis.
    staleTime: 30_000,
  });
}

// ─── useInviteAdmin ──────────────────────────────────────────────────────────

/**
 * Envoie une invitation à un email. Le backend crée un token 48h et envoie
 * un email via Resend. Aucun optimistic update — l'invitation n'apparaît
 * pas dans la liste (la liste ne contient que des AdminUser, pas des
 * AdminInvitation). On invalide la liste au cas où le user apparaisse
 * immédiatement (peu probable, mais safe).
 */
export function useInviteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: InviteAdminBody) => {
      return apiFetch<InviteAdminResponse>('/admin/admins/invite', {
        method: 'POST',
        body,
      });
    },
    onSuccess: () => {
      // L'invitation n'apparaît pas dans la liste des AdminUser tant qu'elle
      // n'est pas acceptée. Mais on invalide quand même par prudence (au cas
      // où le user accepterait très vite et rafraîchirait la page).
      queryClient.invalidateQueries({ queryKey: adminsKeys.lists() });
    },
  });
}

// ─── useUpdateAdminRole ──────────────────────────────────────────────────────

interface UpdateRoleVariables {
  id: string;
  body: UpdateAdminRoleBody;
}

/**
 * Change le rôle d'un admin. Optimistic update sur le detail en cache,
 * rollback en cas d'erreur, invalidation systématique de la liste.
 *
 * Contraintes backend (rappel) :
 *   - SUPER_ADMIN uniquement
 *   - Interdit sur soi-même (self_action_forbidden)
 *   - Refuse de rétrograder le dernier SUPER_ADMIN actif (last_super_admin)
 */
export function useUpdateAdminRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: UpdateRoleVariables) => {
      return apiFetch<UpdateAdminResponse>(`/admin/admins/${id}`, {
        method: 'PATCH',
        body,
      });
    },

    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: adminsKeys.detail(id) });

      const previousDetail = queryClient.getQueryData<AdminDetail>(
        adminsKeys.detail(id),
      );

      if (previousDetail) {
        queryClient.setQueryData<AdminDetail>(adminsKeys.detail(id), {
          ...previousDetail,
          role: body.role,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousDetail };
    },

    onError: (_err, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          adminsKeys.detail(id),
          context.previousDetail,
        );
      }
    },

    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: adminsKeys.lists() });
    },
  });
}

// ─── useUpdateAdminStatus ─────────────────────────────────────────────────────

interface UpdateStatusVariables {
  id: string;
  body: UpdateAdminStatusBody;
}

/**
 * Change le statut d'un admin (suspend/reactivate/delete). Comportement
 * identique à useUpdateUserStatus — optimistic update + rollback + invalidation.
 *
 * Contraintes backend (rappel) :
 *   - SUPER_ADMIN uniquement
 *   - Interdit sur soi-même
 *   - Refuse de suspendre/supprimer le dernier SUPER_ADMIN actif
 *   - reason obligatoire si status === 'DELETED'
 *   - Side effect DELETED : révoque toutes les sessions actives
 *     + préfixe email → l'admin ne pourra plus se connecter immédiatement
 *
 * Note : l'optimistic update patche `isActive` selon le statut cible, MAIS
 * ne peut pas simuler le préfixe [DELETED-...] sur l'email (le timestamp
 * dépend du serveur). Le rendu du badge DELETED n'apparaîtra qu'après
 * l'invalidation qui refetch les vraies données.
 */
export function useUpdateAdminStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: UpdateStatusVariables) => {
      return apiFetch<UpdateAdminResponse>(`/admin/admins/${id}/status`, {
        method: 'PATCH',
        body,
      });
    },

    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: adminsKeys.detail(id) });

      const previousDetail = queryClient.getQueryData<AdminDetail>(
        adminsKeys.detail(id),
      );

      if (previousDetail) {
        // isActive dérive du status cible côté backend :
        //   ACTIVE   → isActive: true
        //   PAUSED   → isActive: false
        //   DELETED  → isActive: false (+ email préfixé, non simulable ici)
        const nextIsActive = body.status === 'ACTIVE';
        queryClient.setQueryData<AdminDetail>(adminsKeys.detail(id), {
          ...previousDetail,
          isActive: nextIsActive,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previousDetail };
    },

    onError: (_err, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          adminsKeys.detail(id),
          context.previousDetail,
        );
      }
    },

    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: adminsKeys.lists() });
    },
  });
}