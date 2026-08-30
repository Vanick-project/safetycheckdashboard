'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { VolumeDelta } from '@/lib/stats-types';

// ─── Helpers de formatage ────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

// ─── Card de base (partagée) ─────────────────────────────────────────────────

interface StatCardBaseProps {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  loading?: boolean;
}

function StatCardBase({ label, children, hint, loading }: StatCardBaseProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 min-h-[2.25rem]">
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          children
        )}
      </div>
      {hint && !loading && (
        <div className="mt-3 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

// ─── SnapshotCard : état instantané, pas de delta ─────────────────────────────

interface SnapshotCardProps {
  label: string;
  /** Nombre formaté automatiquement en fr-FR, ou chaîne préformatée
   *  (ex : "82.5%", "1.4", "$1,234.56"). */
  value: number | string;
  hint?: ReactNode;
  loading?: boolean;
}

export function SnapshotCard({
  label,
  value,
  hint,
  loading,
}: SnapshotCardProps) {
  return (
    <StatCardBase label={label} hint={hint} loading={loading}>
      <div className="text-3xl font-semibold tracking-tight tabular-nums">
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
    </StatCardBase>
  );
}

// ─── VolumeCard : agrégat sur la période avec delta ───────────────────────────

interface VolumeCardProps {
  label: string;
  value: number;
  /** Null pour period=custom → on affiche un message dédié dans le hint. */
  delta: VolumeDelta | null;
  loading?: boolean;
  /**
   * Inverse la sémantique couleur du delta : hausse = rouge, baisse = vert.
   *  À utiliser pour les métriques où "plus" est mauvais (résiliations,
   *  erreurs, incidents…). Défaut : false (hausse = vert, comportement legacy).
   */
  invertDeltaColor?: boolean;
}

export function VolumeCard({
  label,
  value,
  delta,
  loading,
  invertDeltaColor = false,
}: VolumeCardProps) {
  return (
    <StatCardBase
      label={label}
      loading={loading}
      hint={<DeltaIndicator delta={delta} invertColor={invertDeltaColor} />}
    >
      <div className="text-3xl font-semibold tracking-tight tabular-nums">
        {formatNumber(value)}
      </div>
    </StatCardBase>
  );
}

// ─── DeltaIndicator ──────────────────────────────────────────────────────────

interface DeltaIndicatorProps {
  delta: VolumeDelta | null;
  /** Si true, inverse la palette : up = rose, down = emerald. L'icône reste
   *  fidèle à la direction réelle (flèche haut si ça monte). */
  invertColor?: boolean;
}

function DeltaIndicator({ delta, invertColor = false }: DeltaIndicatorProps) {
  // Cas 1 : période custom → pas de comparaison possible.
  if (delta === null) {
    return (
      <span className="text-muted-foreground">
        Pas de comparaison sur période personnalisée
      </span>
    );
  }

  const { value, percent } = delta;

  // Direction basée sur la valeur absolue (fiable même si percent est null).
  const isUp = value > 0;
  const isFlat = value === 0;

  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;

  // Sémantique couleur : par défaut hausse = bien (vert). Si invertColor,
  // on inverse — la flèche reste dans le sens de la variation, mais rouge.
  const goodClass = 'text-emerald-600 dark:text-emerald-500';
  const badClass = 'text-rose-600 dark:text-rose-500';
  const flatClass = 'text-muted-foreground';

  const upClass = invertColor ? badClass : goodClass;
  const downClass = invertColor ? goodClass : badClass;

  const colorClass = isFlat ? flatClass : isUp ? upClass : downClass;

  // On préfixe manuellement le "+" pour les valeurs positives. Intl.NumberFormat
  // gère nativement le signe "−" pour les négatives.
  const valuePrefix = value > 0 ? '+' : '';
  const percentPrefix = percent !== null && percent > 0 ? '+' : '';

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${colorClass}`}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="font-medium tabular-nums">
        {valuePrefix}
        {formatNumber(value)}
        {' '}
        ({percent === null
          ? '—'
          : `${percentPrefix}${percent.toFixed(1)}%`})
      </span>
      <span className="font-normal text-muted-foreground">
        vs période précédente
      </span>
    </span>
  );
}