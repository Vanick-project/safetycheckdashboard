// ─── lib/admin-helpers.ts ─────────────────────────────────────────────────────
// Helpers pures pour les admins. Aucune dépendance UI, testables en isolation.

import type { AdminErrorCode, AdminStatus } from './admin-types';

// ─── Format DELETED backend ──────────────────────────────────────────────────
//
// Quand un admin est supprimé, le backend préfixe son email pour libérer
// la contrainte unique : `[DELETED-<timestamp>]-<original-email>`.
// Ces helpers permettent de manipuler ce format côté UI.

const DELETED_EMAIL_REGEX = /^\[DELETED-\d+\]-(.+)$/;

/**
 * Retourne true si l'email suit le format DELETED backend.
 * Marqueur unique d'un admin supprimé (l'admin garde `isActive: false`
 * mais un simple PAUSED aurait le même isActive).
 */
export function isDeletedEmail(email: string): boolean {
  return DELETED_EMAIL_REGEX.test(email);
}

/**
 * Extrait l'email original d'un email préfixé DELETED. Retourne l'email
 * inchangé s'il n'est pas préfixé — safe à appeler sur n'importe quel email.
 *
 *   extractOriginalEmail('[DELETED-1723456789]-alice@example.com')
 *     → 'alice@example.com'
 *   extractOriginalEmail('bob@example.com')
 *     → 'bob@example.com'
 */
export function extractOriginalEmail(email: string): string {
  const match = email.match(DELETED_EMAIL_REGEX);
  return match ? match[1]! : email;
}

/**
 * Extrait le timestamp de suppression (en millisecondes epoch) d'un email
 * DELETED. Retourne null si l'email n'est pas au format DELETED.
 * Utile pour afficher "Supprimé le <date>".
 */
export function extractDeletedTimestamp(email: string): number | null {
  const match = email.match(/^\[DELETED-(\d+)\]-/);
  return match ? Number(match[1]) : null;
}

// ─── Calcul du statut UI ──────────────────────────────────────────────────────
//
// Le backend n'a pas de champ `status` explicite sur AdminUser. On dérive
// l'état depuis (email, isActive) selon la convention backend :
//
//   isDeletedEmail(email) === true  → DELETED
//   isActive === true               → ACTIVE
//   isActive === false              → PAUSED
//
// Cette logique doit rester alignée avec le backend
// (`src/routes/admin/admins.ts`, calcul `currentStatus` dans PATCH /status).

export function computeAdminStatus(admin: {
  email: string;
  isActive: boolean;
}): AdminStatus {
  if (isDeletedEmail(admin.email)) return 'DELETED';
  return admin.isActive ? 'ACTIVE' : 'PAUSED';
}

// ─── Format d'affichage ──────────────────────────────────────────────────────

/**
 * Nom affichable d'un admin : name si présent, sinon email (original).
 * Utile partout où on veut un identifiant humain (breadcrumbs, toasts,
 * modales de confirmation, etc.).
 */
export function formatAdminDisplayName(admin: {
  name: string | null;
  email: string;
}): string {
  if (admin.name && admin.name.trim().length > 0) return admin.name;
  return extractOriginalEmail(admin.email);
}

// ─── Rôles org vs platform ────────────────────────────────────────────────────

/**
 * Un rôle "org" (ORG_OWNER, ORG_ADMIN, ORG_VIEWER) nécessite un
 * organizationId associé. Les rôles "platform" (SUPER_ADMIN, ADMIN, etc.)
 * ne peuvent PAS avoir d'organizationId.
 *
 * Utilisé par le form d'invitation pour afficher/masquer le sélecteur
 * d'organisation selon le rôle choisi.
 */
export function isOrgRole(role: string): boolean {
  return role.startsWith('ORG_');
}

// ─── Mapping erreurs backend → messages français UX ──────────────────────────
//
// Wordings validés au Checkpoint 5c planning. Utilisé par les toasts Sonner
// sur toutes les mutations admin. Retourne un message générique si le code
// n'est pas mappé (edge case pour codes futurs non anticipés).
//
// Note : certains messages contiennent des placeholders {var} à interpoler
// par l'appelant (ex : {date} pour invitation_pending).

interface ErrorMessageContext {
  /** Utilisé dans invitation_pending pour afficher la date d'expiration. */
  expiresAt?: string;
}

export function adminErrorMessage(
  code: AdminErrorCode | string,
  ctx: ErrorMessageContext = {},
): string {
  switch (code) {
    case 'email_already_admin':
      return 'Un admin avec cet email existe déjà.';

    case 'invitation_pending': {
      if (ctx.expiresAt) {
        const d = new Date(ctx.expiresAt);
        const formatted = d.toLocaleString('fr-FR', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `Une invitation est déjà en cours pour cet email (expire le ${formatted}).`;
      }
      return 'Une invitation est déjà en cours pour cet email.';
    }

    case 'last_super_admin':
      return 'Impossible : au moins un Super Admin actif doit exister à tout moment.';

    case 'self_action_forbidden':
      return 'Vous ne pouvez pas modifier votre propre compte via cette page.';

    case 'email_send_failed':
      return "L'invitation n'a pas pu être envoyée (problème email). Réessayez ou contactez le support.";

    case 'role_org_mismatch':
      return 'Le rôle sélectionné nécessite (ou interdit) une organisation associée.';

    case 'invalid_transition':
      return "Cette transition de statut n'est pas autorisée.";

    case 'admin_not_found':
      return 'Cet admin est introuvable.';

    case 'invalid_body':
    case 'invalid_query':
    case 'invalid_params':
      return 'Requête invalide.';

    // Codes de la page publique accept-invitation
    case 'invalid_token':
      return "Ce lien d'invitation est invalide ou a déjà été utilisé.";
    case 'token_expired':
      return "Ce lien d'invitation a expiré. Demandez un nouveau lien au super admin.";

    default:
      return `Erreur inattendue (${code}).`;
  }
}