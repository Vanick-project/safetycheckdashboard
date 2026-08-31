// ─── lib/subscription-helpers.ts ─────────────────────────────────────────────
// Helpers de styling et de formatage pour l'historique d'abonnement.

import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeftRight,
  CircleDashed,
  Clock,
  Gift,
  RefreshCw,
  RotateCcw,
  Star,
  TestTube2,
  TrendingDown,
  Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  BillingPeriod,
  SubscriptionAggregate,
  SubscriptionEventType,
  SubscriptionHistoryUser,
} from './subscription-types';

// ─── Event meta ──────────────────────────────────────────────────────────────

interface EventMeta {
  label: string;
  Icon: LucideIcon;
  /** Classe couleur pour l'icône (text-emerald-600 dark:text-emerald-500) */
  iconColorClass: string;
  /** Classe fond pour le cercle qui entoure l'icône (bg-emerald-100 dark:bg-emerald-950/50) */
  bgColorClass: string;
}

/**
 * Mapping type → apparence visuelle. Code sémantique des couleurs :
 *  - Vert (emerald)  : positifs (achat initial, uncancel, non-renewing purchase)
 *  - Bleu (sky)      : opérationnels (renouvellement)
 *  - Ambre (amber)   : attention (cancellation demandée)
 *  - Gris (slate)    : fin de vie (expiration, transfer)
 *  - Violet (violet) : changements (upgrade/downgrade, promotional)
 *  - Rouge (rose)    : critiques (billing issue, refund)
 *  - Muted           : bruit (test)
 */
const EVENT_META: Record<SubscriptionEventType, EventMeta> = {
  INITIAL_PURCHASE: {
    label: 'Premier achat',
    Icon: Star,
    iconColorClass: 'text-emerald-600 dark:text-emerald-500',
    bgColorClass: 'bg-emerald-100 dark:bg-emerald-950/50',
  },
  RENEWAL: {
    label: 'Renouvellement',
    Icon: RefreshCw,
    iconColorClass: 'text-sky-600 dark:text-sky-500',
    bgColorClass: 'bg-sky-100 dark:bg-sky-950/50',
  },
  CANCELLATION: {
    label: 'Annulation demandée',
    Icon: AlertTriangle,
    iconColorClass: 'text-amber-600 dark:text-amber-500',
    bgColorClass: 'bg-amber-100 dark:bg-amber-950/50',
  },
  EXPIRATION: {
    label: 'Expiration',
    Icon: Clock,
    iconColorClass: 'text-slate-600 dark:text-slate-400',
    bgColorClass: 'bg-slate-100 dark:bg-slate-800/50',
  },
  PRODUCT_CHANGE: {
    label: 'Changement de plan',
    Icon: ArrowLeftRight,
    iconColorClass: 'text-violet-600 dark:text-violet-500',
    bgColorClass: 'bg-violet-100 dark:bg-violet-950/50',
  },
  UNCANCELLATION: {
    label: 'Annulation annulée',
    Icon: Undo2,
    iconColorClass: 'text-emerald-600 dark:text-emerald-500',
    bgColorClass: 'bg-emerald-100 dark:bg-emerald-950/50',
  },
  BILLING_ISSUE: {
    label: 'Problème de paiement',
    Icon: AlertOctagon,
    iconColorClass: 'text-rose-600 dark:text-rose-500',
    bgColorClass: 'bg-rose-100 dark:bg-rose-950/50',
  },
  TEST: {
    label: 'Test',
    Icon: TestTube2,
    iconColorClass: 'text-muted-foreground',
    bgColorClass: 'bg-muted',
  },
  NON_RENEWING_PURCHASE: {
    label: 'Achat non renouvelable',
    Icon: Gift,
    iconColorClass: 'text-emerald-600 dark:text-emerald-500',
    bgColorClass: 'bg-emerald-100 dark:bg-emerald-950/50',
  },
  PROMOTIONAL: {
    label: 'Promotionnel',
    Icon: Gift,
    iconColorClass: 'text-violet-600 dark:text-violet-500',
    bgColorClass: 'bg-violet-100 dark:bg-violet-950/50',
  },
  REFUND: {
    label: 'Remboursement',
    Icon: TrendingDown,
    iconColorClass: 'text-rose-600 dark:text-rose-500',
    bgColorClass: 'bg-rose-100 dark:bg-rose-950/50',
  },
  TRANSFER: {
    label: 'Transfert',
    Icon: RotateCcw,
    iconColorClass: 'text-slate-600 dark:text-slate-400',
    bgColorClass: 'bg-slate-100 dark:bg-slate-800/50',
  },
};

/**
 * Fallback pour les types RevenueCat inconnus. Le champ `type` est du string
 * libre côté DB, donc on peut recevoir une nouvelle valeur si RC ajoute un
 * type. Plutôt que de crasher, on affiche neutre avec la valeur brute.
 */
const UNKNOWN_EVENT_META: EventMeta = {
  label: 'Événement inconnu',
  Icon: CircleDashed,
  iconColorClass: 'text-muted-foreground',
  bgColorClass: 'bg-muted',
};

/** Résout le meta d'un event, avec fallback pour type non répertorié. */
export function getEventMeta(type: string): EventMeta {
  if (type in EVENT_META) {
    return EVENT_META[type as SubscriptionEventType];
  }
  return UNKNOWN_EVENT_META;
}

// ─── Formatters ──────────────────────────────────────────────────────────────

/**
 * Label lisible pour la cadence de facturation. 'unknown' est étiqueté
 * "Non catégorisé" (pas "Inconnu") pour indiquer que c'est un signal
 * d'anomalie côté config, pas juste une donnée manquante — cohérent avec
 * la card "Abonnés actifs" du dashboard.
 */
export function formatBillingPeriod(period: BillingPeriod): string {
  switch (period) {
    case 'monthly':
      return 'Mensuel';
    case 'yearly':
      return 'Annuel';
    case 'unknown':
      return 'Non catégorisé';
  }
}

/**
 * Formate la valeur brute du champ `store` du webhook RC. Le backend stocke
 * du string libre (pas d'enum), donc on gère les valeurs connues et on
 * renvoie la valeur brute normalisée pour les autres (au cas où RC en ajoute).
 */
export function formatStore(store: string | null): string {
  if (!store) return '—';
  const map: Record<string, string> = {
    PLAY_STORE: 'Google Play',
    APP_STORE: 'App Store',
    MAC_APP_STORE: 'Mac App Store',
    AMAZON: 'Amazon',
    STRIPE: 'Stripe',
    PROMOTIONAL: 'Promotionnel',
    UNKNOWN_STORE: 'Store inconnu',
  };
  return map[store] ?? store.replace(/_/g, ' ').toLowerCase();
}

// ─── Détection d'anomalies ───────────────────────────────────────────────────

/**
 * Détecte le cas "utilisateur BASIC orphelin" : plan BASIC actif mais aucun
 * event dans l'historique. Peut indiquer :
 *  - Un grant manuel (accordé via console RevenueCat sans webhook)
 *  - Une désynchronisation (webhook manqué)
 *  - Un event antérieur au démarrage du tracking
 *
 * Signal utile — on l'affiche distinctement dans l'empty state du composant.
 */
export function isOrphanSubscriber(
  user: SubscriptionHistoryUser,
  aggregate: SubscriptionAggregate,
): boolean {
  return (
    user.plan === 'BASIC' &&
    aggregate.totalEvents === 0 &&
    aggregate.firstPurchaseAt === null
  );
}