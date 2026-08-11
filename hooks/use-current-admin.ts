'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { can, capabilitiesFor, type Capability } from '@/lib/rbac';
import type { AdminRole } from '@/lib/types';

/**
 * Hook agrégé pour l'admin courant + les helpers RBAC associés.
 *
 * Préféré à `useAuth()` direct dans les composants qui font surtout des
 * vérifs de permissions — évite la duplication `useAuth().admin?.role` +
 * appel manuel à `can()`.
 *
 * Usage :
 *   const { role, isReady, hasCapability } = useCurrentAdmin();
 *   if (!isReady) return <Skeleton />;
 *   if (hasCapability('users.delete')) { ... }
 */
export function useCurrentAdmin() {
  const { admin, isBooting } = useAuth();
  const role: AdminRole | null = admin?.role ?? null;

  // useMemo pour stabiliser la référence du helper — évite les rerenders
  // inutiles chez les consumers qui le passent en dépendance.
  const hasCapability = useMemo(
    () => (capability: Capability) => can(role, capability),
    [role],
  );

  return {
    admin,
    role,
    /** true quand le boot auth est terminé ET l'admin est chargé */
    isReady: !isBooting && admin !== null,
    /** true pendant le refresh initial */
    isBooting,
    hasCapability,
    /** Liste des capabilities du rôle courant (pour debug/UI) */
    capabilities: useMemo(() => capabilitiesFor(role), [role]),
  };
}

/**
 * Raccourci pratique quand on veut juste tester une capability dans du JSX.
 *
 * Usage :
 *   const canDelete = useCan('users.delete');
 *   {canDelete && <Button>Supprimer</Button>}
 */
export function useCan(capability: Capability): boolean {
  const { hasCapability } = useCurrentAdmin();
  return hasCapability(capability);
}