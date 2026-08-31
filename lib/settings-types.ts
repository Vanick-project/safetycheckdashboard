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

// ─── Codes d'erreur attendus (référence typée) ────────────────────────────────

/** Codes possibles dans ApiError.code pour POST /admin/me/change-password. */
export type ChangePasswordErrorCode =
  | 'invalid_body'
  | 'invalid_current_password'
  | 'too_many_attempts'
  // Ceux-ci sont normalement mangés par l'intercepteur (refresh auto)
  | 'missing_token'
  | 'invalid_token'
  | 'token_expired';