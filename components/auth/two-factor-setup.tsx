// ─── components/auth/two-factor-setup.tsx ─────────────────────────────────────
// Premier enrôlement 2FA : affiche QR code + input du 1er code TOTP.
// Le composant récupère le QR au montage (POST /2fa/setup), puis confirme
// l'enrôlement au submit (POST /2fa/enable).

'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/types';
import type { TwoFactorSetupResponse } from '@/lib/types';
import {
  twoFactorCodeSchema,
  type TwoFactorCodeInput,
} from '@/lib/validation';

interface TwoFactorSetupProps {
  tempToken: string;
  /** Appelé après enable réussi. Le context a déjà setAdmin — la page peut
   *  simplement router vers /dashboard. */
  onSuccess(): void;
  /** Retour en arrière (annuler, retape le mot de passe). */
  onCancel(): void;
}

function setupErrorMessage(code: string): string {
  switch (code) {
    case 'invalid_code':
      return 'Code incorrect. Vérifie ton authenticator.';
    case 'session_expired':
      return 'Session expirée. Reconnecte-toi.';
    case '2fa_already_enabled':
      return '2FA déjà activé. Passe par la récupération de compte.';
    case 'too_many_attempts':
      return 'Trop de tentatives. Réessaie dans 15 minutes.';
    default:
      return 'Erreur inattendue. Réessaie.';
  }
}

export function TwoFactorSetup({
  tempToken,
  onSuccess,
  onCancel,
}: TwoFactorSetupProps) {
  const { setup2fa, enable2fa } = useAuth();
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(
    null,
  );
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TwoFactorCodeInput>({
    resolver: zodResolver(twoFactorCodeSchema),
    defaultValues: { code: '' },
  });

  // Récupérer le QR au montage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await setup2fa(tempToken);
        if (!cancelled) setSetupData(data);
      } catch (err) {
        if (cancelled) return;
        const code = err instanceof ApiError ? err.code : 'unknown';
        toast.error(setupErrorMessage(code));
        if (code === 'session_expired' || code === '2fa_already_enabled') {
          onCancel();
        }
      } finally {
        if (!cancelled) setIsLoadingSetup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tempToken, setup2fa, onCancel]);

  const onSubmit = async (values: TwoFactorCodeInput) => {
    setIsSubmitting(true);
    try {
      await enable2fa(tempToken, values.code);
      onSuccess();
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'unknown';
      toast.error(setupErrorMessage(code));
      if (code === 'session_expired') onCancel();
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyManualKey = async () => {
    if (!setupData) return;
    try {
      await navigator.clipboard.writeText(setupData.manualEntryKey);
      toast.success('Clé copiée');
    } catch {
      toast.error('Impossible de copier');
    }
  };

  if (isLoadingSetup) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!setupData) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Erreur de configuration</AlertTitle>
        <AlertDescription>
          Impossible de récupérer le QR code. Réessaie de te connecter.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Configurer l&apos;authentification à deux facteurs</h2>
        <p className="text-sm text-muted-foreground">
          Scanne ce QR code avec Google Authenticator, Authy ou 1Password,
          puis entre le code à 6 chiffres pour confirmer.
        </p>
      </div>

      <div className="flex justify-center rounded-md border border-border bg-white p-4">
        <Image
          src={setupData.qrCodeDataUrl}
          alt="QR code d'enrôlement 2FA"
          width={200}
          height={200}
          unoptimized
        />
      </div>

      <div className="space-y-2">
        <Label>Clé de secours (saisie manuelle)</Label>
        <div className="flex gap-2">
          <Input
            readOnly
            value={setupData.manualEntryKey}
            className="font-mono text-xs"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyManualKey}
            aria-label="Copier la clé"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="code">Code à 6 chiffres</Label>
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
            Annuler
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer
          </Button>
        </div>
      </form>
    </div>
  );
}