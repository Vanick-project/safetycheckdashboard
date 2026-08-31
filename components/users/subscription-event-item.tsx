'use client';

// ─── components/users/subscription-event-item.tsx ────────────────────────────
// Item unitaire de la timeline des événements d'abonnement.

import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import {
  formatBillingPeriod,
  formatStore,
  getEventMeta,
} from '@/lib/subscription-helpers';
import type {
  BillingPeriod,
  SubscriptionEvent,
} from '@/lib/subscription-types';

interface SubscriptionEventItemProps {
  event: SubscriptionEvent;
}

/**
 * Rend une ligne de timeline pour un event RC. Structure :
 *   [Icône colorée]  Label · Badge cadence · Store · [Badge Test/Sandbox]
 *                    productId · Expire le …
 *                    Il y a X (tooltip = date exacte)
 *
 * La couleur d'icône signale la nature de l'event (voir EVENT_META).
 */
export function SubscriptionEventItem({ event }: SubscriptionEventItemProps) {
  const { Icon, label, iconColorClass, bgColorClass } = getEventMeta(event.type);
  const isTest = event.type === 'TEST';
  const isSandbox = event.environment === 'SANDBOX';

  return (
    <li className="flex gap-3">
      {/* ─── Colonne icône ────────────────────────────────────────────── */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${bgColorClass}`}
      >
        <Icon className={`h-4 w-4 ${iconColorClass}`} />
      </div>

      {/* ─── Contenu ──────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-1 pb-2">
        {/* Ligne 1 : label + badges secondaires */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{label}</span>

          <BillingPeriodBadge period={event.billingPeriod} />

          {event.store && (
            <span className="text-xs text-muted-foreground">
              · {formatStore(event.store)}
            </span>
          )}

          {(isTest || isSandbox) && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              {isTest ? 'Test' : 'Sandbox'}
            </span>
          )}
        </div>

        {/* Ligne 2 : produit + expiration */}
        {(event.productId || event.expirationAt) && (
          <div className="text-xs text-muted-foreground">
            {event.productId && (
              <span className="font-mono">{event.productId}</span>
            )}
            {event.productId && event.expirationAt && ' · '}
            {event.expirationAt && (
              <>
                Expire le{' '}
                <span title={formatDateTime(event.expirationAt)}>
                  {formatDate(event.expirationAt)}
                </span>
              </>
            )}
          </div>
        )}

        {/* Ligne 3 : timestamp */}
        <div
          className="text-xs text-muted-foreground"
          title={formatDateTime(event.createdAt)}
        >
          {formatRelative(event.createdAt)}
        </div>
      </div>
    </li>
  );
}

// ─── Badge cadence ───────────────────────────────────────────────────────────

function BillingPeriodBadge({ period }: { period: BillingPeriod }) {
  const colorClass =
    period === 'monthly'
      ? 'bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200'
      : period === 'yearly'
        ? 'bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-200'
        : // unknown = signal d'anomalie, badge ambre pour l'attention
          'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200';

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${colorClass}`}
    >
      {formatBillingPeriod(period)}
    </span>
  );
}