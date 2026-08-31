'use client';

// ─── components/settings/sessions-card.tsx ───────────────────────────────────
// Carte "Sessions actives" de /settings (checkpoint 5c.2).

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SessionItem } from './session-item';
import { RevokeSessionDialog } from './revoke-session-dialog';
import {
  useRevokeAllSessions,
  useRevokeSession,
  useSessions,
} from '@/hooks/use-sessions';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/types';
import type { MySession } from '@/lib/settings-types';

// ─── State machine locale pour la modale ─────────────────────────────────────

type DialogState =
  | { kind: 'closed' }
  | { kind: 'confirm-self'; session: MySession }
  | { kind: 'confirm-other'; session: MySession }
  | { kind: 'confirm-all'; otherSessionsCount: number };

// ─── Component ───────────────────────────────────────────────────────────────

export function SessionsCard() {
  const router = useRouter();
  const { logout } = useAuth();

  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ kind: 'closed' });

  const { data, isLoading, error, refetch, isFetching } =
    useSessions(includeRevoked);
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();

  // ─── Séparation active vs révoquée (pour le mode includeRevoked) ────
  // Les révoquées sont regroupées en bas dans un section repliable, pour
  // ne pas noyer les actives dans le flot chronologique quand on active
  // le mode forensic.
  const { activeSessions, revokedSessions } = useMemo(() => {
    const sessions = data?.sessions ?? [];
    return {
      activeSessions: sessions.filter((s) => s.revokedAt === null),
      revokedSessions: sessions.filter((s) => s.revokedAt !== null),
    };
  }, [data]);

  const otherActiveCount = activeSessions.filter((s) => !s.isCurrent).length;
  const revokeAllDisabled = otherActiveCount === 0;

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleRevokeClick = (session: MySession) => {
    setDialog({
      kind: session.isCurrent ? 'confirm-self' : 'confirm-other',
      session,
    });
  };

  const handleRevokeAllClick = () => {
    setDialog({ kind: 'confirm-all', otherSessionsCount: otherActiveCount });
  };

  const handleConfirmRevoke = async () => {
    if (dialog.kind === 'closed') return;

    try {
      if (dialog.kind === 'confirm-all') {
        const res = await revokeAll.mutateAsync();
        if (!res.keptCurrentSession) {
          // Fallback : session courante aussi révoquée → logout immédiat.
          await forceLogoutAndRedirect();
          return;
        }
        setDialog({ kind: 'closed' });
        toast.success(
          res.revokedCount === 1
            ? '1 session révoquée.'
            : `${res.revokedCount} sessions révoquées.`,
        );
        return;
      }

      // confirm-self ou confirm-other
      const res = await revokeOne.mutateAsync({
        sessionId: dialog.session.id,
      });

      if (res.wasCurrentSession) {
        // L'user a explicitement révoqué sa session → logout immédiat
        // sans toast (briefing backend Q7 = A).
        await forceLogoutAndRedirect();
        return;
      }

      setDialog({ kind: 'closed' });
      toast.success('Session révoquée.');
    } catch (err) {
      handleRevokeError(err);
    }
  };

  const handleRevokeError = (err: unknown) => {
    if (err instanceof ApiError) {
      // 409 = session déjà révoquée entre-temps (double-click, race avec un
      // autre onglet). Traiter comme succès silencieux + refetch.
      if (err.status === 409 && err.code === 'session_already_revoked') {
        setDialog({ kind: 'closed' });
        refetch();
        return;
      }

      // 404 = session introuvable (déjà supprimée ou pas à moi) — uniforme
      // pour éviter l'énumération. Message honnête à l'utilisateur.
      if (err.status === 404) {
        setDialog({ kind: 'closed' });
        toast.error('Session introuvable ou déjà supprimée.');
        refetch();
        return;
      }
    }

    toast.error(
      err instanceof Error ? err.message : 'Erreur lors de la révocation.',
    );
  };

  const forceLogoutAndRedirect = async () => {
    setDialog({ kind: 'closed' });
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Sessions actives</CardTitle>
              <CardDescription>
                Appareils actuellement connectés à votre compte SafetyCheck
                admin. Vous pouvez révoquer les sessions inconnues à tout
                moment.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                title="Actualiser"
                aria-label="Actualiser la liste des sessions"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeAllClick}
                disabled={revokeAllDisabled || revokeAll.isPending}
                title={
                  revokeAllDisabled
                    ? 'Aucune autre session à déconnecter'
                    : undefined
                }
              >
                Déconnecter les autres
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading && <SessionsSkeleton />}

          {error && !isLoading && <SessionsError error={error} />}

          {!isLoading && !error && data && (
            <>
              {activeSessions.length === 0 ? (
                <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                  Aucune session active.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activeSessions.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isRevoking={
                        revokeOne.isPending &&
                        revokeOne.variables?.sessionId === session.id
                      }
                      onRevoke={handleRevokeClick}
                    />
                  ))}
                </ul>
              )}

              {/* ─── Mode forensic (révoquées 30j) ───────────────────── */}
              <details
                className="rounded-md border border-border bg-muted/20"
                onToggle={(e) => setIncludeRevoked(e.currentTarget.open)}
              >
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2 text-sm font-medium">
                  <span className="inline-flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 transition-transform" />
                    Afficher l&apos;historique des sessions révoquées (30 j)
                  </span>
                  {includeRevoked && revokedSessions.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {revokedSessions.length} entrée
                      {revokedSessions.length > 1 ? 's' : ''}
                    </span>
                  )}
                </summary>
                <div className="border-t border-border p-3">
                  {includeRevoked && isFetching && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Chargement de l&apos;historique…
                    </div>
                  )}
                  {includeRevoked &&
                    !isFetching &&
                    revokedSessions.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Aucune session révoquée dans les 30 derniers jours.
                      </p>
                    )}
                  {includeRevoked && revokedSessions.length > 0 && (
                    <>
                      <p className="mb-2 text-xs text-muted-foreground">
                        Chronologie brute — le backend fait de la rotation
                        de token toutes les ~15 min, une session révoquée par
                        ligne. Utile uniquement pour investigation forensic.
                      </p>
                      <ul
                        className="max-h-96 space-y-2 overflow-y-auto pr-1"
                      >
                        {revokedSessions.map((session) => (
                          <SessionItem
                            key={session.id}
                            session={session}
                            isRevoking={false}
                            onRevoke={() => {
                              /* pas d'action sur session déjà révoquée */
                            }}
                          />
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </details>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Modale de confirmation ─────────────────────────────────── */}
      {dialog.kind === 'confirm-self' && (
        <RevokeSessionDialog
          variant={{ kind: 'self', session: dialog.session }}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setDialog({ kind: 'closed' })}
          isPending={revokeOne.isPending}
        />
      )}

      {dialog.kind === 'confirm-other' && (
        <RevokeSessionDialog
          variant={{ kind: 'other', session: dialog.session }}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setDialog({ kind: 'closed' })}
          isPending={revokeOne.isPending}
        />
      )}

      {dialog.kind === 'confirm-all' && (
        <RevokeSessionDialog
          variant={{
            kind: 'all',
            otherSessionsCount: dialog.otherSessionsCount,
          }}
          onConfirm={handleConfirmRevoke}
          onCancel={() => setDialog({ kind: 'closed' })}
          isPending={revokeAll.isPending}
        />
      )}
    </>
  );
}

// ─── Skeleton & Error ────────────────────────────────────────────────────────

function SessionsSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <li
          key={i}
          className="flex gap-3 rounded-lg border border-border p-4"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-56 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SessionsError({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Erreur inconnue';
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-100"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">
          Impossible de charger vos sessions
        </div>
        <div className="mt-0.5 text-xs opacity-90">{message}</div>
      </div>
    </div>
  );
}