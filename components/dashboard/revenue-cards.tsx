'use client';

import { SnapshotCard, VolumeCard } from './stat-card';
import { formatUSD } from '@/lib/format';
import type { RevenueSection } from '@/lib/stats-types';

// ─── Props ───────────────────────────────────────────────────────────────────

interface RevenueCardsProps {
  revenue: RevenueSection | undefined;
  loading?: boolean;
}

// ─── Composant ───────────────────────────────────────────────────────────────

/**
 * Grille des 5 cards de la section "Revenus".
 *
 * Layout : 2 lignes en desktop.
 *  - Ligne 1 : MRR · ARR · Abonnés actifs      (3 cards Snapshot)
 *  - Ligne 2 : Nouveaux abonnements · Résiliations (2 cards Volume)
 *
 * Sur mobile : stack vertical simple.
 */
export function RevenueCards({ revenue, loading }: RevenueCardsProps) {
  // Pendant le loading initial, on rend les 5 skeletons directement pour éviter
  // le layout shift entre "0 card" et "5 cards".
  const isLoading = loading || !revenue;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SnapshotCard
        label="MRR"
        value={isLoading ? '' : formatUSD(revenue.mrr.value)}
        loading={isLoading}
      />

      <SnapshotCard
        label="ARR"
        value={isLoading ? '' : formatUSD(revenue.arr.value)}
        loading={isLoading}
      />

      <SnapshotCard
        label="Abonnés actifs"
        value={isLoading ? 0 : revenue.activeSubscribers.total}
        hint={
          isLoading ? undefined : (
            <SubscribersBreakdown
              monthly={revenue.activeSubscribers.monthly}
              yearly={revenue.activeSubscribers.yearly}
              unknown={revenue.activeSubscribers.unknown}
            />
          )
        }
        loading={isLoading}
      />

      <VolumeCard
        label="Nouveaux abonnements"
        value={isLoading ? 0 : revenue.newSubscriptions.value}
        delta={isLoading ? null : revenue.newSubscriptions.delta}
        loading={isLoading}
      />

      <VolumeCard
        label="Résiliations"
        value={isLoading ? 0 : revenue.cancellations.value}
        delta={isLoading ? null : revenue.cancellations.delta}
        loading={isLoading}
        // Sémantique inversée : plus de résiliations = mauvais signe (rouge).
        invertDeltaColor
      />
    </div>
  );
}

// ─── Breakdown segmentation abonnés ──────────────────────────────────────────

interface SubscribersBreakdownProps {
  monthly: number;
  yearly: number;
  unknown: number;
}

/**
 * Rend la ligne de segmentation "42 mensuel · 8 annuel · 1 non catégorisé".
 * La partie "non catégorisé" n'apparaît que si unknown > 0 — c'est un signal
 * de dérive de config (grants manuels ou SubscriptionEvent manquant), donc
 * on ne veut pas la masquer, mais on ne veut pas non plus polluer le UI
 * quand tout est propre.
 */
function SubscribersBreakdown({
  monthly,
  yearly,
  unknown,
}: SubscribersBreakdownProps) {
  const parts = [
    `${formatFr(monthly)} mensuel`,
    `${formatFr(yearly)} annuel`,
  ];
  if (unknown > 0) {
    parts.push(`${formatFr(unknown)} non catégorisé`);
  }
  return <span>{parts.join(' · ')}</span>;
}

function formatFr(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}