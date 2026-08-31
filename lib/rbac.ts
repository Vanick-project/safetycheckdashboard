// ─── lib/rbac.ts ──────────────────────────────────────────────────────────────
// Matrice de permissions UI du dashboard.
//
// IMPORTANT : cette matrice est purement UI. Le backend a sa propre matrice
// dans les middlewares `requireRole([...])`. L'UI n'est PAS la source de
// vérité pour la sécurité — un user malicieux peut appeler l'API directement.
// L'UI se contente de cacher ce que le rôle courant ne peut pas faire, pour
// éviter les 403 disgracieux et guider l'utilisateur.
//
// Convention des capabilities : `namespace.action`
//   - dashboard.view      : voir la page /dashboard
//   - users.view          : voir la liste + détail des users
//   - users.suspend       : PATCH status ACTIVE ↔ PAUSED (les deux sens)
//   - users.delete        : PATCH status → DELETED (terminal)
//   - audit-log.view      : voir la page /audit-log
//   - admins.view         : voir la liste des admins
//   - admins.manage       : CRUD complet des admins (invite/edit/suspend)
//   - payments.view       : voir l'historique d'abonnement d'un user
//                           (GET /admin/users/:id/subscription-history)

import type { AdminRole } from './types';

export const CAPABILITIES = {
  'dashboard.view':  ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'ANALYST'],
  'users.view':      ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'ANALYST'],
  'users.suspend':   ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  'users.delete':    ['SUPER_ADMIN', 'ADMIN'],
  'audit-log.view':  ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'ANALYST'],
  'admins.view':     ['SUPER_ADMIN', 'ADMIN'],
  'admins.manage':   ['SUPER_ADMIN'],
  // Données de paiement au niveau nominatif : ANALYST exclu (accès aux
  // aggregate anonymes du dashboard suffit — le nominatif est plus sensible).
  // Rôles org exclus par défaut, activer si le B2B devient tenant-aware.
  'payments.view':   ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT'],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Capability = keyof typeof CAPABILITIES;

/**
 * Retourne true si `role` a la capability demandée.
 *
 * Deny-by-default : si `role` est null/undefined (utilisateur pas encore
 * chargé, ou pas connecté), retourne toujours false. Les composants qui
 * s'appuient dessus doivent gérer eux-mêmes l'état "en cours de chargement".
 */
export function can(
  role: AdminRole | null | undefined,
  capability: Capability,
): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly AdminRole[]).includes(role);
}

/**
 * Retourne toutes les capabilities qu'a un rôle donné. Utile pour du debug
 * ou pour afficher "Votre rôle vous permet de…" quelque part dans les settings.
 */
export function capabilitiesFor(
  role: AdminRole | null | undefined,
): Capability[] {
  if (!role) return [];
  return (Object.keys(CAPABILITIES) as Capability[]).filter((cap) =>
    can(role, cap),
  );
}

/**
 * Label lisible d'un rôle pour l'affichage UI (badges, headers, etc.).
 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  SUPPORT: 'Support',
  ANALYST: 'Analyste',
  // ─── Rôles org (multi-tenant B2B — pas encore activé) ─────────────────
  ORG_OWNER: 'Propriétaire (org)',
  ORG_ADMIN: 'Admin (org)',
  ORG_VIEWER: 'Lecteur (org)',
} as const;