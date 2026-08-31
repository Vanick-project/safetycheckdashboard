'use client';

// ─── components/settings/password-change-card.tsx ────────────────────────────
// Carte "Mot de passe" de la page /settings (checkpoint 5c.1).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Check, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PasswordInput } from './password-input';
import {
  PasswordStrengthChecklist,
  isPasswordValid,
} from '@/components/auth/password-strength-checklist';
import { useChangePassword } from '@/hooks/use-change-password';
import { useAuth } from '@/lib/auth-context';
import { passwordChangeSchema, type PasswordChangeInput } from '@/lib/validation';
import { ApiError } from '@/lib/types';

// ─── Types utilitaires pour parser les Zod issues renvoyés par le backend ────

interface ZodIssueLite {
  path?: (string | number)[];
  message?: string;
}

function isZodIssueArray(v: unknown): v is ZodIssueLite[] {
  return Array.isArray(v) && v.every((i) => typeof i === 'object' && i !== null);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PasswordChangeCard() {
  const router = useRouter();
  const { logout } = useAuth();
  const mutation = useChangePassword();
  const [showFallbackModal, setShowFallbackModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const form = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    // onChange = validation live pour disabled du bouton submit.
    mode: 'onChange',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const currentPassword = form.watch('currentPassword');
  const newPassword = form.watch('newPassword');
  const confirmNewPassword = form.watch('confirmNewPassword');

  // ─── Derived state pour l'UI ────────────────────────────────────────
  const passwordsMatch =
    confirmNewPassword.length > 0 && newPassword === confirmNewPassword;
  const showMismatchWarning =
    confirmNewPassword.length > 0 && newPassword !== confirmNewPassword;
  const isNewSameAsCurrent =
    newPassword.length > 0 && newPassword === currentPassword;

  const submitDisabled =
    mutation.isPending ||
    currentPassword.length === 0 ||
    !isPasswordValid(newPassword) ||
    !passwordsMatch ||
    isNewSameAsCurrent;

  // ─── Submit ─────────────────────────────────────────────────────────

  const onSubmit = async (values: PasswordChangeInput) => {
    try {
      const res = await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (res.keptCurrentSession) {
        const n = res.revokedSessionsCount;
        if (n > 0) {
          toast.success(
            `Mot de passe modifié. ${n} autre${n > 1 ? 's' : ''} session${n > 1 ? 's ont été déconnectées' : ' a été déconnectée'} par sécurité.`,
            { description: 'Un email de confirmation vous a été envoyé.' },
          );
        } else {
          toast.success('Mot de passe modifié.', {
            description: 'Un email de confirmation vous a été envoyé.',
          });
        }
        form.reset();
      } else {
        // Fallback edge case : session courante aussi révoquée.
        // On affiche une modale bloquante avant de logout, pour que l'user
        // ait le temps de lire l'info du succès plutôt que de subir un
        // 401 mystérieux au prochain click.
        setShowFallbackModal(true);
      }
    } catch (err) {
      handleError(err);
    }
  };

  const handleError = (err: unknown) => {
    if (!(err instanceof ApiError)) {
      toast.error('Erreur inattendue. Réessayez.');
      return;
    }

    // 401 avec code applicatif spécifique = mauvais mot de passe actuel.
    // Message backend : "invalid_current_password". On cible le champ.
    if (err.status === 401 && err.code === 'invalid_current_password') {
      form.setError('currentPassword', {
        message: 'Mot de passe actuel incorrect.',
      });
      return;
    }

    // 400 avec details Zod : mapper chaque issue sur son champ.
    if (err.status === 400 && err.code === 'invalid_body' && isZodIssueArray(err.details)) {
      let mappedAny = false;
      for (const issue of err.details) {
        const path = issue.path?.[0];
        if (
          typeof path === 'string' &&
          (path === 'currentPassword' || path === 'newPassword')
        ) {
          form.setError(path as 'currentPassword' | 'newPassword', {
            message: issue.message ?? 'Champ invalide',
          });
          mappedAny = true;
        }
      }
      if (!mappedAny) {
        toast.error('Requête invalide. Vérifiez les champs.');
      }
      return;
    }

    // 429 : rate limit. Backend fournit un message français prêt.
    if (err.status === 429) {
      toast.error(
        err.message ?? 'Trop de tentatives. Réessayez dans 15 minutes.',
      );
      return;
    }

    // Fallback générique
    toast.error(err.message ?? 'Erreur inattendue. Réessayez.');
  };

  const handleFallbackAcknowledge = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      // Même si logout throw (edge case), on force le redirect.
      router.replace('/login');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>
            Changez votre mot de passe SafetyCheck admin. Un email de
            confirmation vous sera envoyé, et vos autres sessions actives
            seront déconnectées par sécurité.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 max-w-md"
          >
            <PasswordInput
              id="currentPassword"
              label="Mot de passe actuel"
              autoComplete="current-password"
              disabled={mutation.isPending}
              error={form.formState.errors.currentPassword?.message}
              {...form.register('currentPassword')}
            />

            <PasswordInput
              id="newPassword"
              label="Nouveau mot de passe"
              autoComplete="new-password"
              disabled={mutation.isPending}
              error={
                // On ne montre l'erreur "same as current" que si l'user a
                // vraiment tapé quelque chose — sinon le champ vide affiche
                // une erreur au premier keystroke, désagréable.
                form.formState.errors.newPassword?.message ??
                (isNewSameAsCurrent
                  ? 'Le nouveau mot de passe doit être différent de l\u2019actuel'
                  : undefined)
              }
              belowSlot={
                newPassword.length > 0 && (
                  <div className="mt-2 rounded-md border border-border bg-muted/30 p-3">
                    <PasswordStrengthChecklist password={newPassword} />
                  </div>
                )
              }
              {...form.register('newPassword')}
            />

            <PasswordInput
              id="confirmNewPassword"
              label="Confirmer le nouveau mot de passe"
              autoComplete="new-password"
              disabled={mutation.isPending}
              error={
                showMismatchWarning
                  ? 'Les mots de passe ne correspondent pas'
                  : form.formState.errors.confirmNewPassword?.message
              }
              belowSlot={
                passwordsMatch && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-500">
                    <Check className="h-3.5 w-3.5" />
                    Les mots de passe correspondent
                  </p>
                )
              }
              {...form.register('confirmNewPassword')}
            />

            <div className="pt-2">
              <Button type="submit" disabled={submitDisabled}>
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Changer le mot de passe
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ─── Modale bloquante fallback (Q6 = B) ────────────────────── */}
      {showFallbackModal && (
        <FallbackModal
          onAcknowledge={handleFallbackAcknowledge}
          isLoggingOut={isLoggingOut}
        />
      )}
    </>
  );
}

// ─── Modale fallback (session courante révoquée) ─────────────────────────────

interface FallbackModalProps {
  onAcknowledge: () => void;
  isLoggingOut: boolean;
}

/**
 * Modale bloquante sans close par escape ou click-outside. L'user DOIT
 * cliquer sur le bouton pour être redirigé — c'est intentionnel, on ne
 * veut pas qu'il rate l'info "votre mdp a bien été changé" avant d'être
 * dégagé sur /login.
 *
 * On évite le composant Dialog Base UI ici pour rester en contrôle total du
 * comportement bloquant (les Dialog Nova ont un `dismissible` par défaut).
 */
function FallbackModal({ onAcknowledge, isLoggingOut }: FallbackModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fallback-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-500" />
          </div>
          <div className="space-y-1">
            <h2 id="fallback-title" className="text-lg font-semibold">
              Mot de passe modifié
            </h2>
            <p className="text-sm text-muted-foreground">
              Vous allez être déconnecté. Reconnectez-vous avec votre nouveau
              mot de passe.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onAcknowledge} disabled={isLoggingOut}>
            {isLoggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Se reconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}