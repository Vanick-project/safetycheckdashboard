// ─── lib/stats-types.ts ───────────────────────────────────────────────────────
// Types pour l'endpoint GET /admin/stats.
//
// Points de nullabilité importants (voir contrat backend) :
// - `volume.*.delta` est null pour period=custom (pas de période de comparaison)
// - `volume.*.delta.percent` est null si la période précédente = 0 (÷0)
// - `snapshot.alertsResolved24h.rate` est null si aucune alerte n'a eu de
//   verdict en 24h
// - `revenue.newSubscriptions.delta` et `revenue.cancellations.delta` suivent
//   la même sémantique que volume.*.delta (null pour custom, percent null si ÷0)

// ─── Période ─────────────────────────────────────────────────────────────────

export type StatsPreset = 'today' | '7d' | '30d' | '90d';
export type StatsPeriodType = StatsPreset | 'custom';

export interface StatsPeriod {
  type: StatsPeriodType;
  from: string; // ISO datetime
  to: string;   // ISO datetime
}

// Params en entrée du hook. Pour custom, from/to sont requis.
export interface StatsQueryParams {
  period: StatsPeriodType;
  from?: string;
  to?: string;
}

// ─── Snapshot (état instantané) ──────────────────────────────────────────────

export interface PlanBreakdown {
  FREE: number;
  BASIC: number;
}

export interface AlertsResolved24h {
  resolved: number;
  total: number;
  /** Null si total = 0 (division par zéro). */
  rate: number | null;
}

export interface StatsSnapshot {
  activeUsers: number;
  planBreakdown: PlanBreakdown;
  avgContactsPerUser: number;
  activeAlerts: number;
  alertsResolved24h: AlertsResolved24h;
}

// ─── Volume (agrégats sur la période) ─────────────────────────────────────────

export interface VolumeDelta {
  value: number;
  /** Null si période précédente = 0 (division par zéro). */
  percent: number | null;
}

export interface VolumeMetric {
  value: number;
  /** Null pour period=custom (pas de comparaison). */
  delta: VolumeDelta | null;
}

export interface StatsVolume {
  newUsers: VolumeMetric;
  checkIns: VolumeMetric;
  notifications: VolumeMetric;
  alertsTriggered: VolumeMetric;
}

// ─── Revenue (bucket monétaire) ──────────────────────────────────────────────
//
// Toutes les valeurs monétaires sont en USD, arrondies à 2 décimales côté
// backend. MRR yearly est normalisée à $59.99 / 12 = $4.999/mois par abonné
// annuel, donc `mrr.value` = MRR consolidée mensuelle réelle.

/** Valeur monétaire simple. La devise est actuellement toujours USD. */
export interface MoneyValue {
  value: number;
  currency: 'USD';
}

/**
 * Segmentation des abonnés actifs par cadence de facturation.
 * `unknown` = BASIC sans SubscriptionEvent identifiable (grants manuels ou
 * config drift RevenueCat). À surveiller — signal utile d'anomalie côté
 * config produit. Le UI l'affiche discrètement quand > 0.
 */
export interface ActiveSubscribers {
  total: number;
  monthly: number;
  yearly: number;
  unknown: number;
}

export interface RevenueSection {
  /** Monthly Recurring Revenue consolidée (mensuel + yearly normalisée). */
  mrr: MoneyValue;
  /** Annual Recurring Revenue = MRR × 12. */
  arr: MoneyValue;
  activeSubscribers: ActiveSubscribers;
  /** Nouveaux abonnements créés sur la période, avec delta vs précédente. */
  newSubscriptions: VolumeMetric;
  /** Résiliations enregistrées sur la période, avec delta vs précédente. */
  cancellations: VolumeMetric;
}

// ─── Réponse complète ────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  period: StatsPeriod;
  snapshot: StatsSnapshot;
  volume: StatsVolume;
  revenue: RevenueSection;
  /** Réponse servie depuis le cache backend (60s pour les presets). */
  cached: boolean;
  /** ISO datetime de génération. */
  generatedAt: string;
}