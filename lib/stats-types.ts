// ─── lib/stats-types.ts ───────────────────────────────────────────────────────
// Types pour l'endpoint GET /admin/stats.
//
// Points de nullabilité importants (voir contrat backend) :
// - `volume.*.delta` est null pour period=custom (pas de période de comparaison)
// - `volume.*.delta.percent` est null si la période précédente = 0 (÷0)
// - `snapshot.alertsResolved24h.rate` est null si aucune alerte n'a eu de
//   verdict en 24h

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

// ─── Réponse complète ────────────────────────────────────────────────────────

export interface AdminStatsResponse {
  period: StatsPeriod;
  snapshot: StatsSnapshot;
  volume: StatsVolume;
  /** Réponse servie depuis le cache backend (60s pour les presets). */
  cached: boolean;
  /** ISO datetime de génération. */
  generatedAt: string;
}