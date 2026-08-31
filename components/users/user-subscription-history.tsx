'use client';

// ─── components/users/user-subscription-history.tsx ──────────────────────────
// Section "Historique paiements" dans la page detail user.

import { useMemo } from 'react';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCan } from '@/hooks/use-current-admin';
import { useSubscriptionHistory } from '@/hooks/use-subscription-history';
import { isOrphanSubscriber } from '@/lib/subscription-helpers';
import { ApiError } from '@/lib/types';
import { SubscriptionAggregateKpis } from './subscription-aggregate-kpis';
import { SubscriptionEventItem } from './subscription-event-item';

interface UserSubscriptionHistoryProps {
  userId: string;
}

/**
 * Top-level de la section "Historique paiements". Gate RBAC via useCan —
 * si le rôle courant n'a pas payments.view (ex : ANALYST), on retourne null
 * sans rien afficher. Silence radio : pas de "Accès restreint" qui trahirait
 * l'existence des données de paiement.
 */
export function UserSubscriptionHistory({
  userId,
}: UserSubscriptionHistoryProps) {
  const canView = useCan('payments.view');
  if (!canView) return null;
  return <SubscriptionHistoryContent userId={userId} />;
}

// ─── Contenu (après RBAC gate) ───────────────────────────────────────────────

function SubscriptionHistoryContent({ userId }: UserSubscriptionHistoryProps) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSubscriptionHistory(userId);

  // Aplatir toutes les pages en une seule liste. useMemo évite de recomposer
  // à chaque render tant que data.pages n'a pas changé.
  const events = useMemo(
    () => data?.pages.flatMap((p) => p.events) ?? [],
    [data?.pages],
  );

  // aggregate + user viennent de la première page — invariants selon la page.
  const firstPage = data?.pages[0];
  const aggregate = firstPage?.aggregate;
  const user = firstPage?.user;

  const showEmpty =
    !isLoading && !error && user && aggregate && events.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Historique paiements
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPIs toujours visibles (skeleton en loading) */}
        <SubscriptionAggregateKpis aggregate={aggregate} loading={isLoading} />

        {error && !isLoading && <HistoryError error={error} />}

        {showEmpty && (
          <EmptyState orphan={isOrphanSubscriber(user, aggregate)} />
        )}

        {!isLoading && !error && events.length > 0 && (
          <ol className="space-y-3">
            {events.map((event) => (
              <SubscriptionEventItem key={event.id} event={event} />
            ))}
          </ol>
        )}

        {hasNextPage && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              Charger plus d&apos;événements
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Erreur ──────────────────────────────────────────────────────────────────

function HistoryError({ error }: { error: unknown }) {
  const status = error instanceof ApiError ? error.status : null;
  const message =
    status === 403
      ? "Vous n'avez pas accès à l'historique de paiement."
      : error instanceof Error
        ? error.message
        : 'Erreur inconnue';

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-100"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">
          Impossible de charger l&apos;historique de paiement
        </div>
        <div className="mt-0.5 text-xs opacity-90">{message}</div>
      </div>
    </div>
  );
}

// ─── Empty states ────────────────────────────────────────────────────────────

/**
 * Deux cas distincts :
 *  - orphan=true  : plan BASIC actif mais 0 event → signal d'anomalie visible
 *  - orphan=false : user FREE ou BASIC légitimement sans historique → neutre
 */
function EmptyState({ orphan }: { orphan: boolean }) {
  if (orphan) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <div className="space-y-1">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              Utilisateur BASIC sans événement de paiement
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
              Cet utilisateur a le plan BASIC actif mais aucun événement
              RevenueCat enregistré. Peut indiquer un grant manuel, une
              désynchronisation webhook, ou un event antérieur au démarrage
              du tracking.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <p className="py-6 text-center text-sm text-muted-foreground">
      Cet utilisateur n&apos;a jamais souscrit d&apos;abonnement.
    </p>
  );
}