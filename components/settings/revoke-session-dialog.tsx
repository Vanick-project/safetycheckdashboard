'use client';

// ─── components/settings/revoke-session-dialog.tsx ───────────────────────────
// Modale de confirmation avant de révoquer une session.
//
// Deux variants selon le contexte :
//  - variant='self'   : révocation de la session courante → warning fort,
//                        rappel qu'on va être déconnecté
//  - variant='other'  : révocation d'une autre session → simple confirmation
//  - variant='all'    : révocation de toutes les autres sessions → info sur N
//
// On n'utilise pas le Dialog Base UI Nova ici volontairement — l'implémentation
// custom (div fixed + overlay) donne le contrôle total sur le comportement
// bloquant/dismissible et évite les quirks Base UI. Cohérent avec la modale
// fallback de password-change-card.

import { Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseUserAgent } from '@/lib/user-agent-parser';
import type { MySession } from '@/lib/settings-types';

type Variant =
  | { kind: 'self'; session: MySession }
  | { kind: 'other'; session: MySession }
  | { kind: 'all'; otherSessionsCount: number };

interface RevokeSessionDialogProps {
  variant: Variant;
  /** Callback bouton principal (révoquer). */
  onConfirm: () => void;
  /** Callback bouton secondaire (annuler) ou click sur l'overlay. */
  onCancel: () => void;
  /** True pendant que la mutation est en vol → disable les boutons. */
  isPending: boolean;
}

export function RevokeSessionDialog({
  variant,
  onConfirm,
  onCancel,
  isPending,
}: RevokeSessionDialogProps) {
  const content = renderContent(variant);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="revoke-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        // Click sur l'overlay = cancel, sauf si mutation en vol
        if (e.target === e.currentTarget && !isPending) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div
            className={`
              flex h-10 w-10 shrink-0 items-center justify-center rounded-full
              ${
                variant.kind === 'self'
                  ? 'bg-amber-100 dark:bg-amber-950/50'
                  : 'bg-muted'
              }
            `}
          >
            {variant.kind === 'self' ? (
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            ) : (
              <LogOut className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 id="revoke-title" className="text-lg font-semibold">
              {content.title}
            </h2>
            <p className="text-sm text-muted-foreground">{content.body}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button
            variant={variant.kind === 'self' ? 'default' : 'default'}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {content.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Contenu par variant ─────────────────────────────────────────────────────

interface DialogContent {
  title: string;
  body: string;
  confirmLabel: string;
}

function renderContent(variant: Variant): DialogContent {
  if (variant.kind === 'self') {
    return {
      title: 'Vous allez être déconnecté',
      body: 'Cette session est celle de votre appareil actuel. Après révocation, vous devrez vous reconnecter avec votre mot de passe et votre code 2FA.',
      confirmLabel: 'Se déconnecter',
    };
  }

  if (variant.kind === 'all') {
    const n = variant.otherSessionsCount;
    return {
      title:
        n === 1
          ? "Déconnecter l'autre session ?"
          : `Déconnecter les ${n} autres sessions ?`,
      body:
        n === 1
          ? 'Un autre appareil sera immédiatement déconnecté. Votre session actuelle reste préservée.'
          : `${n} autres appareils seront immédiatement déconnectés. Votre session actuelle reste préservée.`,
      confirmLabel:
        n === 1 ? "Déconnecter l'autre" : `Déconnecter les ${n} autres`,
    };
  }

  // variant.kind === 'other'
  const ua = parseUserAgent(variant.session.userAgent);
  return {
    title: 'Révoquer cette session ?',
    body: `L'appareil "${ua.summary}" sera immédiatement déconnecté et devra se reconnecter pour accéder au dashboard.`,
    confirmLabel: 'Révoquer',
  };
}