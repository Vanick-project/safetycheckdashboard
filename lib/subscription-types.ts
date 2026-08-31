// ─── lib/subscription-types.ts ───────────────────────────────────────────────
// Types pour l'endpoint GET /admin/users/:id/subscription-history.

// ─── Enums ───────────────────────────────────────────────────────────────────

/**
 * Types d'événements RevenueCat que le backend enregistre. Le champ `type`
 * dans la DB est un String libre (pas d'enum Prisma), donc on peut recevoir
 * une valeur hors liste si RC ajoute un nouveau type — le helper getEventMeta
 * gère le fallback générique.
 */
export type SubscriptionEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'PRODUCT_CHANGE'
  | 'UNCANCELLATION'
  | 'BILLING_ISSUE'
  | 'TEST'
  | 'NON_RENEWING_PURCHASE'
  | 'PROMOTIONAL'
  | 'REFUND'
  | 'TRANSFER';

/**
 * Cadence de facturation dérivée du productId par detectBillingPeriod() côté
 * backend. 'unknown' = productId absent ou ne matchant aucun pattern
 * (basic_monthly, basic_yearly, variantes _month/_year/_annual…). C'est
 * un signal d'anomalie à surveiller (grant manuel ou config drift RevenueCat).
 */
export type BillingPeriod = 'monthly' | 'yearly' | 'unknown';

// ─── Event ───────────────────────────────────────────────────────────────────

/**
 * Un événement d'abonnement tel que retourné par l'API admin.
 *
 * Nullabilités : alignées avec le schema Prisma. store/productId/environment/
 * expirationAt/eventId peuvent être null selon la source (webhook incomplet,
 * event legacy, TEST event du dashboard RC).
 *
 * `payload` : présent UNIQUEMENT si le call inclut ?includeRaw=true, ce qui
 * nécessite le rôle SUPER_ADMIN côté backend. Non exposé en v1 du UI.
 */
export interface SubscriptionEvent {
  id: string;
  eventId: string | null;
  type: string;
  store: string | null;
  productId: string | null;
  billingPeriod: BillingPeriod;
  environment: string | null;
  expirationAt: string | null;
  createdAt: string;
  payload?: unknown;
}

// ─── Aggregate KPIs ──────────────────────────────────────────────────────────

/**
 * Métriques agrégées calculées par le backend sur l'ensemble de l'historique.
 * estimatedLtvUsd est une ESTIMATION basée sur les prix ACTUELS ($5.99/mo,
 * $59.99/yr) — un event à un prix passé serait mal comptabilisé. Le UI
 * affiche un tooltip pour éviter les confusions comptables.
 */
export interface SubscriptionAggregate {
  totalEvents: number;
  firstPurchaseAt: string | null;
  lastEventAt: string | null;
  renewalCount: number;
  estimatedLtvUsd: number;
}

// ─── User snapshot (pour éviter un round-trip vers /users/:id) ───────────────

export interface SubscriptionHistoryUser {
  id: string;
  plan: 'FREE' | 'BASIC';
  planExpiresAt: string | null;
}

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface SubscriptionHistoryPagination {
  hasMore: boolean;
  /** ISO timestamp (createdAt du dernier event de la page) — à passer à ?cursor= */
  nextCursor: string | null;
}

// ─── Réponse complète ────────────────────────────────────────────────────────

export interface SubscriptionHistoryResponse {
  user: SubscriptionHistoryUser;
  aggregate: SubscriptionAggregate;
  events: SubscriptionEvent[];
  pagination: SubscriptionHistoryPagination;
}

// ─── Query params (côté hook) ────────────────────────────────────────────────

export interface SubscriptionHistoryQueryParams {
  /** 1-100, default backend 50 */
  limit?: number;
  /** ISO timestamp du dernier event vu — pour paginer */
  cursor?: string;
  /** SUPER_ADMIN uniquement — expose le payload brut du webhook RC */
  includeRaw?: boolean;
}