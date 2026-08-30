'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, Calendar, Mail, UserCircle } from 'lucide-react';
import { AdminRoleBadge } from './admin-role-badge';
import { AdminStatusBadge } from './admin-status-badge';
import {
  computeAdminStatus,
  extractDeletedTimestamp,
  extractOriginalEmail,
  formatAdminDisplayName,
} from '@/lib/admin-helpers';
import { formatDateTime } from '@/lib/format';
import type { AdminDetail } from '@/lib/admin-types';

interface AdminDetailHeaderProps {
  admin: AdminDetail;
  isSelf: boolean;
}

export function AdminDetailHeader({ admin, isSelf }: AdminDetailHeaderProps) {
  const status = computeAdminStatus(admin);
  const displayName = formatAdminDisplayName(admin);
  const displayEmail = extractOriginalEmail(admin.email);
  const deletedTimestamp = extractDeletedTimestamp(admin.email);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Link
        href="/settings/admins"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la liste
      </Link>

      {/* Header card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* ─── Identité ────────────────────────────────────────────── */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {displayName}
                {isSelf && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    (vous)
                  </span>
                )}
              </h1>
              <AdminRoleBadge role={admin.role} />
              <AdminStatusBadge status={status} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {displayEmail}
              </span>

              {admin.organization && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {admin.organization.name}
                </span>
              )}

              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Créé le {formatDateTime(admin.createdAt)}
              </span>
            </div>

            {/* ─── Bannière DELETED ────────────────────────────────── */}
            {status === 'DELETED' && deletedTimestamp && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-100">
                <strong>Compte supprimé</strong> le{' '}
                {formatDateTime(new Date(deletedTimestamp).toISOString())}.
                Toutes les sessions ont été révoquées. Cet admin ne peut plus
                se connecter. Restauration impossible via le dashboard —
                nécessite une intervention manuelle en base de données.
              </div>
            )}

            {/* ─── Créé par ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserCircle className="h-4 w-4" />
              {admin.createdBy ? (
                <span>
                  Créé par{' '}
                  <span className="font-medium text-foreground">
                    {admin.createdBy.name ?? admin.createdBy.email}
                  </span>
                  {' · '}
                  <span className="italic">{admin.createdBy.role}</span>
                </span>
              ) : (
                <span>
                  Créé par le système (ex: acceptation d&apos;invitation ou
                  seed initial)
                </span>
              )}
            </div>
          </div>

          {/* ─── Stats de droite ─────────────────────────────────────── */}
          <div className="flex flex-wrap gap-4 text-right text-sm">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Sessions actives
              </div>
              <div className="text-lg font-semibold">
                {admin._count.sessions}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Admins créés
              </div>
              <div className="text-lg font-semibold">
                {admin._count.createdAdmins}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">2FA</div>
              <div
                className={`text-lg font-semibold ${
                  admin.twoFactorEnabled
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {admin.twoFactorEnabled ? 'Activé' : 'Non activé'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}