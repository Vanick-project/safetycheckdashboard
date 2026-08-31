'use client';

// ─── components/settings/session-item.tsx ────────────────────────────────────
// Item unitaire de la liste des sessions dans /settings.

import { Loader2, LogOut, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime, formatRelative } from '@/lib/format';
import { parseUserAgent } from '@/lib/user-agent-parser';
import type { MySession } from '@/lib/settings-types';

interface SessionItemProps {
  session: MySession;
  /** True pendant qu'une révocation portant sur CETTE session est en vol. */
  isRevoking: boolean;
  /** Callback quand l'user clique sur "Révoquer" / "Se déconnecter d'ici". */
  onRevoke: (session: MySession) => void;
}

/**
 * Un item de session avec icône device, méta (IP + activité + expiration),
 * badge "Cet appareil" si isCurrent, et bouton d'action contextuel.
 *
 * Design intentionnel : la session courante a un fond légèrement teinté
 * pour être immédiatement repérable dans une liste de 3-5 items.
 */
export function SessionItem({
  session,
  isRevoking,
  onRevoke,
}: SessionItemProps) {
  const ua = parseUserAgent(session.userAgent);
  const isRevoked = session.revokedAt !== null;
  const isExpired = !isRevoked && new Date(session.expiresAt) < new Date();

  return (
    <li
      className={`
        flex flex-col gap-3 rounded-lg border p-4 transition-colors
        sm:flex-row sm:items-start sm:justify-between
        ${
          session.isCurrent
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
            : 'border-border bg-card'
        }
      `}
    >
      {/* ─── Gauche : icône + infos ────────────────────────────────── */}
      <div className="flex flex-1 items-start gap-3">
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
          title={ua.deviceType}
        >
          <ua.Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          {/* Ligne 1 : browser + badges */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{ua.summary}</span>

            {session.isCurrent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Cet appareil
              </span>
            )}

            {isRevoked && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                Révoquée
              </span>
            )}

            {isExpired && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Expirée
              </span>
            )}
          </div>

          {/* Ligne 2 : IP + activité + expiration */}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {session.ipAddress && (
              <span className="inline-flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                {session.ipAddress}
              </span>
            )}

            <span title={formatDateTime(session.createdAt)}>
              Dernière activité {formatRelative(session.createdAt)}
            </span>

            {!isRevoked && !isExpired && (
              <span title={formatDateTime(session.expiresAt)}>
                Expire {formatRelativeFuture(session.expiresAt)}
              </span>
            )}

            {session.revokedAt && (
              <span title={formatDateTime(session.revokedAt)}>
                Révoquée {formatRelative(session.revokedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Droite : action ───────────────────────────────────────── */}
      {!isRevoked && (
        <div className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRevoke(session)}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="mr-2 h-3.5 w-3.5" />
            )}
            {session.isCurrent ? "Se déconnecter d'ici" : 'Révoquer'}
          </Button>
        </div>
      )}
    </li>
  );
}

// ─── Helper local : format relatif orienté futur ─────────────────────────────
// formatRelative() de lib/format.ts ne gère que le passé (diffSec > 0). Pour
// l'expiration on a besoin du contraire : "dans X min/h/j". Petit helper
// local pour éviter de polluer lib/format.ts avec une fonction utilisée
// uniquement ici pour l'instant.

function formatRelativeFuture(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((then - now) / 1000);

  if (diffSec < 0) return 'bientôt';
  if (diffSec < 60) return 'dans quelques secondes';
  if (diffSec < 3600) return `dans ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `dans ${Math.floor(diffSec / 3600)} h`;
  const days = Math.floor(diffSec / 86400);
  return `dans ${days} j`;
}