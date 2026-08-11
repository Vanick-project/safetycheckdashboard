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

// ─── App Users (utilisateurs finaux de l'app mobile) ─────────────────────────
//
// Ne pas confondre avec AdminUser (admins du dashboard). Ici on parle des
// utilisateurs finaux de l'app SafetyCheck qu'on manage depuis le dashboard.
// Miroir du modèle `User` dans schema.prisma.

export type UserStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';
export type Plan = 'FREE' | 'BASIC';

/** Item de liste renvoyé par GET /admin/users (payload complet). */
export interface User {
  id: string;
  phoneNumber: string;
  email: string | null;
  firstName: string | null;
  plan: Plan;
  planExpiresAt: string | null; // ISO
  status: UserStatus;
  country: string;
  language: string;
  timezone: string | null;
  organizationId: string | null;
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
  lastCheckInAt: string | null; // ISO
  _count: {
    emergencyContacts: number;
    checkInEvents: number;
    alertEvents: number;
  };
}

/** Contact d'urgence embarqué dans le détail user. */
export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  relationship: string | null;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Check-in embarqué (les 10 derniers). */
export interface CheckInEvent {
  id: string;
  userId: string;
  sentAt: string;
  respondedAt: string | null;
  response: 'OK' | 'SOS' | null;
  attemptNumber: number;
}

/** Action d'une alerte (SMS/appel). */
export interface AlertAction {
  id: string;
  alertId: string;
  actionType: string;
  destination: string | null;
  outcome: string;
  providerSid: string | null;
  executedAt: string;
  humanAnswered: boolean;
  amdResult: string | null;
  callStatus: string | null;
  callDuration: number | null;
  contactId: string | null;
}

/** Alerte embarquée (les 10 dernières) + actions. */
export interface AlertEvent {
  id: string;
  userId: string;
  triggerReason:
    | 'NO_RESPONSE_AFTER_2_ATTEMPTS'
    | 'NO_RESPONSE_AFTER_3_REMINDERS'
    | 'NO_RESPONSE_AFTER_5_REMINDERS'
    | 'USER_PRESSED_SOS';
  triggeredAt: string;
  resolvedAt: string | null;
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED' | 'FAILED';
  latAtTrigger: number | null;
  lngAtTrigger: number | null;
  currentContactId: string | null;
  actions: AlertAction[];
}

/** Détail complet renvoyé par GET /admin/users/:id. */
export interface UserDetail extends User {
  emergencyContacts: EmergencyContact[];
  checkInEvents: CheckInEvent[];
  alertEvents: AlertEvent[];
  organization: Organization | null;
}

/** Query params acceptés par GET /admin/users. */
export interface UsersListQuery {
  search?: string;
  status?: UserStatus;
  plan?: Plan;
  organizationId?: string; // 'none' pour filtrer les users sans org
  limit?: number;
  cursor?: string;
}

/** Réponse paginée de GET /admin/users. */
export interface UsersListResponse {
  items: User[];
  nextCursor: string | null;
  total: number;
}

/** Réponse de GET /admin/users/:id. */
export interface UserDetailResponse {
  user: UserDetail;
}

/** Body de PATCH /admin/users/:id/status. */
export interface UpdateUserStatusBody {
  status: UserStatus;
  reason?: string;
}

/** Réponse de PATCH /admin/users/:id/status. */
export interface UpdateUserStatusResponse {
  user: {
    id: string;
    status: UserStatus;
    updatedAt: string;
  };
}