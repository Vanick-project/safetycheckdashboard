'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useCurrentAdmin } from '@/hooks/use-current-admin';
import { ROLE_LABELS } from '@/lib/rbac';
import type { Capability } from '@/lib/rbac';
import type { ReactNode } from 'react';

interface RequireCapabilityProps {
  capability: Capability;
  children: ReactNode;
  /** Optionnel : fallback custom au lieu du bloc "Accès refusé" par défaut. */
  fallback?: ReactNode;
  /** Optionnel : ne rien afficher au lieu du bloc "Accès refusé" (utile
   *  pour cacher des sections inline sans layout de refus). */
  silent?: boolean;
}

/**
 * Wrapper de protection par capability.
 *
 * Comportement :
 *   - Pendant le boot auth → skeleton discret (évite le flash du fallback
 *     puis du contenu réel).
 *   - Admin absent ou capability manquante → fallback (ou rien si silent).
 *   - Sinon → children.
 *
 * Usage :
 *   <RequireCapability capability="admins.view">
 *     <AdminsListPage />
 *   </RequireCapability>
 *
 * Note : c'est une protection UI, pas de sécurité. Le backend refuse tout
 * accès non autorisé via ses middlewares — cette barrière n'est là que pour
 * éviter les 403 disgracieux et guider l'utilisateur.
 */
export function RequireCapability({
  capability,
  children,
  fallback,
  silent = false,
}: RequireCapabilityProps) {
  const { isReady, hasCapability, role } = useCurrentAdmin();

  if (!isReady) {
    // Placeholder minimaliste pendant le boot — le AuthGuard parent gère
    // déjà le cas admin === null (redirect vers /login).
    return (
      <div className="h-32 animate-pulse rounded-lg bg-muted" aria-hidden />
    );
  }

  if (!hasCapability(capability)) {
    if (silent) return null;
    if (fallback !== undefined) return <>{fallback}</>;
    return <UnauthorizedFallback capability={capability} role={role} />;
  }

  return <>{children}</>;
}

// ─── Fallback par défaut ─────────────────────────────────────────────────────

function UnauthorizedFallback({
  capability,
  role,
}: {
  capability: Capability;
  role: string | null;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="rounded-full bg-rose-100 p-4 dark:bg-rose-950/50">
        <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Accès non autorisé
        </h2>
        <p className="text-sm text-muted-foreground">
          Votre rôle{' '}
          {role && (
            <span className="font-medium text-foreground">
              {ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role}
            </span>
          )}{' '}
          ne permet pas d&apos;accéder à cette section.
        </p>
        <p className="text-xs text-muted-foreground">
          Capability requise :{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
            {capability}
          </code>
        </p>
      </div>
      <Link
        href="/dashboard"
        className="
          inline-flex items-center gap-2
          rounded-md bg-primary px-4 py-2
          text-sm font-medium text-primary-foreground
          hover:bg-primary/90
        "
      >
        Retour au tableau de bord
      </Link>
    </div>
  );
}