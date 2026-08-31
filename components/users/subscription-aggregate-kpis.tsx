'use client';

// ─── components/users/subscription-aggregate-kpis.tsx ────────────────────────
// Ligne de 4 KPIs compactes affichée au-dessus de la timeline des events.

import { HelpCircle } from 'lucide-react';
import { formatDate, formatUSD } from '@/lib/format';
import type { SubscriptionAggregate } from '@/lib/subscription-types';

interface SubscriptionAggregateKpisProps {
  aggregate: SubscriptionAggregate | undefined;
  loading?: boolean;
}

/**
 * Rend les 4 KPIs agrégés en grille compacte : total events, premier achat,
 * renouvellements, LTV estimée. La LTV a un tooltip natif pour rappeler
 * que c'est une estimation basée sur les prix actuels — évite les
 * confusions comptables.
 */
export function SubscriptionAggregateKpis({
  aggregate,
  loading,
}: SubscriptionAggregateKpisProps) {
  const isLoading = loading || !aggregate;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiTile
        label="Événements"
        value={isLoading ? '' : String(aggregate.totalEvents)}
        loading={isLoading}
      />
      <KpiTile
        label="Premier achat"
        value={
          isLoading
            ? ''
            : aggregate.firstPurchaseAt
              ? formatDate(aggregate.firstPurchaseAt)
              : 'Aucun'
        }
        loading={isLoading}
      />
      <KpiTile
        label="Renouvellements"
        value={isLoading ? '' : String(aggregate.renewalCount)}
        loading={isLoading}
      />
      <KpiTile
        label="LTV estimée"
        value={isLoading ? '' : formatUSD(aggregate.estimatedLtvUsd)}
        loading={isLoading}
        tooltip="Estimation basée sur les prix actuels ($5.99/mois, $59.99/an). Les prix passés ne sont pas historisés."
      />
    </div>
  );
}

// ─── Tuile compacte ──────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string;
  loading?: boolean;
  tooltip?: string;
}

function KpiTile({ label, value, loading, tooltip }: KpiTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {tooltip && (
          // Tooltip natif du navigateur — porté par un <span> wrapper parce que
          // LucideIcon ne forward pas les attributs HTML title/aria-*.
          // Le <span> reçoit le tooltip, l'icône reste purement visuelle.
          <span
            className="cursor-help"
            title={tooltip}
            aria-label={tooltip}
            role="img"
          >
            <HelpCircle className="h-3 w-3" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-1 min-h-[1.5rem]">
        {loading ? (
          <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-lg font-semibold tabular-nums">{value}</div>
        )}
      </div>
    </div>
  );
}