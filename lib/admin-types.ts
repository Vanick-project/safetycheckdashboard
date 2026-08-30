// ─── lib/admin-types.ts ───────────────────────────────────────────────────────
// Types pour les endpoints /admin/admins.
//
// Contrat backend :
//   - GET  /admin/admins                    (list paginée cursor)
//   - GET  /admin/admins/:id                (detail avec sessions + createdBy)
//   - POST /admin/admins/invite             (invitation par email)
//   - POST /admin/admins/accept-invitation  (public, consomme le token)
//   - PATCH /admin/admins/:id               (change role)
//   - PATCH /admin/admins/:id/status        (suspend/reactivate/delete)
//
// Note sur les statuts : le backend n'a PAS de champ `status` explicite.
// L'état d'un admin se calcule depuis (email, isActive) :
//   - email préfixé "[DELETED-<ts>]-" → DELETED
//   - isActive === true               → ACTIVE
//   - isActive === false              → PAUSED
// Voir `computeAdminStatus` dans lib/admin-helpers.ts.

import type { AdminRole } from './types';

// ─── Statut UI (dérivé) ──────────────────────────────────────────────────────
export type AdminStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';

// ─── Résumé (dans liste, mutations, createdBy) ───────────────────────────────

/**
 * Champ `createdBy` renvoyé dans la liste (subset de AdminUser).
 * Backend : `select: { id, email, name }`
 */
export interface AdminCreatedBySummary {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Champ `createdBy` renvoyé dans le detail (avec role en plus).
 * Backend : `select: { id, email, name, role }`
 */
export interface AdminCreatedByDetail extends AdminCreatedBySummary {
  role: AdminRole;
}

/**
 * Item de la liste (GET /admin/admins). Correspond à ADMIN_SAFE_SELECT
 * + createdBy + _count backend.
 */
export interface Admin {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  organizationId: string | null;
  twoFactorEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null; // ISO datetime
  createdById: string | null;
  createdAt: string;          // ISO datetime
  updatedAt: string;          // ISO datetime
  createdBy: AdminCreatedBySummary | null;
  _count: {
    sessions: number;
    createdAdmins: number;
  };
}

// ─── Detail (GET /admin/admins/:id) ──────────────────────────────────────────

/**
 * Session admin (5 dernières renvoyées dans le detail).
 * `refreshTokenHash` est FILTRÉ côté backend — jamais renvoyé au client.
 */
export interface AdminSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;         // ISO datetime
  revokedAt: string | null;  // ISO datetime, null si session encore active
  createdAt: string;         // ISO datetime
}

/**
 * Organisation associée (null tant que le multi-tenant B2B n'est pas activé).
 */
export interface AdminOrganizationRef {
  id: string;
  name: string;
  slug: string;
  status: string;
}

export interface AdminDetail {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  organizationId: string | null;
  twoFactorEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: AdminCreatedByDetail | null;
  organization: AdminOrganizationRef | null;
  _count: {
    sessions: number;
    createdAdmins: number;
  };
  sessions: AdminSession[]; // 5 dernières
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface AdminsListResponse {
  items: Admin[];
  nextCursor: string | null;
  total: number;
}

export interface AdminDetailResponse {
  admin: AdminDetail;
}

// ─── Invitation ───────────────────────────────────────────────────────────────

export interface AdminInvitationSummary {
  id: string;
  email: string;
  role: AdminRole;
  expiresAt: string;  // ISO datetime
  createdAt: string;  // ISO datetime
}

export interface InviteAdminBody {
  email: string;
  role: AdminRole;
  /** Requis si role commence par ORG_, interdit sinon. */
  organizationId?: string;
}

export interface InviteAdminResponse {
  invitation: AdminInvitationSummary;
  /** ID du message renvoyé par Resend (utile pour tracking). Absent si le
   *  provider ne le fournit pas. */
  emailMessageId?: string;
}

// ─── Modification de l'interface existante ─────────────────────────────────
//
// Le backend a été mis à jour pour inclure invitationId dans le body de
// l'erreur 409 invitation_pending, permettant au frontend de proposer une
// action "Révoquer et réinviter" inline dans le toast.

export interface InvitationPendingErrorDetails {
  invitationId: string;  // ← nouveau champ
  expiresAt: string;
}

// ─── Accept invitation (page publique) ────────────────────────────────────────

export interface AcceptInvitationBody {
  token: string;
  name: string;
  password: string;
}

export interface AcceptInvitationResponse {
  tempToken: string;
  mustSetup2fa: true;
  admin: {
    id: string;
    email: string;
    name: string;
    role: AdminRole;
  };
}

// ─── Mutations (update role / status) ─────────────────────────────────────────

export interface UpdateAdminRoleBody {
  role: AdminRole;
  reason?: string;
}

export interface UpdateAdminStatusBody {
  status: AdminStatus;
  /** Obligatoire côté backend si status === 'DELETED'. */
  reason?: string;
}

export interface UpdateAdminResponse {
  admin: Admin;
}

// ─── Codes d'erreur backend ───────────────────────────────────────────────────
//
// Union des `error` codes que le backend peut renvoyer sur /admin/admins/*.
// Utilisé pour narrow le mapping vers les messages Sonner français.
export type AdminErrorCode =
  | 'invalid_body'
  | 'invalid_query'
  | 'invalid_params'
  | 'admin_not_found'
  | 'email_already_admin'
  | 'invitation_pending'
  | 'role_org_mismatch'
  | 'last_super_admin'
  | 'self_action_forbidden'
  | 'invalid_transition'
  | 'email_send_failed'
  | 'invalid_token'
  | 'token_expired'
  // ── Nouveaux codes DELETE /admin/admins/invitations/:id ──
  | 'invitation_not_found'
  | 'invitation_already_consumed'
  | 'invitation_already_revoked';


// ─── Ajouts pour DELETE /admin/admins/invitations/:id ───────────────────────

/**
 * Body optionnel pour la révocation.
 */
export interface RevokeInvitationBody {
  reason?: string;
}

/**
 * Response 200 après révocation réussie.
 */
export interface RevokeInvitationResponse {
  invitation: {
    id: string;
    email: string;
    role: AdminRole;
    revokedAt: string;      // ISO datetime
    revokedById: string;
  };
}

/**
 * Details des erreurs 409 sur DELETE invitations.
 * Le backend inclut la date pertinente pour contexte utilisateur.
 */
export interface InvitationAlreadyConsumedErrorDetails {
  consumedAt: string;
}

export interface InvitationAlreadyRevokedErrorDetails {
  revokedAt: string;
}