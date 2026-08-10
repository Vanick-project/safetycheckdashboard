// ─── components/auth/two-factor-verify.tsx ────────────────────────────────────
// Vérification 2FA pour admins déjà enrôlés. Input du code TOTP → session.

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/types';
import {
  twoFactorCodeSchema,
  type TwoFactorCodeInput,
} from '@/lib/validation';

interface TwoFactorVerifyProps {
  tempToken: string;
  onSuccess(): void;
  onCancel(): void;
}

function verifyErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_code':
      return 'Code incorrect. Vérifie ton authenticator.';
    case 'session_expired':
      return 'Session expirée. Reconnecte-toi.';
    case '2fa_setup_required':
      return 'Configuration 2FA requise. Reconnecte-toi.';
    case 'too_many_attempts':
      return 'Trop de tentatives. Réessaie dans 15 minutes.';
    default:
      return 'Erreur inattendue. Réessaie.';
  }
}

export function TwoFactorVerify({
  tempToken,
  onSuccess,
  onCancel,
}: TwoFactorVerifyProps) {
  const { verify2fa } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorCodeInput>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  const onSubmit = async (values: TwoFactorCodeInput) => {
    setIsSubmitting(true);
    try {
      await verify2fa(tempToken, values.code);
      onSuccess();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown';
      toast.error(verifyErrorMessage(code));
      if (code === 'session_expired' || code === '2fa_setup_required') {
        onCancel();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Vérification à deux facteurs</h2>
        <p className="text-sm text-muted-foreground">
          Entre le code à 6 chiffres généré par ton application d&apos;authentification.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            autoFocus
            disabled={isSubmitting}
            aria-invalid={!!errors.code}
            className="tracking-widest text-center text-lg font-mono"
            {...register('code')}
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code.message}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Retour
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vérifier
          </Button>
        </div>
      </form>
    </div>
  );
}