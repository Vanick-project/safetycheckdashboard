// ─── lib/settings-types.ts ────────────────────────────────────────────────────
// Types pour les endpoints /admin/me/* (préférences perso admin).
// À étendre au fur et à mesure des sous-checkpoints 5c.1 (change password),
// 5c.2 (sessions management), 5c.3 (reset 2FA).

// ─── 5c.1 · Change password ──────────────────────────────────────────────────

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

/**
 * Réponse 200 de POST /admin/me/change-password.
 *
 * Trois cas UI distincts :
 *  - keptCurrentSession=true, revokedSessionsCount>0 : nominal multi-device,
 *    user reste loggé, N autres sessions déconnectées
 *  - keptCurrentSession=true, revokedSessionsCount=0 : nominal solo, aucune
 *    autre session à révoquer
 *  - keptCurrentSession=false : fallback rare (edge case backend), la session
 *    courante a aussi été révoquée, il faut déclencher un logout côté UI
 */
export interface ChangePasswordResponse {
  ok: true;
  revokedSessionsCount: number;
  keptCurrentSession: boolean;
}

/** Codes possibles dans ApiError.code pour POST /admin/me/change-password. */
export type ChangePasswordErrorCode =
  | 'invalid_body'
  | 'invalid_current_password'
  | 'too_many_attempts'
  | 'missing_token'
  | 'invalid_token'
  | 'token_expired';

// ─── 5c.2 · Sessions management ──────────────────────────────────────────────

/**
 * Une session de l'admin courant telle que retournée par
 * GET /admin/me/sessions.
 *
 * ⚠️ Attention à la sémantique de `createdAt` : le backend fait de la token
 * rotation à chaque refresh (~15 min). Donc `createdAt` = date de la dernière
 * rotation = dernière activité effective, PAS date du login initial.
 * L'UI l'affiche comme "Dernière activité : il y a X min", pas "connecté
 * depuis".
 *
 * `isCurrent` est dérivé côté backend à partir du cookie httpOnly admin_rt
 * de la requête — c'est la source de vérité, pas de logique frontend à
 * ajouter.
 */
export interface MySession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
}

export interface MySessionsListResponse {
  sessions: MySession[];
  total: number;
  includeRevoked: boolean;
}

/**
 * Réponse 200 de DELETE /admin/me/sessions/:id (révoque une seule session).
 *
 * Si `wasCurrentSession=true`, l'admin a révoqué SA session → le frontend
 * doit déclencher un logout immédiat (clear access token + redirect /login).
 * Le prochain call retournerait 401 de toute façon puisque le cookie
 * admin_rt correspondant est révoqué en DB.
 */
export interface RevokeSessionResponse {
  ok: true;
  wasCurrentSession: boolean;
  sessionId: string;
}

/**
 * Réponse 200 de DELETE /admin/me/sessions (révoque toutes les AUTRES).
 *
 * Nominal : keptCurrentSession=true, la courante est préservée grâce au
 * cookie httpOnly. Fallback rare : keptCurrentSession=false (cookie manquant),
 * même traitement que wasCurrentSession=true → logout immédiat.
 */
export interface RevokeAllSessionsResponse {
  ok: true;
  revokedCount: number;
  keptCurrentSession: boolean;
}

/** Codes possibles dans ApiError.code pour les endpoints /admin/me/sessions*. */
export type SessionErrorCode =
  | 'invalid_params'
  | 'session_not_found'
  | 'session_already_revoked';