'use client';

import { Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import { formatDateTime, formatRelative } from '@/lib/format';
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

// ─── User agent parsing (léger, sans deps) ───────────────────────────────────
//
// Suffisant pour distinguer mobile vs desktop vs tablet et donner un summary
// lisible. On ne veut pas embarquer ua-parser-js pour ça.

function parseUserAgent(ua: string | null): {
  Icon: typeof Monitor;
  deviceType: string;
  summary: string;
} {
  if (!ua) {
    return {
      Icon: Globe,
      deviceType: 'Inconnu',
      summary: 'Client inconnu',
    };
  }

  const isMobile = /iPhone|Android(?!.*Tablet)|Windows Phone/i.test(ua);
  const isTablet = /iPad|Android.*Tablet|Tablet PC/i.test(ua);
  const Icon = isTablet ? Tablet : isMobile ? Smartphone : Monitor;
  const deviceType = isTablet ? 'Tablette' : isMobile ? 'Mobile' : 'Desktop';

  // Détection navigateur + OS (best-effort, pas parfait)
  let browser = 'Navigateur';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';

  let os = '';
  if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';

  const summary = os ? `${browser} sur ${os}` : browser;

  return { Icon, deviceType, summary };
}