// ─── lib/types.ts ─────────────────────────────────────────────────────────────
// Types partagés du dashboard admin.
// Miroir des réponses backend (src/routes/admin/*). Garder synchro avec le
// schéma Prisma côté serveur.

// ─── Rôles ────────────────────────────────────────────────────────────────────

// Rôles plateforme (AdminUser.role dans Prisma)
export type AdminRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'FINANCE'
  | 'SUPPORT'
  | 'ANALYST';

// Rôles organisation (future expansion B2B)
export type OrgRole = 'ORG_OWNER' | 'ORG_ADMIN' | 'ORG_VIEWER';

// ─── Modèles ──────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  status: string; // e.g. 'ACTIVE' | 'SUSPENDED' — gardé souple
}

/** Admin compact renvoyé par login / 2fa/verify / refresh. */
export interface AdminSummary {
  id: string;
  email: string;
  role: AdminRole;
  organizationId: string | null;
}

/** Profil complet renvoyé par GET /admin/me. */
export interface AdminMe {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
  organizationId: string | null;
  twoFactorEnabled: boolean;
  lastLoginAt: string | null; // ISO
  createdAt: string;          // ISO
  organization: Organization | null;
}

// ─── Réponses auth ────────────────────────────────────────────────────────────

/** POST /admin/auth/login → première fois, doit setup 2FA */
export interface LoginRequires2faSetupResponse {
  requires2faSetup: true;
  tempToken: string;
}

/** POST /admin/auth/login → 2FA déjà enrôlé, doit saisir le code */
export interface LoginRequires2faResponse {
  requires2fa: true;
  tempToken: string;
}

export type LoginResponse =
  | LoginRequires2faSetupResponse
  | LoginRequires2faResponse;

/** POST /admin/auth/2fa/setup */
export interface TwoFactorSetupResponse {
  qrCodeDataUrl: string;   // data:image/png;base64,...
  manualEntryKey: string;  // fallback saisie manuelle
  issuer: string;
  accountName: string;
}

/** POST /admin/auth/2fa/enable | /2fa/verify | /refresh — session complète */
export interface SessionResponse {
  accessToken: string;
  expiresIn: number; // secondes
  admin: AdminSummary;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string; // ISO
}

export interface AuditLogQuery {
  action?: string;
  actorEmail?: string;
  since?: string;
  until?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditLogResponse {
  items: AuditLogItem[];
  nextCursor: string | null;
  total: number;
}

// ─── Erreurs API ──────────────────────────────────────────────────────────────
// Le backend renvoie `{ error: string }` (+ details parfois).
// On l'enveloppe dans une classe pour `instanceof` dans les try/catch.

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, details?: unknown) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}