'use client';

import { Globe } from 'lucide-react';
import { formatDateTime, formatRelative } from '@/lib/format';
import { parseUserAgent } from '@/lib/user-agent-parser';
import type { AdminSession } from '@/lib/admin-types';

interface AdminSessionsListProps {
  sessions: AdminSession[];
}

export function AdminSessionsList({ sessions }: AdminSessionsListProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
        <Globe className="mx-auto h-8 w-8 text-muted-foreground" />
        <h3 className="mt-3 text-sm font-semibold">Aucune session récente</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Cet admin ne s&apos;est jamais connecté ou toutes ses sessions ont
          été révoquées.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Sessions récentes</h2>
        <p className="text-xs text-muted-foreground">
          Les 5 dernières sessions ({sessions.length}{' '}
          {sessions.length > 1 ? 'affichées' : 'affichée'})
        </p>
      </div>

      <ul className="divide-y divide-border">
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </ul>
    </div>
  );
}

// ─── Row d'une session ───────────────────────────────────────────────────────

function SessionRow({ session }: { session: AdminSession }) {
  const isActive = session.revokedAt === null;
  const isExpired = new Date(session.expiresAt) < new Date();
  const uaInfo = parseUserAgent(session.userAgent);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-start gap-3">
          {/* Icône device */}
          <div
            className="mt-1 rounded-md bg-muted p-2 text-muted-foreground"
            title={uaInfo.deviceType}
          >
            <uaInfo.Icon className="h-4 w-4" />
          </div>

          {/* Infos */}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">
              {uaInfo.summary}
              {isActive && !isExpired && (
                <span
                  className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"
                  title="Session encore valide"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  active
                </span>
              )}
              {isExpired && !session.revokedAt && (
                <span className="ml-2 text-xs text-muted-foreground italic">
                  expirée
                </span>
              )}
              {session.revokedAt && (
                <span className="ml-2 text-xs text-rose-700 dark:text-rose-400 italic">
                  révoquée
                </span>
              )}
            </div>

            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {session.ipAddress && <span>IP {session.ipAddress}</span>}
              <span title={formatDateTime(session.createdAt)}>
                Ouverte {formatRelative(session.createdAt)}
              </span>
              {session.revokedAt && (
                <span title={formatDateTime(session.revokedAt)}>
                  Révoquée {formatRelative(session.revokedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}