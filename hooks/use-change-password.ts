// ─── hooks/use-change-password.ts ─────────────────────────────────────────────
// Mutation TanStack Query pour POST /admin/me/change-password.
//
// Note importante : `credentials: 'include'` DOIT être appliqué par apiFetch
// globalement (le refresh existant repose déjà sur le cookie httpOnly admin_rt),
// donc pas besoin de l'injecter ici. Le backend utilise ce cookie pour
// identifier la session courante et NE PAS la révoquer.

import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type {
  ChangePasswordBody,
  ChangePasswordResponse,
} from '@/lib/settings-types';

export function useChangePassword() {
  return useMutation<ChangePasswordResponse, unknown, ChangePasswordBody>({
    mutationFn: (body) =>
      apiFetch<ChangePasswordResponse>('/admin/me/change-password', {
        method: 'POST',
        body,
      }),
    // Pas d'invalidation : rien dans les queries existantes ne dépend du
    // password de l'admin courant. Les sessions révoquées seront visibles
    // dans /settings/audit-log au prochain refetch naturel.
  });
}